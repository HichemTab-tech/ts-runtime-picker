import {CallExpression, Node, Type} from "ts-morph";
import {Analyzer, ConcreteUsage, PropArray} from "./analyzer";
import {generateRandomId} from "../lib/utils";
import {BasedOnContext} from "./BasedOnContext";
import {getResolverForNode} from "./resolver-factory";
import {TargetBehavior} from "./behavior-map";
import {ClassResolver} from "./resolvers/class-resolver";

export class Rewriter extends BasedOnContext{
    // Track what we've already added to avoid duplicates across multiple rewrite executions
    private paramAddedByContainer: Map<Node, Set<string>> = new Map(); // container -> set of typeUnique
    private paramNameByContainerAndType: Map<Node, Map<string, string>> = new Map(); // container -> (typeUnique -> paramName)
    private argAddedByCall: Map<CallExpression, Set<string>> = new Map(); // call -> set of typeUnique

    /**
     * Executes the rewrite process for a given plan and behavior.
     *
     * @param {ConcreteUsage} plan The plan object containing call site, type, chain details,
     * and other relevant metadata for the rewrite process.
     * @param {TargetBehavior} behavior The target behavior type indicating how the rewrite is to be processed.
     * Currently, supports 'PICKER'.
     * @param {CallExpression} [innermostPickerCall] Optional.
     * The innermost call expression that may need to be replaced during the rewrite process.
     * @return {void} Returns nothing.
     * The method operates on and modifies existing structures based on the plan and behavior provided.
     */
    executeRewrite(plan: ConcreteUsage, behavior: TargetBehavior, innermostPickerCall?: CallExpression): void {
        // Only handle PICKER for now
        if (behavior !== 'PICKER') return;

        // Unique base name per chain
        const baseArgName = "_pickerKeys_" + generateRandomId();

        // 1) Rewrite the final call site with properties
        const callSite = plan.callSite;
        const typeUniqueForCallSite = Rewriter.getUniqueTypeWithIndex(plan.type, plan.typeParamIndex);
        if (!this.argAddedByCall.get(callSite)?.has(typeUniqueForCallSite)) {

            // Check if the type is acceptable for the behavior
            Analyzer.checkIfTypeIsAcceptable(plan.type);

            const props = this.getPropertiesOfType(plan.type);
            // Use the resolver of the called container (first segment in the chain)
            const firstContainer = plan.chain[0]?.container as unknown as Node | undefined;
            const resolverForFinal = firstContainer ? getResolverForNode(firstContainer) : undefined;
            if (resolverForFinal) {
                resolverForFinal.addArgument(callSite, props);
                this.trackArg(callSite, typeUniqueForCallSite);
            } else {
                this.addArgumentOrTrack(callSite, typeUniqueForCallSite, props);
            }
        }

        // 2) Walk the chain containers
        for (let i = 0; i < plan.chain.length; i++) {
            const segment = plan.chain[i];
            const container = segment.container as unknown as Node;

            const resolver = getResolverForNode(container);
            if (!resolver) continue;

            // Ensure parameter exists for this container/typeUnique
            const alreadyParams = this.paramAddedByContainer.get(container) || new Set<string>();
            let paramName: string | undefined = this.paramNameByContainerAndType.get(container)?.get(segment.typeUnique);
            if (!alreadyParams.has(segment.typeUnique) || !paramName) {
                paramName = resolver.addParameter(container, baseArgName);
                alreadyParams.add(segment.typeUnique);
                this.paramAddedByContainer.set(container, alreadyParams);
                if (!this.paramNameByContainerAndType.has(container)) this.paramNameByContainerAndType.set(container, new Map());
                this.paramNameByContainerAndType.get(container)!.set(segment.typeUnique, paramName);
            }

            const nextChain = plan.chain[i + 1];
            if (nextChain) {
                const nextCall = nextChain.call;
                // Track by nextChain.typeUnique for the call argument addition
                const typeKey = nextChain.typeUnique;
                if (!this.argAddedByCall.get(nextCall)?.has(typeKey)) {
                    resolver.addArgument(nextCall, paramName!);
                    this.trackArg(nextCall, typeKey);
                }
            }
        }

        // 3) Replace the innermost picker call
        if (innermostPickerCall && !innermostPickerCall.wasForgotten()) {
            // if the last plan.chain is a kind of class, let the replacePickerCallWithImplementation use "this"
            // before the variable
            const lastContainer = plan.chain[plan.chain.length - 1].container;
            this.replacePickerCallWithImplementation(innermostPickerCall, baseArgName + "_0", ClassResolver.isClass(lastContainer));
        }
    }

    private addArgumentOrTrack(call: CallExpression, typeKey: string, value: PropArray | string) {
        const set = this.argAddedByCall.get(call) || new Set<string>();
        if (!set.has(typeKey)) {
            // We don't resolve by expression here; directly manipulate the call
            const propsString = Array.isArray(value) ? JSON.stringify(value) : value;
            call.addArgument(propsString);
            set.add(typeKey);
            this.argAddedByCall.set(call, set);
        }
    }

    private trackArg(call: CallExpression, typeKey: string) {
        const set = this.argAddedByCall.get(call) || new Set<string>();
        set.add(typeKey);
        this.argAddedByCall.set(call, set);
    }

    private getPropertiesOfType(type: Type): PropArray {
        // Simplified access: replicate Analyzer.getPropertiesOfType logic would be duplication.
        // To avoid large refactor,
        // we rely on replacePickerCallWithImplementation for non-generic branches where props may be provided externally.
        // Here, for generic path final call-site we still need props.
        // We'll compute minimally:
        return type.getProperties().map(prop => {
            const valueDecl = prop.getValueDeclaration();
            if (valueDecl) {
                const propertyType = valueDecl.getType();
                const isInterface = propertyType.isInterface();
                const isClass = propertyType.isClass();
                const isObject = propertyType.isObject();
                if (isInterface || isClass || isObject) {
                    return {
                        name: prop.getName(),
                        props: this.getPropertiesOfType(propertyType)
                    };
                }
            }
            return prop.getName();
        });
    }

    static getUniqueTypeWithIndex(type: Type, index: number): string {
        return type.getText() + "_" + index;
    }

    /**
     * Replaces the internal `createPicker<T>()` call with the runtime implementation.
     * @param pickerCall The `createPicker<T>()` node to replace.
     * @param argNameOrProps - argument name or props to use for the implementation.
     * @param useThisStatement - if true, will use `this` before the argument name.
     * @returns void
     */
    replacePickerCallWithImplementation(pickerCall: CallExpression, argNameOrProps: string|PropArray, useThisStatement: boolean = false): void {
        if (!this.options.recursive && typeof argNameOrProps !== 'string') {
            argNameOrProps = argNameOrProps.map(a => {
                if (typeof a === "string") return a;

                return a.name;
            });
        }
        pickerCall.replaceWithText(`((_obj: any) => {\n    const _keys: any[] = ${typeof argNameOrProps === 'string' ? (`${useThisStatement ? "this." : ""}${argNameOrProps}`) : `JSON.parse('${JSON.stringify(argNameOrProps)}')`};\n    const reduceThisOne = (_keys: any, _obj: any) => {\n        return _keys.reduce((_acc: {[k: string]: any}, _key: any) => {\n            if (typeof _obj === 'string') return _obj;\n        \n            if (typeof _key !== 'string') {\n                const { name, props } = _key;\n                if (name in _obj) {\n                    _acc[name] = reduceThisOne(props, _obj[name]);\n                }\n            }\n            else {\n                if (_key in _obj) _acc[_key] = _obj[_key];\n            }\n            return _acc;\n        }, {});\n    }\n    \n    return reduceThisOne(_keys, _obj);\n})`);
    }
}