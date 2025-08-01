import { SyntaxKind } from "ts-morph";
import { project, fileToTypes, typeToFile } from "../plugin/state";
import * as analyzer from "./analyzer";
import * as rewriter from "./rewriter";

export function transformCode(code: string, filePath: string): string {
    let sourceFile = project.getSourceFile(filePath);
    if (!sourceFile) {
        // Load the file if it exists, otherwise create a new one
        sourceFile = project.createSourceFile(filePath, code, { overwrite: true });
    } else {
        // If the file already exists, we can replace its content
        sourceFile.replaceWithText(code);
    }

    const usedTypes = new Set<string>();
    sourceFile.getDescendantsOfKind(SyntaxKind.TypeReference).forEach(ref => {
        const typeName = ref.getTypeName().getText();
        usedTypes.add(typeName);
        const decl = ref.getType().getSymbol()?.getDeclarations()?.[0];
        const source = decl?.getSourceFile()?.getFilePath();
        if (source) {
            typeToFile.set(typeName, source);
        }
    });
    fileToTypes.set(filePath, usedTypes);

    // Figure out what the “createPicker” import is called (alias or direct)
    let createPickerAlias: string | null = null;
    for (const importDecl of sourceFile.getImportDeclarations()) {
        if (importDecl.getModuleSpecifierValue() === "ts-runtime-picker") {
            for (const namedImport of importDecl.getNamedImports()) {
                const name = namedImport.getName();
                const alias = namedImport.getAliasNode()?.getText() || name;
                if (name === "createPicker" || name === "createFullPicker") {
                    createPickerAlias = alias;
                }
            }
        }
    }
    if (!createPickerAlias) {
        return sourceFile.getFullText();
    }

    // Walk all call expressions
    for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
        const exprText = call.getExpression().getText();
        if (exprText === createPickerAlias && call.getTypeArguments().length > 0) {
            const typeArg = call.getTypeArguments()[0];
            const pickedType = typeArg.getType();

            if (!pickedType) {
                throw new Error(`Couldn’t resolve type for ${typeArg.getText()}`);
            }

            if (pickedType.isTypeParameter()) {
                // analyze the situation without changing any code.
                const container = analyzer.findContainingFunction(call);
                console.log("container", container?.getText());
                if (!container) continue; // Not in a function we can modify.

                const usages = analyzer.findFunctionUsages(container);
                if (usages.length === 0) continue; // No usages, nothing to do.

                // rewrite the code based on the analysis.

                // Rewrite all the places the container is used.
                for (const usage of usages) {
                    const typeArg = usage.getTypeArguments()[0];
                    if (typeArg) {
                        const concreteType = typeArg.getType();
                        const properties = concreteType.getProperties().map(p => p.getName());
                        rewriter.addArgumentToCall(usage, properties);
                    }
                }

                // Rewrite the container function itself.
                rewriter.addParameterToFunctionSignature(container);
                rewriter.replacePickerCallWithImplementation(call);
            } else {
                const props = pickedType.getProperties().map(p => `"${p.getName()}"`);
                call.replaceWithText(`(_obj: any) => {
                  const _keys: string[] = [${props.join(",")}];
                  return _keys.reduce((_acc: {[k: string]: any}, _key: string) => {
                    if (_key in _obj) _acc[_key] = _obj[_key];
                    return _acc;
                  }, {});
                }`);
            }
        }
    }

    return sourceFile.getFullText();
}