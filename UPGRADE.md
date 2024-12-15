# **UPGRADE.md** (Migration Guide)

## **Upgrading to 2.0.0**

Version `2.0.0` introduces **breaking changes** due to structural improvements and Webpack support. Follow these steps to ensure a smooth upgrade.

---

## **1. Update Your Package**
Install the latest version of `ts-runtime-picker`:
```bash
npm install ts-runtime-picker@2.0.0
```

---

## **2. Update Imports for Vite**
The import name for the Vite plugin has changed:
- **Before**:
  ```typescript
  import tsRuntimePicker from "ts-runtime-picker/vite-plugin";
  ```
- **Now**:
  ```typescript
  import TsRuntimePickerVitePlugin from "ts-runtime-picker/vite-plugin";
  ```
  Update your `vite.config.ts` to reflect the new import name:
  ```typescript
  import { defineConfig } from "vite";
  import TsRuntimePickerVitePlugin from "ts-runtime-picker/vite-plugin";

  export default defineConfig({
      plugins: [TsRuntimePickerVitePlugin()],
  });
  ```

---

## **3. Add Webpack Support**
For projects using Webpack, you can now integrate `ts-runtime-picker` using its custom loader.

1. **Update Webpack Configuration**:
   Add the following rule to your `webpack.config.js`:
   ```javascript
   {
       test: /\.ts$/,
       use: [
           {
               loader: 'ts-loader',
           },
           {
               loader: 'ts-runtime-picker/webpack-loader', // ts-runtime-picker loader
           },
       ],
   }
   ```

2. **Ensure the Order of Loaders**:
   The `ts-runtime-picker/webpack-loader` must come **after** `ts-loader` to work correctly.

---

## **4. Verify Your Setup**
After upgrading, rebuild your project and verify that:
- Your Vite or Webpack configurations are correctly updated.
- Your `createPicker` calls are being transformed as expected.

---

## **5. Common Issues**
- **Vite Plugin Errors**:
    - Ensure you’ve updated the import to `TsRuntimePickerVitePlugin`.

- **Webpack Loader Issues**:
    - Ensure the loader is placed **after** `ts-loader` in your Webpack rules.
    - Verify that your TypeScript files are correctly matched by the `test` condition.

---

By following these steps, your project will be fully compatible with the new version of `ts-runtime-picker`. 🚀 Let us know if you encounter any issues!