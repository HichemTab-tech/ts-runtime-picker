import {describe, it, expect, vi, beforeEach} from 'vitest';
import TsRuntimePickerVitePlugin from '../src/plugin/vite-plugin';
import {transformCode as transform} from '../src/transformation/transformer';

// Mock the transform function
vi.mock('../src/transformation/transformer', () => ({
    transformCode: vi.fn((code) => `transformed: ${code}`)
}));

beforeEach(() => {
    vi.clearAllMocks();
});

describe('TsRuntimePickerVitePlugin', () => {
    it('should create a Vite plugin with the correct configuration', () => {
        const plugin = TsRuntimePickerVitePlugin();

        // @ts-ignore
        expect(plugin.name).toBe('vite-plugin-ts-runtime-picker');
        // @ts-ignore
        expect(plugin.enforce).toBe('pre');
        // @ts-ignore
        expect(typeof plugin.transform).toBe('function');
    });

    it('should transform TypeScript files', () => {
        const plugin = TsRuntimePickerVitePlugin();
        const code = 'const x = 1;';
        const id = 'file.ts';

        // @ts-ignore
        const result = plugin.transform(code, id);

        expect(transform).toHaveBeenCalledWith(code, id);
        expect(result).toEqual({
            code: `transformed: ${code}`,
            map: null
        });
    });

    it('should transform TypeScript JSX files', () => {
        const plugin = TsRuntimePickerVitePlugin();
        const code = 'const x = <div />;';
        const id = 'file.tsx';

        // @ts-ignore
        const result = plugin.transform(code, id);

        expect(transform).toHaveBeenCalledWith(code, id);
        expect(result).toEqual({
            code: `transformed: ${code}`,
            map: null
        });
    });

    it('should not transform non-TypeScript files', () => {
        const plugin = TsRuntimePickerVitePlugin();
        const code = 'const x = 1;';
        const id = 'file.js';

        // @ts-ignore
        const result = plugin.transform(code, id);

        expect(transform).not.toHaveBeenCalled();
        expect(result).toBeNull();
    });
});
