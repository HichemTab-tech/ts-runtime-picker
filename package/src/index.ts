/**
 * Options for the ts-runtime-picker functions.
 */
interface Options {
    ignoreErrors?: boolean;
}

type PickerOptions = Options;
type FullPickerOptions = Options;

export const DEFAULT_OPTIONS: Options = {
    ignoreErrors: false,
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
export function createPicker<T>({ignoreErrors}: PickerOptions = DEFAULT_OPTIONS): (obj: Record<string, any>) => Partial<T> {
    if (ignoreErrors) {
        console.warn("createPicker is not replaced with a real implementation and the ignoreErrors option is set to true. This will return an empty object.");
        return () => ({});
    }
    //TODO: add a proper link to docs.
    throw new Error(
        "createPicker is a placeholder. Use the ts-runtime-picker plugin to transform it during build.\n make sure to implement the plugin in your build process."
    );
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
export function createFullPicker<T>({ignoreErrors}: FullPickerOptions = DEFAULT_OPTIONS): (obj: Record<string, any>) => T {
    if (ignoreErrors) {
        console.warn("createFullPicker is not replaced with a real implementation and the ignoreErrors option is set to true. This will return an empty object.");
        return () => ({} as T);
    }
    //TODO: add a proper link to docs.
    throw new Error(
        "createFullPicker is a placeholder. Use the ts-runtime-picker plugin to transform it during build.\n make sure to implement the plugin in your build process."
    );
}