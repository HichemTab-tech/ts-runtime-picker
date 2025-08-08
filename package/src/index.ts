/**
 * Options for the ts-runtime-picker functions.
 */
export interface Options {
    ignoreErrors: boolean;
    recursive: boolean
}

type PickerOptions = Partial<Options>;
type FullPickerOptions = Partial<Options>;

export const DEFAULT_OPTIONS: Options = {
    ignoreErrors: false,
    recursive: true
}

/**
 * Creates a function that picks and returns a subset of properties from an object of type `T`.
 * The returned partial object includes only the specified fields defined in `T`.
 *
 * The `createPicker` function is designed to be used alongside the `ts-runtime-picker` plugin,
 * which transforms this placeholder function during the build process.
 * It acts as a utility for
 * narrowing down object properties at runtime based on static typing.
 *
 * @return A function that takes an object and returns a partial object containing selected properties.
 */
export function createPicker<T>(options: PickerOptions = DEFAULT_OPTIONS): (obj: Record<string, any>) => Partial<T> {
    const {ignoreErrors} = buildOptions(options, "createPicker");
    if (ignoreErrors) return () => ({});
    return throwPlaceholderError("createPicker");
}

/**
 * Creates a function that picks and returns all properties from an object of type `T`.
 * This function is similar to `createPicker`, but it does not filter out any properties,
 * returning the full object as is.
 *
 * The `createFullPicker` function is designed to be used alongside the `ts-runtime-picker` plugin,
 * which transforms this placeholder function during the build process.
 * It acts as a utility for
 * retrieving the complete object properties at runtime based on static typing.
 *
 * @return A function that takes an object and returns the full object of type `T`.
 */
export function createFullPicker<T>(options: FullPickerOptions = DEFAULT_OPTIONS): (obj: Record<string, any>) => T {
    const {ignoreErrors} = buildOptions(options, "createFullPicker");
    if (ignoreErrors) return () => ({} as T);
    return throwPlaceholderError("createFullPicker");
}

type ThisModuleFunctions = {
    [K in keyof typeof import("./index")]: (typeof import("./index"))[K] extends Function ? K : never
}[keyof typeof import("./index")];


const buildOptions = (options: Partial<Options>, fn: ThisModuleFunctions) => {
    options = {...DEFAULT_OPTIONS, ...options};
    if (options.ignoreErrors) {
        console.warn(`${fn} is not replaced with a real implementation and the ignoreErrors option is set to true. This will return an empty object.`);
    }
    return options;
}

/**
 * @exception Error
 * @param fn
 */
const throwPlaceholderError = (fn: ThisModuleFunctions): never => {
    //TODO: add a proper link to docs.
    throw new Error(
        `${fn} is a placeholder. Use the ts-runtime-picker plugin to transform it during build.\n make sure to implement the plugin in your build process.`
    );
}