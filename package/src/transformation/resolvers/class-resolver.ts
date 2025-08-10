// src/transformation/resolvers/class-resolver.ts
import { CallExpression, ClassDeclaration, ClassExpression, Node } from "ts-morph";
import { IResolver } from "./types";

export class ClassResolver implements IResolver {
    canResolve(node: Node): boolean {
        return Node.isClassDeclaration(node) || Node.isClassExpression(node);
    }

    // Placeholder: usage discovery for classes can be implemented later
    findUsages(_containerNode: Node): CallExpression[] {
        return [];
    }

    addParameter(containerNode: Node, baseName: string): string {
        const classNode = containerNode as ClassDeclaration | ClassExpression;
        const ctor = classNode.getConstructors()[0] || classNode.addConstructor({});
        const existingParams = ctor.getParameters().filter(p => p.getName().startsWith(baseName)).length;
        const uniqueName = `${baseName}_${existingParams}`;
        ctor.addParameter({ name: uniqueName, type: "string[]" });
        return uniqueName;
    }

    addArgument(callSite: CallExpression, argValue: string[] | string): void {
        const propsString = Array.isArray(argValue) ? JSON.stringify(argValue) : argValue;
        callSite.addArgument(propsString);
    }
}
