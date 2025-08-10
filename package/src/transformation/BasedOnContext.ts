import {DEFAULT_OPTIONS, Options} from "../index";
import {CallExpression} from "ts-morph";

export abstract class BasedOnContext {
    protected options: Options;
    protected readonly call: CallExpression;
    constructor(partialOptions: Partial<Options>, call: CallExpression) {
        this.options = this.#buildOptions(partialOptions);
        this.call = call;
    }




    #buildOptions = (options: Partial<Options>) => {
        options = {...DEFAULT_OPTIONS, ...options};
        return options as Options;
    }
}