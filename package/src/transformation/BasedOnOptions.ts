import {DEFAULT_OPTIONS, Options} from "../index";

export abstract class BasedOnOptions {
    protected options: Options;
    constructor(partialOptions: Partial<Options>) {
        this.options = this.#buildOptions(partialOptions);
    }




    #buildOptions = (options: Partial<Options>) => {
        options = {...DEFAULT_OPTIONS, ...options};
        return options as Options;
    }
}