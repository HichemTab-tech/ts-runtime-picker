import { SyntaxKind } from "ts-morph";
import {fileToTypes, project, typeToFile} from "../plugin/state";
import { Analyzer } from "./analyzer";
import {Rewriter} from "./rewriter";
import { findAndCategorizeImports } from "./discovery";

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

    // Find and categorize imports from 'ts-runtime-picker'
    const categorizedImports = findAndCategorizeImports(sourceFile);
    if (categorizedImports.size === 0) {
        return sourceFile.getFullText();
    }

    const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).reverse();

    // Walk all call expressions
    for (const call of calls) {
        if (call.wasForgotten()) continue; // Skip nodes removed in a previous iteration.
        const exprText = call.getExpression().getText();
        const behavior = categorizedImports.get(exprText);
        if (behavior && call.getTypeArguments().length > 0) {
            const optionsArgument = call.getArguments()[0];
            let partialOptions = {};
            if (optionsArgument) {
                partialOptions = Analyzer.resolveValue(optionsArgument);
            }
            const typeArg = call.getTypeArguments()[0];
            const pickedType = typeArg.getType();

            if (!pickedType) {
                continue;
            }

            if (pickedType.isUnionOrIntersection()) {
                throw new Error(`Cannot pick from union or intersection types`);
            }

            const analyzer = new Analyzer(partialOptions);
            const rewriter = new Rewriter(partialOptions);

            if (pickedType.isTypeParameter()) {
                const container = analyzer.findContainingFunction(call);
                if (!container) continue;

                const concreteUsages = analyzer.traceToConcreteUsages(container, pickedType);
                if (concreteUsages.length === 0) continue;

                for (const usage of concreteUsages) {
                    rewriter.executeRewrite(usage, behavior, call);
                }
            } else {
                const props = analyzer.getPropertiesOfType(pickedType);
                rewriter.replacePickerCallWithImplementation(call, props);
            }
        }
    }

    return sourceFile.getFullText();
}