import { describe, it, expect } from 'vitest';
import { transform } from '../src/ts-transformer';

describe('ts-transformer', () => {
  it('should transform createPicker calls', () => {
    const code = `
      import { createPicker } from "ts-runtime-picker";

      interface User {
        firstName: string;
        lastName: string;
        email: string;
      }

      const picker = createPicker<User>();
    `;

    const filePath = 'test-file.ts';
    const result = transform(code, filePath);

    // The transformed code should contain the runtime implementation
    expect(result).toContain('const picker = (_obj: any) => {');
    expect(result).toContain('const _keys: string[] = ["firstName","lastName","email"]');
    expect(result).toContain('if (_key in _obj) _acc[_key] = _obj[_key];');
  });

  it('should handle aliased imports', () => {
    const code = `
      import { createPicker as cp } from "ts-runtime-picker";

      interface User {
        firstName: string;
        lastName: string;
      }

      const picker = cp<User>();
    `;

    const filePath = 'test-file.ts';
    const result = transform(code, filePath);

    // The transformed code should contain the runtime implementation
    expect(result).toContain('const picker = (_obj: any) => {');
    expect(result).toContain('const _keys: string[] = ["firstName","lastName"]');
  });

  it('should not transform code without createPicker imports', () => {
    const code = `
      interface User {
        firstName: string;
        lastName: string;
      }

      const picker = someOtherFunction<User>();
    `;

    const filePath = 'test-file.ts';
    const result = transform(code, filePath);

    // The code should remain unchanged
    expect(result).toBe(code);
  });

  it('should transform createFullPicker calls', () => {
    const code = `
      import { createFullPicker } from "ts-runtime-picker";

      interface User {
        firstName: string;
        lastName: string;
        email: string;
      }

      const picker = createFullPicker<User>();
    `;

    const filePath = 'test-file.ts';
    const result = transform(code, filePath);

    // The transformed code should contain the runtime implementation
    expect(result).toContain('const picker = (_obj: any) => {');
    expect(result).toContain('const _keys: string[] = ["firstName","lastName","email"]');
    expect(result).toContain('if (_key in _obj) _acc[_key] = _obj[_key];');
  });
});
