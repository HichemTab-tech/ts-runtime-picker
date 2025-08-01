import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import TsRuntimePickerVitePlugin from "ts-runtime-picker/vite-plugin";

const virtualModuleId = 'virtual:hello-boss'
const resolvedVirtualModuleId = '\0' + virtualModuleId

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        TsRuntimePickerVitePlugin(),
        {
            name: 'vir',
            resolveId: id => {
                if (id === virtualModuleId) {
                    return resolvedVirtualModuleId
                }
            },
            load(id) {
                if (id === resolvedVirtualModuleId) {
                    return `export const HelloBOSS = []`
                }
            },
        }
    ],
    build: {
        minify: false,
    },
    server: {
        watch: {
            ignored: ['!**/node_modules/ts-runtime-picker/**'],
        },
    },

})
