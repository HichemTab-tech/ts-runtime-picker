import {CallExpression, Node} from "ts-morph";
import { IResolver } from "./resolvers/types";
import { FunctionResolver } from "./resolvers/function-resolver";
import { ClassResolver } from "./resolvers/class-resolver";
import {Options} from "../index";

let resolvers: IResolver[] = [];

export const initiateResolvers = (partialOptions: Partial<Options>, call: CallExpression) => {
    resolvers = [
        new FunctionResolver(partialOptions, call),
        new ClassResolver(partialOptions, call),
    ];
}

export function getResolverForNode(node: Node): IResolver | undefined {
    for (const resolver of resolvers) {
        if (resolver.canResolve(node)) return resolver;
    }
    return undefined;
}
