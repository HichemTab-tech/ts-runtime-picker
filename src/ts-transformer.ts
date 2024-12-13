import { Project, SyntaxKind } from "ts-morph";

export function transform(code: string, filePath: string): string {
    const project = new Project();

    // Load the file if it exists, otherwise create a new one
    const sourceFile = project.addSourceFileAtPathIfExists(filePath)
        || project.createSourceFile(filePath, code, { overwrite: true });

    // Find and replace `createPicker<MyInterface>()`
    const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const call of calls) {
        const expression = call.getExpression().getText();
        if (expression === "createPicker" && call.getTypeArguments().length > 0) {
            const typeArg = call.getTypeArguments()[0];
            const typeName = typeArg.getText();

            // Get the type declaration for the interface
            const interfaceDecl = sourceFile.getInterface(typeName);
            if (!interfaceDecl) {
                throw new Error(`Interface ${typeName} not found in ${filePath}`);
            }

            // Extract keys from the interface
            const keys = interfaceDecl.getProperties().map(prop => `"${prop.getName()}"`);

            // Replace `createPicker<MyInterface>()` with runtime implementation
            call.replaceWithText(`
                (obj) => {
                    const keys = [${keys.join(",")}];
                    return keys.reduce((acc, key) => {
                        if (key in obj) acc[key] = obj[key];
                        return acc;
                    }, {});
                }
            `);
        }
    }

    return sourceFile.getFullText();
}