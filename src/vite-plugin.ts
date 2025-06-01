import { PluginOption } from "vite";
import { transform } from "./ts-transformer.js";

/**
 * A function that provides a Vite plugin for transforming TypeScript files at runtime.
 * The plugin is named "vite-plugin-ts-runtime-picker" and it is enforced to run at the 'pre' stage.
 * The transform process specifically handles files with `.ts` and `.tsx` extensions.
 * The transformation process logs the file being transformed and applies a custom transformation
 * function to the code.
 * Source maps are excluded in the output for simplicity.
 *
 * @returns {PluginOption} A Vite plugin configuration object for handling TypeScript runtime transformations.
 */
function TsRuntimePickerVitePlugin(): PluginOption {
    return {
        name: "vite-plugin-ts-runtime-picker",
        enforce: "pre",
        transform(code, id) {
            if (id.endsWith(".ts") || id.endsWith(".tsx")) {
                console.log(`Transforming ${id}`);
                return {
                    code: transform(code, id),
                    map: null, // Skip source maps for simplicity
                };
            }

            return null;
        },
    } as PluginOption;
}

export { TsRuntimePickerVitePlugin, TsRuntimePickerVitePlugin as default };
