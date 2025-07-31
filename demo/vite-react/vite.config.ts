import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import TsRuntimePickerVitePlugin from "ts-runtime-picker/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), TsRuntimePickerVitePlugin()],
})
