import {ClassContainer, FunctionContainer} from "../transformation/analyzer";

/**
 * Generates a random ID of a specified length.
 * @param length
 */
export const generateRandomId = (length: number = 8) => {
    return Math.random().toString(36).substring(2, length + 2);
};

export const containerIsFunction = (container: any): container is FunctionContainer => {
    return container && (
        container.getKindName === undefined ||
        container.getKindName() === "FunctionDeclaration" ||
        container.getKindName() === "ArrowFunction" ||
        container.getKindName() === "FunctionExpression" ||
        container.getKindName() === "MethodDeclaration"
    );
}

export const containerIsClass = (container: any): container is ClassContainer => {
    return container && (container.getKindName === undefined || container.getKindName() === "ClassDeclaration" ||
        container.getKindName() === "ClassExpression");
}