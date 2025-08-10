import {
    ArrowFunction,
    CallExpression,
    FunctionDeclaration,
    FunctionExpression,
    MethodDeclaration,
    Node,
    SyntaxKind
} from "ts-morph";
import {IResolver} from "./types";
import {BasedOnContext} from "../BasedOnContext";

export class FunctionResolver extends BasedOnContext implements IResolver {
    canResolve(node: Node): boolean {
        return Node.isFunctionDeclaration(node)
            || Node.isArrowFunction(node)
            || Node.isFunctionExpression(node)
            || Node.isMethodDeclaration(node);
    }

    findUsages(containerNode: Node): CallExpression[] {
        const funcNode = containerNode as FunctionDeclaration | ArrowFunction | FunctionExpression | MethodDeclaration;
        let references = [];
        if (Node.isMethodDeclaration(funcNode)) {
            // Get the containing class
            const containingClass = funcNode.getParentIfKind(SyntaxKind.ClassDeclaration);
            if (containingClass) {
                // Get the method name
                const methodName = funcNode.getName();
                // Find all references to the class
                const classRefs = containingClass.findReferencesAsNodes();

                const processedSources = new Set<string>();
                // Look for method calls on class instances
                for (const ref of classRefs) {
                    if (processedSources.has(ref.getSourceFile().getFilePath())) continue;
                    const propertyAccesses = ref
                        .getSourceFile()
                        .getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)
                        .filter(prop => prop.getName() === methodName);
                    references.push(...propertyAccesses);
                    processedSources.add(ref.getSourceFile().getFilePath());
                }
            }
        } else if (Node.isArrowFunction(funcNode)) {
            // check if it's assigned to a variable
            const variableDeclaration = funcNode.getFirstAncestorByKind(SyntaxKind.VariableDeclaration);
            if (variableDeclaration) {
                references = variableDeclaration.findReferencesAsNodes();
            } else {
                console.warn("Arrow functions with no variable declaration are not supported for usage analysis.");
                return [];
            }
        } else {
            references = funcNode.findReferencesAsNodes();
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

    addParameter(containerNode: Node, baseName: string): string {
        const funcNode = containerNode as FunctionDeclaration | ArrowFunction | FunctionExpression | MethodDeclaration;
        // Check how many picker keys we've already added to find the next index.
        let existingParams = 0;
        if (Node.isMethodDeclaration(funcNode) || Node.isFunctionDeclaration(funcNode) || Node.isFunctionExpression(funcNode) || Node.isArrowFunction(funcNode)) {
            existingParams = funcNode.getParameters().filter(p => p.getName().startsWith(baseName)).length;
        }
        const uniqueName = `${baseName}_${existingParams}`;
        // Add parameter as string[] type
        // Note: addParameter exists for all function-like nodes in ts-morph
        (funcNode as any).addParameter({ name: uniqueName, type: "string[]" });
        return uniqueName;
    }

    addArgument(callSite: CallExpression, argValue: string[] | string): void {
        const propsString = Array.isArray(argValue) ? JSON.stringify(argValue) : argValue;
        callSite.addArgument(propsString);
    }
}
