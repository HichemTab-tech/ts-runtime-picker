import {CallExpression, SyntaxKind} from "ts-morph";
import {fileToTypes, project, typeToFile} from "../plugin/state";
import * as analyzer from "./analyzer";
import {GenericContainer, getUniqueTypeWithIndex} from "./analyzer";
import * as rewriter from "./rewriter";
import {generateRandomId} from "../lib/utils";

export function transformCode(code: string, filePath: string): string {
    let sourceFile = project.getSourceFile(filePath);
    if (!sourceFile) {
        // Load the file if it exists, otherwise create a new one
        sourceFile = project.createSourceFile(filePath, code, { overwrite: true });
    } else {
        // If the file already exists, we can replace its content
        sourceFile.replaceWithText(code);
    }

    const usedTypes = new Set<string>();
    sourceFile.getDescendantsOfKind(SyntaxKind.TypeReference).forEach(ref => {
        const typeName = ref.getTypeName().getText();
        usedTypes.add(typeName);
        const decl = ref.getType().getSymbol()?.getDeclarations()?.[0];
        const source = decl?.getSourceFile()?.getFilePath();
        if (source) {
            typeToFile.set(typeName, source);
        }
    });
    fileToTypes.set(filePath, usedTypes);

    // Figure out what the “createPicker” import is called (alias or direct)
    let createPickerAlias: string | null = null;
    for (const importDecl of sourceFile.getImportDeclarations()) {
        if (importDecl.getModuleSpecifierValue() === "ts-runtime-picker") {
            for (const namedImport of importDecl.getNamedImports()) {
                const name = namedImport.getName();
                const alias = namedImport.getAliasNode()?.getText() || name;
                if (name === "createPicker" || name === "createFullPicker") {
                    createPickerAlias = alias;
                }
            }
        }
    }
    if (!createPickerAlias) {
        return sourceFile.getFullText();
    }

    const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).reverse();

    // Walk all call expressions
    for (const call of calls) {
        if (call.wasForgotten()) continue; // Skip nodes removed in a previous iteration.
        const exprText = call.getExpression().getText();
        if (exprText === createPickerAlias && call.getTypeArguments().length > 0) {
            const typeArg = call.getTypeArguments()[0];
            const pickedType = typeArg.getType();

            if (!pickedType) {
                continue;
            }

            if (pickedType.isTypeParameter()) {
                const container = analyzer.findContainingFunction(call);
                if (!container) continue;

                const concreteUsages = analyzer.traceToConcreteUsages(container, pickedType);
                console.log("concreteUsages", concreteUsages.map(c => ({
                    ...c,
                    type: analyzer.getPropertiesOfType(c.type),
                    callSite: c.callSite.getText(),
                    chain: c.chain.map(f => ({...f, container: f.container.getText()})),
                })));
                if (concreteUsages.length === 0) continue;

                // Use a Set to track which functions we have already added the parameter to.
                const argumentsForGenericTypes: {
                    typeUnique: string;
                    containerId: string;
                    argumentName?: string;
                }[] = [];
                const argumentsCallForGenericTypes: {
                    typeUnique: string;
                    callId: string;
                }[] = [];

                let baseArgName = "_pickerKeys_" + generateRandomId();

                // Pre-calculate stable IDs for all containers before any modifications are made.
                const allContainers = new Set<GenericContainer>();
                const allCalls = new Set<CallExpression>();
                for (const usage of concreteUsages) {
                    allCalls.add(usage.callSite);
                    for (const segment of usage.chain) {
                        allContainers.add(segment.container);
                        allCalls.add(segment.call);
                    }
                }
                const containerIdMap = new Map<GenericContainer, string>();
                const callIdMap = new Map<CallExpression, string>();
                for (const container of allContainers) {
                    containerIdMap.set(container, analyzer.getUniqueIdForGenericNode(container));
                }
                for (const call of allCalls) {
                    callIdMap.set(call, analyzer.getUniqueIdForGenericNode(call));
                }


                for (const usage of concreteUsages) {
                    // Generate a unique base name for this entire chain operation.
                    baseArgName = "_pickerKeys_" + generateRandomId();
                    const callSiteId = callIdMap.get(usage.callSite)!;
                    // Rewrite the final call site. This is always unique per usage, so it's safe.
                    let existingArg = argumentsCallForGenericTypes.find(a => {
                        return getUniqueTypeWithIndex(usage.type, usage.typeParamIndex) === a.typeUnique && a.callId === callSiteId;
                    });
                    if (!existingArg) {
                        rewriter.addArgumentToCall(usage.callSite, analyzer.getPropertiesOfType(usage.type));
                        argumentsCallForGenericTypes.push({
                            typeUnique: getUniqueTypeWithIndex(usage.type, usage.typeParamIndex),
                            callId: callSiteId,
                        });
                    }

                    // Loop through the functions in the chain.
                    for (let i = 0; i < usage.chain.length; i++) {
                        const funcInChain = usage.chain[i].container;
                        const containerId = containerIdMap.get(funcInChain)!;


                        // Only add the parameter if we haven't done it before.
                        let existingArg = argumentsForGenericTypes.find(a => {
                            return usage.chain[i].typeUnique === a.typeUnique && a.containerId === containerId;
                        });
                        let uniqueArgName;
                        if (!existingArg) {
                            uniqueArgName = rewriter.addParameterToFunctionSignature(funcInChain, baseArgName);

                            argumentsForGenericTypes.push({
                                typeUnique: usage.chain[i].typeUnique,
                                containerId,
                                argumentName: uniqueArgName,
                            });
                        }
                        else{
                            uniqueArgName = existingArg.argumentName;
                            if (!uniqueArgName) {
                                throw new Error("Couldn't find unique name for parameter");
                            }
                        }

                        const nextChain = usage.chain[i + 1];

                        // If it exists, find the call that focuses on it.
                        if (nextChain) {

                            const callId = callIdMap.get(nextChain.call)!;
                            // Only add the parameter if we haven't done it before.
                            let existingArg = argumentsCallForGenericTypes.find(a => {
                                return nextChain.typeUnique === a.typeUnique && a.callId === callId;
                            });
                            if (!existingArg) {
                                rewriter.addArgumentToCall(nextChain.call, uniqueArgName);
                                argumentsCallForGenericTypes.push({
                                    typeUnique: nextChain.typeUnique,
                                    callId: callId,
                                });
                            }
                        }
                    }

                    // Replace the original, innermost `createPicker<T>()` call.
                    // This is the very first picker we found, so it only needs to be done once.
                    if (!call.wasForgotten()) rewriter.replacePickerCallWithImplementation(call, baseArgName + "_0");
                }
            } else {
                const props = pickedType.getProperties().map(p => `"${p.getName()}"`);
                call.replaceWithText(`(_obj: any) => {
                  const _keys: string[] = [${props.join(",")}];
                  return _keys.reduce((_acc: {[k: string]: any}, _key: string) => {
                    if (_key in _obj) _acc[_key] = _obj[_key];
                    return _acc;
                  }, {});
                }`);
            }
        }
    }

    return sourceFile.getFullText();
}