import { SourceFile } from "ts-morph";
import { BEHAVIOR_MAPPING, TargetBehavior } from "./behavior-map";

// Scans import declarations from 'ts-runtime-picker' and categorizes imported names by behavior
export function findAndCategorizeImports(sourceFile: SourceFile): Map<string, TargetBehavior> {
    const map = new Map<string, TargetBehavior>();

    for (const importDecl of sourceFile.getImportDeclarations()) {
        if (importDecl.getModuleSpecifierValue() === "ts-runtime-picker") {
            for (const namedImport of importDecl.getNamedImports()) {
                const name = namedImport.getName();
                const alias = namedImport.getAliasNode()?.getText() || name;
                const behavior = BEHAVIOR_MAPPING[name];
                if (behavior) {
                    map.set(alias, behavior);
                }
            }
        }
    }

    return map;
}
