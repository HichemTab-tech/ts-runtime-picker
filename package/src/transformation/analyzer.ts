import { Node, SyntaxKind, CallExpression, FunctionDeclaration, ArrowFunction, FunctionExpression } from "ts-morph";

// Define a type for the functions we are looking for.
type GenericContainer = FunctionDeclaration | ArrowFunction | FunctionExpression;

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
        // check if its assigned to a variable
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