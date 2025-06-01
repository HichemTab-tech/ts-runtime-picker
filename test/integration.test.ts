import { describe, it, expect } from 'vitest';
import { transform } from '../src/ts-transformer';

describe('Integration', () => {
  it('should transform createPicker to pick only specified properties', () => {
    // noinspection NpmUsedModulesInstalled,JSUnresolvedReference,UnnecessaryLabelJS,BadExpressionStatementJS,JSValidateTypes,JSUnusedLocalSymbols
    const code = `
      // noinspection JSAnnotator
      
      import { createPicker } from "ts-runtime-picker";

      interface User {
        firstName: string;
        lastName: string;
        email: string;
        password: string;
      }

      const picker = createPicker<User>();

      const user = {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        password: "secret",
        extraData: "will be removed"
      };

      const result = picker(user);
    `;

    const filePath = 'test-file.ts';
    const transformedCode = transform(code, filePath);

    // Verify the transformation
    expect(transformedCode).toContain('const _keys: string[] = ["firstName","lastName","email","password"]');
    expect(transformedCode).not.toContain('createPicker<User>()');

    // Instead of executing the code (which would fail due to import statements),
    // we'll verify the structure of the transformed code

    // Check that the picker function is correctly transformed
    expect(transformedCode).toContain('const picker = (_obj: any) => {');
    expect(transformedCode).toContain('const _keys: string[] = ["firstName","lastName","email","password"]');
    expect(transformedCode).toContain('return _keys.reduce((_acc: {[k: string]: any}, _key: string) => {');
    expect(transformedCode).toContain('if (_key in _obj) _acc[_key] = _obj[_key];');
    expect(transformedCode).toContain('return _acc;');
    expect(transformedCode).toContain('}, {});');
  });

  it('should transform createFullPicker to pick all properties', () => {
    // noinspection NpmUsedModulesInstalled,JSUnresolvedReference,UnnecessaryLabelJS,BadExpressionStatementJS,JSValidateTypes,JSUnusedLocalSymbols
    const code = `
      // noinspection JSAnnotator
      
      import { createFullPicker } from "ts-runtime-picker";

      interface User {
        firstName: string;
        lastName: string;
      }

      const picker = createFullPicker<User>();

      const user = {
        firstName: "John",
        lastName: "Doe",
        extraData: "will be removed"
      };

      const result = picker(user);
    `;

    const filePath = 'test-file.ts';
    const transformedCode = transform(code, filePath);

    // Verify the transformation
    expect(transformedCode).toContain('const _keys: string[] = ["firstName","lastName"]');
    expect(transformedCode).not.toContain('createFullPicker<User>()');

    // Instead of executing the code (which would fail due to import statements),
    // we'll verify the structure of the transformed code

    // Check that the picker function is correctly transformed
    expect(transformedCode).toContain('const picker = (_obj: any) => {');
    expect(transformedCode).toContain('const _keys: string[] = ["firstName","lastName"]');
    expect(transformedCode).toContain('return _keys.reduce((_acc: {[k: string]: any}, _key: string) => {');
    expect(transformedCode).toContain('if (_key in _obj) _acc[_key] = _obj[_key];');
    expect(transformedCode).toContain('return _acc;');
    expect(transformedCode).toContain('}, {});');
  });
});
