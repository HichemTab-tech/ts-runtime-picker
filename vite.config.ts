import { defineConfig } from 'vite';
import { resolve } from 'path';

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
  build: {
    lib: {
      // Define multiple entry points
      entry: {
        'index': resolve(__dirname, 'src/index.ts'),
        'vite-plugin': resolve(__dirname, 'src/vite-plugin.ts'),
        'webpack-loader': resolve(__dirname, 'src/webpack-loader.ts')
      },
      formats: ['cjs'],
      fileName: (_format, entryName) => `${entryName}.js`
    },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    // Ensure CommonJS compatibility
    rollupOptions: {
      external: ['ts-morph', 'webpack', 'vite'],
      output: {
        exports: 'named',
        preserveModules: false,
      }
    },
  },
  // Ensure TypeScript type declarations are generated
  plugins: [
    {
      name: 'generate-dts',
      closeBundle() {
        // We'll still use tsc to generate type declarations
        const { execSync } = require('child_process');
        execSync('tsc --emitDeclarationOnly --declaration --outDir dist');
      }
    }
  ]
});