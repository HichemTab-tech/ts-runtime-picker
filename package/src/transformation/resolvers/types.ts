import { CallExpression, Node } from "ts-morph";
import {PropArray} from "../analyzer";

export interface IResolver {
    // Checks if this resolver can handle the given container node.
    canResolve(node: Node): boolean;

    // Finds where the container is used.
    findUsages(containerNode: Node): CallExpression[]; // Or the appropriate usage type

    // Adds the parameter/argument to the container's definition and returns the unique parameter name.
    addParameter(containerNode: Node, baseName: string): string;

    // Adds the argument to a specific call site of the container.
    addArgument(callSite: CallExpression, argValue: PropArray | string): void;
}
