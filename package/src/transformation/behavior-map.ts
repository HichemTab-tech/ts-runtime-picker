
// Define the possible runtime behaviors our tool can generate.
export type TargetBehavior = 'PICKER' | 'VALIDATOR' | 'SERIALIZER';

// Map the functions we can import to their intended behavior.
export const BEHAVIOR_MAPPING: { [key: string]: TargetBehavior } = {
    'createPicker': 'PICKER',
    'createFullPicker': 'PICKER',
    // In the future, we could add:
    // 'createValidator': 'VALIDATOR',
    // 'createSerializer': 'SERIALIZER',
};
