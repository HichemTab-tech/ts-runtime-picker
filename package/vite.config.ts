import {defineConfig} from 'vite';
import {resolve} from 'path';
import {configDefaults} from 'vitest/config';
import dts from 'vite-plugin-dts';

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['**/*.{test,spec}.{js,ts}'],
        exclude: [...configDefaults.exclude, 'dist/**']
    },
    build: {
        lib: {
            // Define multiple entry points
            entry: {
                'index': resolve(__dirname, 'src/index.ts'),
                'vite-plugin': resolve(__dirname, 'src/vite-plugin.ts'),
                'webpack-loader': resolve(__dirname, 'src/webpack-loader.ts')
            },
            formats: ['cjs', 'es'],
            fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'mjs' : 'js'}`
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
        dts()
    ]
});
