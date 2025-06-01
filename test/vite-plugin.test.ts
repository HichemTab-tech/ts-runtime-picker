import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TsRuntimePickerVitePlugin } from '../src/vite-plugin';
import * as transformer from '../src/ts-transformer';

// Mock the transform function
vi.mock('../src/ts-transformer', () => ({
  transform: vi.fn((code) => `transformed: ${code}`)
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TsRuntimePickerVitePlugin', () => {
  it('should create a Vite plugin with the correct configuration', () => {
    const plugin = TsRuntimePickerVitePlugin();

    expect(plugin.name).toBe('vite-plugin-ts-runtime-picker');
    expect(plugin.enforce).toBe('pre');
    expect(typeof plugin.transform).toBe('function');
  });

  it('should transform TypeScript files', () => {
    const plugin = TsRuntimePickerVitePlugin();
    const code = 'const x = 1;';
    const id = 'file.ts';

    const result = plugin.transform(code, id);

    expect(transformer.transform).toHaveBeenCalledWith(code, id);
    expect(result).toEqual({
      code: `transformed: ${code}`,
      map: null
    });
  });

  it('should transform TypeScript JSX files', () => {
    const plugin = TsRuntimePickerVitePlugin();
    const code = 'const x = <div />;';
    const id = 'file.tsx';

    const result = plugin.transform(code, id);

    expect(transformer.transform).toHaveBeenCalledWith(code, id);
    expect(result).toEqual({
      code: `transformed: ${code}`,
      map: null
    });
  });

  it('should not transform non-TypeScript files', () => {
    const plugin = TsRuntimePickerVitePlugin();
    const code = 'const x = 1;';
    const id = 'file.js';

    const result = plugin.transform(code, id);

    expect(transformer.transform).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
