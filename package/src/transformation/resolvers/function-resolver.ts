import {
    ArrowFunction,
    CallExpression,
    FunctionDeclaration,
    FunctionExpression,
    MethodDeclaration,
    Node,
    SyntaxKind
} from "ts-morph";
import { IResolver } from "./types";

export class FunctionResolver implements IResolver {
    canResolve(node: Node): boolean {
        return Node.isFunctionDeclaration(node)
            || Node.isArrowFunction(node)
            || Node.isFunctionExpression(node)
            || Node.isMethodDeclaration(node);
    }

    findUsages(containerNode: Node): CallExpression[] {
        const funcNode = containerNode as FunctionDeclaration | ArrowFunction | FunctionExpression | MethodDeclaration;
        let references;
        if (!Node.isArrowFunction(funcNode)) {
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
