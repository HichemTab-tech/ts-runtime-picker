import { describe, it, expect, vi, beforeEach } from 'vitest';
import TsRuntimePickerWebpackLoader from '../src/webpack-loader';
import * as transformer from '../src/ts-transformer';

// Mock the transform function
vi.mock('../src/ts-transformer', () => ({
  transform: vi.fn((code) => `transformed: ${code}`)
}));

describe('TsRuntimePickerWebpackLoader', () => {
  let loaderContext: any;
  let callback: any;
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create a mock loader context
    callback = vi.fn();
    loaderContext = {
      resourcePath: 'file.ts',
      async: () => callback
    };
  });
  
  it('should transform TypeScript files', () => {
    const source = 'const x = 1;';
    const map = { version: 3, sources: [], mappings: '' };
    
    TsRuntimePickerWebpackLoader.call(loaderContext, source, map);
    
    expect(transformer.transform).toHaveBeenCalledWith(source, 'file.ts');
    expect(callback).toHaveBeenCalledWith(null, `transformed: ${source}`, map);
  });
  
  it('should transform TypeScript JSX files', () => {
    loaderContext.resourcePath = 'file.tsx';
    const source = 'const x = <div />;';
    const map = { version: 3, sources: [], mappings: '' };
    
    TsRuntimePickerWebpackLoader.call(loaderContext, source, map);
    
    expect(transformer.transform).toHaveBeenCalledWith(source, 'file.tsx');
    expect(callback).toHaveBeenCalledWith(null, `transformed: ${source}`, map);
  });
  
  it('should handle errors during transformation', () => {
    const error = new Error('Transformation error');
    (transformer.transform as any).mockImplementationOnce(() => {
      throw error;
    });
    
    const source = 'const x = 1;';
    const map = { version: 3, sources: [], mappings: '' };
    
    TsRuntimePickerWebpackLoader.call(loaderContext, source, map);
    
    expect(transformer.transform).toHaveBeenCalledWith(source, 'file.ts');
    expect(callback).toHaveBeenCalledWith(error);
  });
  
  it('should not transform non-TypeScript files', () => {
    loaderContext.resourcePath = 'file.js';
    const source = 'const x = 1;';
    const map = { version: 3, sources: [], mappings: '' };
    
    TsRuntimePickerWebpackLoader.call(loaderContext, source, map);
    
    expect(transformer.transform).not.toHaveBeenCalled();
    // The callback should not be called for non-TypeScript files
    expect(callback).not.toHaveBeenCalled();
  });
});