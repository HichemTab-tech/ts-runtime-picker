import { SyntaxKind } from "ts-morph";
import { project, fileToTypes, typeToFile } from "../plugin/state";
import * as analyzer from "./analyzer";
import * as rewriter from "./rewriter";
import {generateRandomId} from "../lib/utils";

export function transformCode(code: string, filePath: string): string {
    const argName = "_pickerKeys_"+generateRandomId();
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
                const container = analyzer.findContainingFunction(call);
                if (!container) continue;

                const concreteUsages = analyzer.traceToConcreteUsages(container);
                if (concreteUsages.length === 0) continue;

                // Use a Set to track which functions we have already added the parameter to.
                const modifiedFunctions = new Set<any>();

                for (const usage of concreteUsages) {
                    // Rewrite the final call site. This is always unique per usage, so it's safe.
                    rewriter.addArgumentToCall(usage.callSite, usage.properties);

                    // Loop through the functions in the chain.
                    for (let i = 0; i < usage.chain.length; i++) {
                        const funcInChain = usage.chain[i];

                        // Only add the parameter if we haven't done it before.
                        if (!modifiedFunctions.has(funcInChain)) {
                            rewriter.addParameterToFunctionSignature(funcInChain, argName);
                            modifiedFunctions.add(funcInChain); // Remember that we've done it.
                        }

                        const nextFuncInChain = usage.chain[i + 1];

                        // If it exists, find the call that focuses on it.
                        if (nextFuncInChain) {
                            const callToNextFunc = funcInChain.getDescendantsOfKind(SyntaxKind.CallExpression)
                                .find(c => {
                                    const symbol = c.getExpression().getType().getSymbol();
                                    const decl = symbol?.getDeclarations()[0];
                                    // Now we are comparing with the variable from the outer scope.
                                    return decl === nextFuncInChain;
                                });

                            // If we found the connecting call, modify it.
                            if (callToNextFunc) {
                                // Check if the argument is already there before adding it.
                                // A simple check is to see if the number of arguments is lower than the number of parameters.
                                const expectedParams = nextFuncInChain.getParameters().length;
                                if (callToNextFunc.getArguments().length < expectedParams) {
                                    rewriter.addArgumentToCall(callToNextFunc, argName);
                                }
                            }
                        }
                    }
                }

                // Replace the original, innermost `createPicker<T>()` call.
                // This is the very first picker we found, so it only needs to be done once.
                rewriter.replacePickerCallWithImplementation(call, argName);
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