import { Project, SyntaxKind } from "ts-morph";

export function transform(code: string, filePath: string): string {
    const project = new Project();

    // Load the file if it exists, otherwise create a new one
    const sourceFile = project.addSourceFileAtPathIfExists(filePath)
        || project.createSourceFile(filePath, code, { overwrite: true });

    // Resolve the alias or name for `createPicker` from "ts-runtime-picker"
    let createPickerAlias: string | null = null;

    const importDeclarations = sourceFile.getImportDeclarations();

    for (const importDecl of importDeclarations) {
        if (importDecl.getModuleSpecifierValue() === "ts-runtime-picker") {
            const namedImports = importDecl.getNamedImports();
            for (const namedImport of namedImports) {
                if (namedImport.getName() === "createPicker") {
                    createPickerAlias = namedImport.getAliasNode()?.getText() || "createPicker";
                }
                else if (namedImport.getName() === "createFullPicker") {
                    createPickerAlias = namedImport.getAliasNode()?.getText() || "createFullPicker";
                }
            }
        }
    }

    // If we didn't find `createPicker` imported from "ts-runtime-picker", skip the transformation
    if (!createPickerAlias) {
        return sourceFile.getFullText();
    }

    // Find and replace `createPicker<MyInterface>()` or its alias
    const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const call of calls) {
        const expression = call.getExpression().getText();
        if (expression === createPickerAlias && call.getTypeArguments().length > 0) {
            const typeArg = call.getTypeArguments()[0];
            const typeName = typeArg.getText();

            // Get the interface declaration
            const interfaceDecl = sourceFile.getInterface(typeName);

            if (!interfaceDecl) {
                throw new Error(`Interface ${typeName} not found in ${filePath}`);
            }

            // Use TypeChecker to resolve all properties, including inherited ones
            const typeChecker = project.getTypeChecker();
            const type = typeChecker.getTypeAtLocation(interfaceDecl);

            if (!type) {
                throw new Error(`Type information for ${typeName} could not be resolved.`);
            }

            // Get all properties, including inherited ones
            const properties = type.getProperties();

            // Extract property names
            const keys = properties.map(prop => `"${prop.getName()}"`);

            // Replace `createPicker<MyInterface>()` with runtime implementation
            call.replaceWithText(`(_obj: any) => {
                const _keys: string[] = [${keys.join(",")}];
                return _keys.reduce((_acc: {[k: string]: any}, _key: string) => {
                    if (_key in _obj) _acc[_key] = _obj[_key];
                    return _acc;
                }, {});
            }`);
        }
    }

    return sourceFile.getFullText();
}