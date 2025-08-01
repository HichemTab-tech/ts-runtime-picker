import { describe, it, expect } from 'vitest';
import { createPicker, createFullPicker } from '../src';

describe('index', () => {
  describe('createPicker', () => {
    it('should throw an error when called directly', () => {
      expect(() => {
        createPicker<{ name: string }>()({}); 
      }).toThrow('createPicker is a placeholder. Use the ts-runtime-picker plugin to transform it during build.');
    });
  });

  describe('createFullPicker', () => {
    it('should throw an error when called directly', () => {
      expect(() => {
        createFullPicker<{ name: string }>()({}); 
      }).toThrow('createFullPicker is a placeholder. Use the ts-runtime-picker plugin to transform it during build.');
    });
  });
});