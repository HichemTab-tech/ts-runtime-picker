import {Project, SyntaxKind, Type} from "ts-morph";

export const fileToTypes = new Map<string, Set<string>>();

export const typeToFile = new Map<string, string>();

let project = null as unknown as Project;

export const refreshProject = () => {
    project = new Project({
        tsConfigFilePath: "tsconfig.json",
    });
}

export const invalidateOneFile = (file: string) => {

    const sourceFileToRefresh = project.getSourceFile(file);
    if (sourceFileToRefresh) {
        sourceFileToRefresh.refreshFromFileSystemSync();
        return true;
    } else {
        return false;
    }
}

export function transform(code: string, filePath: string): string {

    const usedTypes = new Set<string>();

    let sourceFile = project.getSourceFile(filePath);

    if (!sourceFile) {
        // Load the file if it exists, otherwise create a new one
        sourceFile = project.createSourceFile(filePath, code, { overwrite: true });
    } else {
        // If the file already exists, we can replace its content
        sourceFile.replaceWithText(code);
    }

    sourceFile.getDescendantsOfKind(SyntaxKind.TypeReference).forEach(ref => {
        const typeName = ref.getTypeName().getText();
        usedTypes.add(typeName);

        // BONUS: resolve where this type is defined
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

            if (pickedType.isUnionOrIntersection()) {
                throw new Error(`Cannot pick from union or intersection types`);
            }

            type PropArray = (string|{name: string; props: PropArray})[]

            const getProperties = (type: Type): PropArray => {

                return type.getProperties().map(prop => {
                    // Get the value declaration
                    const valueDeclaration = prop.getValueDeclaration();

                    if (valueDeclaration) {
                        // Get the type node and actual type
                        const propertyType = valueDeclaration.getType();

                        const isInterface = propertyType.isInterface();
                        const isClass = propertyType.isClass();
                        const isObject = propertyType.isObject();

                        // If it's an interface or class, you can get its properties recursively
                        if (isInterface || isClass || isObject) {
                            return {
                                name: prop.getName(),
                                props: getProperties(propertyType)
                            }
                        }
                    }
                    return prop.getName();
                });
            }

            const props = getProperties(pickedType);

            console.log("pp", props, JSON.stringify(props));

            // Replace the call with a runtime picker that uses those keys
            call.replaceWithText(`(_obj: any) => {
    const _keys: any[] = JSON.parse('${JSON.stringify(props)}');
    const reduceThisOne = (_keys: any, _obj: any) => {
        return _keys.reduce((_acc: {[k: string]: any}, _key: any) => {
            if (typeof _obj === 'string') return _obj;
        
            if (typeof _key !== 'string') {
                const { name, props } = _key;
                if (name in _obj) {
                    _acc[name] = reduceThisOne(props, _obj[name]);
                }
            }
            else {
                if (_key in _obj) _acc[_key] = _obj[_key];
            }
            return _acc;
        }, {});
    }
    
    return reduceThisOne(_keys, _obj);
}`);
        }
    }

    return sourceFile.getFullText();
}

refreshProject();