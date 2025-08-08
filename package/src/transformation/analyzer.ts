import {
    ArrowFunction,
    CallExpression, ClassDeclaration, ClassExpression,
    FunctionDeclaration,
    FunctionExpression, MethodDeclaration,
    Node,
    SyntaxKind,
    Type,
} from "ts-morph";
import {BasedOnOptions} from "./BasedOnOptions";

// Define a type for the functions we are looking for.
export type GenericContainer = FunctionContainer | ClassContainer;

export type FunctionContainer = FunctionDeclaration | ArrowFunction | FunctionExpression | MethodDeclaration;
export type ClassContainer = ClassDeclaration | ClassExpression;

export type PropArray = (string|{name: string; props: PropArray})[];

/**
 * Represents a segment in the chain of function calls leading to a concrete type usage.
 * This includes the unique type identifier, the container function where it was found,
 * and the call expression that used it.
 * For example, in a chain like `createPicker<T>() -> createInnerPicker<T>() -> MyComponent<User>()`,
 * the segments would represent each function call in the chain.
 * * - `typeUnique`: A unique identifier for the type, combining the type name and its index in the function definition.
 * * - `container`: The function container where this type was found (e.g., `createInnerPicker`).
 * * - `call`: The call expression that used this type (e.g., `MyComponent<User>()`).
 * * This structure allows us to trace back the chain of function calls that led to a concrete type being used,
 * * which is essential for understanding how generics are resolved in the codebase.
 */
export type ChainPathSegment = {
    typeUnique: string,
    container: GenericContainer,
    call: CallExpression,
}

export interface ConcreteUsage {
    /**
     * The call site where the concrete type is used.
     * For example, `MyComponent<User>()`,
     */
    callSite: CallExpression;
    /**
     * The index of the type parameter in the function definition.
     * For example, if the function is defined as `createInnerPicker<T>()`.
     */
    typeParamIndex: number;
    type: Type;
    /**
     * The chain of functions leading to this concrete usage.
     */
    chain: ChainPathSegment[];
}


export class Analyzer extends BasedOnOptions{

    /**
     * Finds the function that contains a given node.
     * @param node The starting node (our `createPicker<T>()` call).
     * @returns The container function node, or undefined if not found.
     */
    findContainingFunction(node: Node): GenericContainer | undefined {
        const container = node.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration) ||
            node.getFirstAncestorByKind(SyntaxKind.ArrowFunction) ||
            node.getFirstAncestorByKind(SyntaxKind.FunctionExpression) ||
            node.getFirstAncestorByKind(SyntaxKind.MethodDeclaration);

        if (!container) {
            console.warn("No containing function found for node:", node.getText());
            const fallback = node.getFirstAncestorByKind(SyntaxKind.ClassExpression) ||
                node.getFirstAncestorByKind(SyntaxKind.ClassDeclaration);
            if (fallback) {
                console.warn("Falling back to class context:", fallback.getText());
                // If we found a class, we can return it as a container.
                // This is useful for methods inside classes.
                return fallback as GenericContainer;
            }
            return undefined;
        }

        return container;
    }

    /**
     * Recursively traces all usages of a generic function until it finds the
     * calls where a concrete type is specified.
     * @param funcNode The generic function definition to trace (e.g., createInnerPicker).
     * @param targetTypeParam The type parameter we are interested in (e.g., T in createInnerPicker<T>).
     * @param path An array of GenericContainer nodes representing the chain of functions leading to the current call.
     * @returns An array of ConcreteUsage objects.
     */
    traceToConcreteUsages(funcNode: GenericContainer, targetTypeParam: Type, path: ChainPathSegment[] = []): ConcreteUsage[] {
        const finalResults: ConcreteUsage[] = [];

        // Find the first level of usages
        const usages = this.findFunctionUsages(funcNode);
        //TODO: for type SyntaxKind.MethodDeclaration, the usages is empty, fix it.

        for (const usage of usages) {
            // Find the index of the generic parameter in the definition (e.g., <T, P>)
            const funcDefParams = funcNode.getTypeParameters();
            const paramIndex = funcDefParams.findIndex(p => p.getSymbol() === targetTypeParam.getSymbol());

            if (paramIndex === -1) continue; // This function doesn't define the generic we're looking for.
            // Get the corresponding type argument from the usage site.
            const typeArg = usage.getTypeArguments()[paramIndex];
            if (!typeArg) continue;

            const type = typeArg.getType();
            const newPath = [{
                typeUnique: this.getUniqueTypeWithIndex(targetTypeParam, paramIndex),
                container: funcNode,
                call: usage,
            }, ...path] satisfies ChainPathSegment[];

            if (type.isTypeParameter()) {
                // Recursive step: Still generic. Keep tracing.
                const nextContainer = this.findContainingFunction(usage);
                if (nextContainer) {
                    // Pass the current path down the chain
                    const deeperResults = this.traceToConcreteUsages(nextContainer, type, newPath);
                    finalResults.push(...deeperResults);
                }
            } else {
                // We found a concrete type (e.g., MyComponent<User>).
                // This is the end of the chain for this branch.
                finalResults.push({
                    callSite: usage,
                    typeParamIndex: paramIndex,
                    type: type,
                    chain: newPath,
                });
            }
        }

        return finalResults;
    }

    /**
     * Finds all places where a given function is called.
     * @param funcNode The function definition node.
     * @returns An array of the CallExpression nodes where the function is used.
     */
    findFunctionUsages(funcNode: GenericContainer): CallExpression[] {
        let references;
        if (!(funcNode instanceof ArrowFunction)) {
            references = funcNode.findReferencesAsNodes();
        }
        else{
            // check if it's assigned to a variable
            const variableDeclaration = funcNode.getFirstAncestorByKind(SyntaxKind.VariableDeclaration);
            if (variableDeclaration) {
                references = variableDeclaration.findReferencesAsNodes();
            }
            else {
                console.warn("Arrow functions with no variable declaration are not supported for usage analysis.");
                return [];
            }
        }
        const usageCalls: CallExpression[] = [];

        for (const ref of references) {
            // The reference is the function name (identifier). We need its parent, the CallExpression.
            const callExpression = ref.getParentIfKind(SyntaxKind.CallExpression);
            if (callExpression) {
                usageCalls.push(callExpression);
            }
        }
        return usageCalls;
    }

    /**
     * Retrieves all properties of a given type, traversing recursively through
     * nested types such as interfaces, classes, or objects.
     *
     * @param {Type} type - The type whose properties are to be retrieved.
     * @returns {PropArray} A list of properties associated with the type.
     * If a property is an interface, class, or object, its properties are
     * recursively retrieved and returned as a nested structure.
     */
    getPropertiesOfType = (type: Type): PropArray => {

        const getProperties = (type: Type): PropArray => {

            return type.getProperties().map(prop => {
                // Get the value declaration
                const valueDeclaration = prop.getValueDeclaration();

                if (valueDeclaration) {
                    // Get the type node and actual type
                    const propertyType = valueDeclaration.getType();

                    const isInterface = propertyType.isInterface();
                    const isClass = propertyType.isClass();
                    const isObject = propertyType.isObject();

                    // If it's an interface or class, you can get its properties recursively
                    if (isInterface || isClass || isObject) {
                        return {
                            name: prop.getName(),
                            props: getProperties(propertyType)
                        }
                    }
                }
                return prop.getName();
            });
        }

        return getProperties(type);
    }

    /**
     * Generates a unique string by combining the textual representation of a given type
     * with an index number, separated by an underscore.
     *
     * @param {Type} type - The type whose textual representation will be used.
     * @param {number} index - The numerical index to append to the type.
     * @returns {string} A unique string combining the type's text and the index.
     */
    getUniqueTypeWithIndex = (type: Type, index: number): string => {
        return type.getText() + "_" + index;
    }

    /**
     * Generates a unique identifier for a given generic node by combining its file path and start position.
     *
     * @param {Node} node - The node for which the unique identifier needs to be generated.
     * @return {string} A unique identifier string for the provided node.
     */
    getUniqueIdForGenericNode(node: Node): string {
        // A combination of file path and start position is a reliable unique identifier for a node.
        return `${node.getSourceFile().getFilePath()}:${node.getStart()}`;
    }

    static resolveValue(node: Node): any {
        // If it's an object literal
        if (Node.isObjectLiteralExpression(node)) {
            const result: Record<string, any> = {};
            for (const prop of node.getProperties()) {
                if (Node.isPropertyAssignment(prop)) {
                    const name = prop.getName();
                    const initializer = prop.getInitializer();
                    if (initializer) {
                        result[name] = this.resolveValue(initializer);
                    }
                }
            }
            return result;
        }

        // For literal values (strings, numbers, booleans)
        if (Node.isStringLiteral(node)) return node.getLiteralValue();
        if (Node.isNumericLiteral(node)) return Number(node.getText());
        if (node.getText() === 'true') return true;
        if (node.getText() === 'false') return false;

        // For identifiers (variables), try to find their declaration
        if (Node.isIdentifier(node)) {
            const definition = node.getDefinitions()[0];
            if (definition) {
                const declarationNode = definition.getDeclarationNode();
                if (declarationNode) {
                    // If it's a variable declaration, try to get its initializer
                    if (Node.isVariableDeclaration(declarationNode)) {
                        const initializer = declarationNode.getInitializer();
                        if (initializer) {
                            return this.resolveValue(initializer);
                        }
                    }
                }
            }
        }

        // If we can't resolve it, return undefined
        return undefined;
    }
}