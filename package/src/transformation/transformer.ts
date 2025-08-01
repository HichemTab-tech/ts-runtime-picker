import { SyntaxKind } from "ts-morph";
import { project, fileToTypes, typeToFile } from "../plugin/state";

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
                // We will handle the generic case in this block.
                // For now, it replaces with a simple temporary function
                call.replaceWithText(`(_obj: any) => {
                  console.warn("Generic type detected, but no specific logic implemented yet.");
                  return {};
                }`);
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