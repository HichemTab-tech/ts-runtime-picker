import { Project } from "ts-morph";

export const fileToTypes = new Map<string, Set<string>>();
export const typeToFile = new Map<string, string>();
export let project = null as unknown as Project;

export const refreshProject = () => {
    project = new Project({
        tsConfigFilePath: "tsconfig.json",
    });
};

export const invalidateOneFile = (file: string) => {
    const sourceFileToRefresh = project.getSourceFile(file);
    if (sourceFileToRefresh) {
        sourceFileToRefresh.refreshFromFileSystemSync();
        return true;
    } else {
        return false;
    }
};

refreshProject();