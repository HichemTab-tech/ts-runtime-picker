import { Node } from "ts-morph";
import { IResolver } from "./resolvers/types";
import { FunctionResolver } from "./resolvers/function-resolver";
import { ClassResolver } from "./resolvers/class-resolver";

const resolvers: IResolver[] = [
    new FunctionResolver(),
    new ClassResolver(),
];

export function getResolverForNode(node: Node): IResolver | undefined {
    for (const resolver of resolvers) {
        if (resolver.canResolve(node)) return resolver;
    }
    return undefined;
}
