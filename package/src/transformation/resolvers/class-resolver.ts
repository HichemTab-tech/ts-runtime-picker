import {CallExpression, ClassDeclaration, ClassExpression, Node, Scope, SyntaxKind} from "ts-morph";
import { IResolver } from "./types";
import {BasedOnContext} from "../BasedOnContext";

export class ClassResolver extends BasedOnContext implements IResolver {
    canResolve(node: Node): boolean {
        return ClassResolver.isClass(node);
    }

    static isClass(node: Node): boolean {
        return Node.isClassDeclaration(node) || Node.isClassExpression(node);
    }

    // Placeholder: usage discovery for classes can be implemented later
    findUsages(containerNode: Node): CallExpression[] {
        //TODO: test edges cases, of arguments using ...args
        const classNode = containerNode as ClassDeclaration | ClassExpression;
        let references = classNode.findReferencesAsNodes();
        const usageCalls: CallExpression[] = [];

        const processedSources = new Set<string>();
        for (const ref of references) {
            if (processedSources.has(ref.getSourceFile().getFilePath())) continue;

            // Look for new expressions that instantiate this class
            const newExpressions = ref
                .getSourceFile()
                .getDescendantsOfKind(SyntaxKind.NewExpression)
                .filter(newExpr => {
                    const expression = newExpr.getExpression();
                    return Node.isIdentifier(expression) &&
                        expression.getText() === classNode.getName();
                });

            // Convert NewExpression to CallExpression as they are functionally similar
            usageCalls.push(...newExpressions as unknown as CallExpression[]);
            processedSources.add(ref.getSourceFile().getFilePath());
        }

        return usageCalls;

    }

    addParameter(containerNode: Node, baseName: string): string {
        const classNode = containerNode as ClassDeclaration | ClassExpression;
        const ctor = classNode.getConstructors()[0] || classNode.addConstructor({});
        const existingParams = ctor.getParameters().filter(p => p.getName().startsWith(baseName)).length;
        const uniqueName = `${baseName}_${existingParams}`;
        ctor.addParameter({ name: uniqueName, type: "string[]", hasQuestionToken: false, scope: Scope.Protected});
        return uniqueName;
    }

    addArgument(callSite: CallExpression, argValue: string[] | string): void {
        const propsString = Array.isArray(argValue) ? JSON.stringify(argValue) : argValue;
        callSite.addArgument(propsString);
    }
}
