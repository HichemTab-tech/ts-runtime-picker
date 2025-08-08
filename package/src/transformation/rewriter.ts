import {CallExpression} from "ts-morph";
import {GenericContainer, PropArray} from "./analyzer";
import {containerIsClass, containerIsFunction} from "../lib/utils";
import {BasedOnOptions} from "./BasedOnOptions";

export class Rewriter extends BasedOnOptions{
    /**
     * Adds a new argument to a function call.
     * @param call The function calls node to modify.
     * @param properties The array of property strings to add as the new argument.
     */
    addArgumentToCall(call: CallExpression, properties: PropArray|string) {
        const propsString = Array.isArray(properties) ? JSON.stringify(properties) : properties;
        call.addArgument(propsString);
    }

    /**
     * Adds a new parameter to a function's signature.
     * @param funcNode The function definition to modify.
     * @param baseName
     */
    addParameterToFunctionSignature(funcNode: GenericContainer, baseName: string) {
        let uniqueName = "";
        if (containerIsFunction(funcNode)) {
            // Check how many picker keys we've already added to find the next index.
            const existingParams = funcNode.getParameters().filter(p => p.getName().startsWith(baseName)).length;
            uniqueName = `${baseName}_${existingParams}`;

            funcNode.addParameter({ name: uniqueName, type: "string[]" });
        }
        else if (containerIsClass(funcNode)) {
            // Check how many picker keys we've already added to find the next index.
            const existingParams = funcNode.getConstructors()[0].getParameters().filter(p => p.getName().startsWith(baseName)).length;
            uniqueName = `${baseName}_${existingParams}`;

            funcNode.getConstructors()[0].addParameter({ name: uniqueName, type: "string[]" });
        }

        return uniqueName;
    }

    /**
     * Replaces the internal `createPicker<T>()` call with the runtime implementation.
     * @param pickerCall The `createPicker<T>()` node to replace.
     * @param argNameOrProps
     */
    replacePickerCallWithImplementation(pickerCall: CallExpression, argNameOrProps: string|PropArray) {
        console.log("op", this.options);
        if (!this.options.recursive && typeof argNameOrProps !== 'string') {
            argNameOrProps = argNameOrProps.map(a => {
                if (typeof a === "string") return a;

                return a.name;
            });
        }
        pickerCall.replaceWithText(`(_obj: any) => {\n    const _keys: any[] = ${typeof argNameOrProps === 'string' ? argNameOrProps : `JSON.parse('${JSON.stringify(argNameOrProps)}')`};\n    const reduceThisOne = (_keys: any, _obj: any) => {\n        return _keys.reduce((_acc: {[k: string]: any}, _key: any) => {\n            if (typeof _obj === 'string') return _obj;\n        \n            if (typeof _key !== 'string') {\n                const { name, props } = _key;\n                if (name in _obj) {\n                    _acc[name] = reduceThisOne(props, _obj[name]);\n                }\n            }\n            else {\n                if (_key in _obj) _acc[_key] = _obj[_key];\n            }\n            return _acc;\n        }, {});\n    }\n    \n    return reduceThisOne(_keys, _obj);\n}`);
    }
}