// src/transformation/rewriter.ts
import { CallExpression, FunctionDeclaration, ArrowFunction, FunctionExpression } from "ts-morph";

type GenericContainer = FunctionDeclaration | ArrowFunction | FunctionExpression;

/**
 * Adds a new argument to a function call.
 * @param call The function calls node to modify.
 * @param properties The array of property strings to add as the new argument.
 */
export function addArgumentToCall(call: CallExpression, properties: string[]) {
    const propsString = `[${properties.map(p => `"${p}"`).join(", ")}]`;
    call.addArgument(propsString);
}

/**
 * Adds a new parameter to a function's signature.
 * @param funcNode The function definition to modify.
 */
export function addParameterToFunctionSignature(funcNode: GenericContainer) {
    funcNode.addParameter({ name: "_pickerKeys", type: "string[]" });
}

/**
 * Replaces the internal `createPicker<T>()` call with the runtime implementation.
 * @param pickerCall The `createPicker<T>()` node to replace.
 */
export function replacePickerCallWithImplementation(pickerCall: CallExpression) {
    const replacementCode = `(_obj: any) => {
      const _keys: string[] = _pickerKeys;
      return _keys.reduce((_acc: {[k: string]: any}, _key: string) => {
        if (_key in _obj) _acc[_key] = _obj[_key];
        return _acc;
      }, {});
    }`;
    pickerCall.replaceWithText(replacementCode);
}