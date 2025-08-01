/**
 * Generates a random ID of a specified length.
 * @param length
 */
export const generateRandomId = (length: number = 8) => {
    return Math.random().toString(36).substring(2, length + 2);
};