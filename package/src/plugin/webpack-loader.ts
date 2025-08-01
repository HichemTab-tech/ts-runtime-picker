import { LoaderContext } from 'webpack';
import {transformCode} from "../transformation/transformer";

/**
 * A Webpack loader function that transforms TypeScript files at runtime.
 *
 * @param {string} source - The original source code of the file being loaded.
 * @param {any} map - The source map associated with the input source, if any.
 */
const TsRuntimePickerWebpackLoader = function (this: LoaderContext<any>, source: string, map: any){
    const filePath = this.resourcePath; // The file being processed
    const callback = this.async(); // Asynchronous processing
    if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
        try {
            const transformedCode = transformCode(source, filePath);

            callback(null, transformedCode, map);
        } catch (err: any) {
            callback(err);
        }
    }
}

export default TsRuntimePickerWebpackLoader;