import { Project, SyntaxKind } from "ts-morph";

export function transform(code: string, filePath: string): string {
    const project = new Project({
        // make sure you’ve configured TS so it can see your other files (tsconfig.json, etc.)
        // otherwise type‐resolution won’t work across files
        tsConfigFilePath: "tsconfig.json",
    });

    // Load the file if it exists, otherwise create a new one
    const sourceFile = project.addSourceFileAtPathIfExists(filePath)
        || project.createSourceFile(filePath, code, { overwrite: true });

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

    project.getTypeChecker();
    // Walk all call expressions
    for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
        const exprText = call.getExpression().getText();
        if (exprText === createPickerAlias && call.getTypeArguments().length > 0) {
            const typeArg = call.getTypeArguments()[0];

            // Instead of sourceFile.getInterface(typeName), ask the checker:
            //   getTypeFromTypeNode knows how to follow imports/aliases
            const pickedType = typeArg.getType();

            if (!pickedType) {
                throw new Error(`Couldn’t resolve type for ${typeArg.getText()}`);
            }

            // Now grab every property (including inherited ones) from that type
            const props = pickedType.getProperties().map(p => `"${p.getName()}"`);

            // Replace the call with a runtime picker that uses those keys
            call.replaceWithText(`(_obj: any) => {
          const _keys: string[] = [${props.join(",")}];
          return _keys.reduce((_acc: {[k: string]: any}, _key: string) => {
            if (_key in _obj) _acc[_key] = _obj[_key];
            return _acc;
          }, {});
        }`);
        }
    }

    return sourceFile.getFullText();
}