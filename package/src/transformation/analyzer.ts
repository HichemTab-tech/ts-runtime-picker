import { Node, SyntaxKind, CallExpression, FunctionDeclaration, ArrowFunction, FunctionExpression } from "ts-morph";

// Define a type for the functions we are looking for.
type GenericContainer = FunctionDeclaration | ArrowFunction | FunctionExpression;

export interface ConcreteUsage {
    callSite: CallExpression; // The call that needs the new argument (e.g., MyComponent<User>())
    properties: string[];     // The final, concrete list of properties for that call
    chain: GenericContainer[];// The full chain of functions, from outer to inner
}

/**
 * Finds the function that contains a given node.
 * @param node The starting node (our `createPicker<T>()` call).
 * @returns The container function node, or undefined if not found.
 */
export function findContainingFunction(node: Node): GenericContainer | undefined {
    return node.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration) ||
        node.getFirstAncestorByKind(SyntaxKind.ArrowFunction) ||
        node.getFirstAncestorByKind(SyntaxKind.FunctionExpression);
}

/**
 * Recursively traces all usages of a generic function until it finds the
 * calls where a concrete type is specified.
 * @param funcNode The generic function definition to trace (e.g., createInnerPicker).
 * @param path An array of GenericContainer nodes representing the chain of functions leading to the current call.
 * @returns An array of ConcreteUsage objects.
 */
export function traceToConcreteUsages(funcNode: GenericContainer, path: GenericContainer[] = []): ConcreteUsage[] {
    const finalResults: ConcreteUsage[] = [];

    // Find the first level of usages
    const usages = findFunctionUsages(funcNode);

    // Prepend the current function to the path to build the chain
    const newPath = [funcNode, ...path];

    for (const usage of usages) {
        const typeArg = usage.getTypeArguments()[0];
        if (!typeArg) continue;

        const type = typeArg.getType();

        if (type.isTypeParameter()) {
            // Recursive step: Still generic. Keep tracing.
            const nextContainer = findContainingFunction(usage);
            if (nextContainer) {
                // Pass the current path down the chain
                const deeperResults = traceToConcreteUsages(nextContainer, newPath);
                finalResults.push(...deeperResults);
            }
        } else {
            // We found a concrete type (e.g., MyComponent<User>).
            // This is the end of the chain for this branch.
            finalResults.push({
                callSite: usage,
                properties: type.getProperties().map(p => p.getName()),
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
export function findFunctionUsages(funcNode: GenericContainer): CallExpression[] {
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