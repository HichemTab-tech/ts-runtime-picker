import { PluginOption } from "vite";
import { transform } from "./ts-transformer.js";

const tsRuntimePicker: () => PluginOption = () => {
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

export default tsRuntimePicker;