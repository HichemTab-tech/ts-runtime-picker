import { CallExpression, FunctionDeclaration, ArrowFunction, FunctionExpression } from "ts-morph";

type GenericContainer = FunctionDeclaration | ArrowFunction | FunctionExpression;

/**
 * Adds a new argument to a function call.
 * @param call The function calls node to modify.
 * @param properties The array of property strings to add as the new argument.
 */
export function addArgumentToCall(call: CallExpression, properties: string[]|string) {
    const propsString = Array.isArray(properties) ? `[${properties.map(p => `"${p}"`).join(", ")}]` : properties;
    call.addArgument(propsString);
}

/**
 * Adds a new parameter to a function's signature.
 * @param funcNode The function definition to modify.
 * @param baseName
 */
export function addParameterToFunctionSignature(funcNode: GenericContainer, baseName: string) {
    // Check how many picker keys we've already added to find the next index.
    const existingParams = funcNode.getParameters().filter(p => p.getName().startsWith(baseName)).length;
    const uniqueName = `${baseName}_${existingParams}`;

    funcNode.addParameter({ name: uniqueName, type: "string[]" });

    return uniqueName;
}

/**
 * Replaces the internal `createPicker<T>()` call with the runtime implementation.
 * @param pickerCall The `createPicker<T>()` node to replace.
 * @param argName The name of the argument that will be used to pass the keys.
 */
export function replacePickerCallWithImplementation(pickerCall: CallExpression, argName: string) {
    const replacementCode = `(_obj: any) => {
      const _keys: string[] = ${argName};
      return _keys.reduce((_acc: {[k: string]: any}, _key: string) => {
        if (_key in _obj) _acc[_key] = _obj[_key];
        return _acc;
      }, {});
    }`;
    pickerCall.replaceWithText(replacementCode);
}