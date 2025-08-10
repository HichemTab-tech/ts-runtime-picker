import { SyntaxKind } from "ts-morph";
import {fileToTypes, project, typeToFile} from "../plugin/state";
import { Analyzer } from "./analyzer";
import {Rewriter} from "./rewriter";
import { findAndCategorizeImports } from "./discovery";
import {initiateResolvers} from "./resolver-factory";

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
        if (!behavior) continue;

        if (call.getTypeArguments().length <= 0) {
            console.trace(`Call expression ${call.getText()} has no type arguments.`);
            continue;
        }
        console.log(`working on file ${sourceFile.getBaseName()} on line ${call.getStartLineNumber()} transforming: `, call.getText());
        const optionsArgument = call.getArguments()[0];
        let partialOptions = {};
        if (optionsArgument) {
            partialOptions = Analyzer.resolveValue(optionsArgument);
        }
        const typeArg = call.getTypeArguments()[0];
        const pickedType = typeArg.getType();
        if (!pickedType) {
            console.trace(`Type argument ${typeArg.getText()} of call expression ${call.getText()} is not a type.`);
            continue;
        }
        Analyzer.checkIfTypeIsAcceptable(pickedType);

        const analyzer = new Analyzer(partialOptions, call);
        const rewriter = new Rewriter(partialOptions, call);
        initiateResolvers(partialOptions, call);
        if (pickedType.isTypeParameter()) {
            const container = analyzer.findContainingFunction(call, pickedType);
            if (!container) continue;

            console.log("container", container.getText());

            const concreteUsages = analyzer.traceToConcreteUsages(container, pickedType).filter(u => Boolean(u));
            if (concreteUsages.length === 0) continue;
            console.log("concreteUsages", concreteUsages)

            for (const usage of concreteUsages) {
                rewriter.executeRewrite(usage, behavior, call);
            }
        } else {
            const props = analyzer.getPropertiesOfType(pickedType);
            rewriter.replacePickerCallWithImplementation(call, props);
        }
    }

    return sourceFile.getFullText();
}