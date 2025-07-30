import { PluginOption } from "vite";
import {fileToTypes, invalidateOneFile, transform, typeToFile} from "./ts-transformer.js";

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

        handleHotUpdate: ({server, file, timestamp}) => {
            const isKnownTypeDefinitionFile = [...typeToFile.values()].includes(file);

            if (!isKnownTypeDefinitionFile) {
                // This file change doesn't affect any of our transformations, so we can ignore it.
                return;
            }

            console.log(`[ts-runtime-picker] Change detected in a tracked type definition: ${file}`);


            // Surgically update the ts-morph project
            if (!invalidateOneFile(file)) return;

            const dependentModulesToUpdate = [];

            // Find all files (`userFile`) that import a type from the file that just changed (`file`).
            for (const [userFile, usedTypes] of fileToTypes.entries()) {
                for (const typeName of usedTypes) {
                    if (typeToFile.get(typeName) === file) {
                        // This `userFile` depends on the changed type. We need to update it.
                        const moduleNode = server.moduleGraph.getModuleById(userFile);
                        if (moduleNode) {
                            dependentModulesToUpdate.push(moduleNode);
                            // Once we know the file is affected, we don't need to check its other types.
                            break;
                        }
                    }
                }
            }

            if (dependentModulesToUpdate.length > 0) {
                console.log(`[ts-runtime-picker] Found ${dependentModulesToUpdate.length} module(s) to update.`);

                //Invalidate modules and notify the client
                for (const mod of dependentModulesToUpdate) {
                    server.moduleGraph.invalidateModule(mod);
                }

                // This sends the HMR update to the client (browser), telling it which
                // modules have changed so it can re-request them.
                server.ws.send({
                    type: 'update',
                    updates: dependentModulesToUpdate.map((mod) => ({
                        type: 'js-update',
                        path: mod.url,
                        acceptedPath: mod.url,
                        timestamp: timestamp
                    }))
                });
            }

            // We return the list of modules we've handled so Vite's core HMR logic
            // doesn't try to process them again.
            return dependentModulesToUpdate;
        }
    } as PluginOption;
}

export { TsRuntimePickerVitePlugin };
