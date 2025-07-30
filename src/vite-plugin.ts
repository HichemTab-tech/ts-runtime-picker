import { PluginOption } from "vite";
import {fileToTypes, refreshProject, transform, typeToFile} from "./ts-transformer.js";

// noinspection JSUnusedGlobalSymbols
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
export default function TsRuntimePickerVitePlugin(): PluginOption {
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

        handleHotUpdate: ({server, file}) => {
            const affectedFiles = [];

            // Loop over all files that used types
            for (const [userFile, usedTypes] of fileToTypes.entries()) {
                for (const typeName of usedTypes) {
                    if (typeToFile.get(typeName) === file) {
                        affectedFiles.push(userFile);
                        break;
                    }
                }
            }

            if (affectedFiles.length) {
                refreshProject();

                for (const file of affectedFiles) {
                    const mod = server.moduleGraph.getModuleById(file);
                    if (mod) {
                        server.moduleGraph.invalidateModule(mod);
                        server.ws.send({
                            type: 'update',
                            updates: [
                                {
                                    type: 'js-update',
                                    path: mod.url, // relative to root
                                    acceptedPath: mod.url,
                                    timestamp: Date.now()
                                }
                            ]
                        });
                    }
                }
            }
        }
    } as PluginOption;
}

export { TsRuntimePickerVitePlugin };
