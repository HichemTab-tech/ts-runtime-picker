# ts-runtime-picker

![GitHub License](https://img.shields.io/github/license/HichemTab-tech/ts-runtime-picker)
![NPM Version](https://img.shields.io/npm/v/ts-runtime-picker)
![NPM Downloads](https://img.shields.io/npm/dw/ts-runtime-picker)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/HichemTab-tech/ts-runtime-picker/npm-publish)
![GitHub Release](https://img.shields.io/github/v/release/HichemTab-tech/ts-runtime-picker)



**ts-runtime-picker** 🚀 is a TypeScript-first utility package designed to dynamically transform your code and provide runtime-safe "pickers" for your objects based on TypeScript interfaces or types. The package integrates seamlessly into your Vite-based or Webpack-based projects, allowing developers to enjoy type-safe runtime logic without sacrificing development speed or flexibility.

---

## 🛠️ Problem and Solution

### 🐛 The Problem
When working with JavaScript or TypeScript, developers often pass objects directly into functions, APIs, or databases (like Firebase). This can lead to unnecessary or unwanted properties being included. For example:

```typescript
const request = {
    data: {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        password: "secret",
        extraField: "notNeeded",
        anotherExtraField: "stillNotNeeded"
    }
};

firebase.collection("users").add(request.data);
```

In this example, only `firstName`, `lastName`, `email`, and `password` might be relevant for the operation, but `extraField` and `anotherExtraField` are also sent, which could cause inefficiencies, validation errors, or unexpected behavior.

Even if you explicitly type `request.data` as `User` in TypeScript, the extra fields (`extraField` and `anotherExtraField`) still exist at runtime. TypeScript enforces types only at compile time, meaning that any additional or unwanted properties are not automatically removed:

```typescript
interface User {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}

const request: { data: User } = {
    data: {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        password: "secret",
        extraField: "notNeeded", // This still exists at runtime
        anotherExtraField: "stillNotNeeded" // This too
    }
};

firebase.collection("users").add(request.data); // `extraField` and `anotherExtraField` are still sent!
```

Manually filtering the object to ensure it adheres to a defined interface is tedious and error-prone:

```typescript
const filteredData = {
    firstName: request.data.firstName,
    lastName: request.data.lastName,
    email: request.data.email,
    password: request.data.password
};

firebase.collection("users").add(filteredData);
```

### 💡 The Solution
`ts-runtime-picker` 🧰 solves this by automatically generating a picker function based on your TypeScript interface. This function ensures that only the properties defined in the interface are included in the object:

```typescript
import { createPicker } from "ts-runtime-picker";

interface User {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}

const picker = createPicker<User>();
const filteredData = picker(request.data);

firebase.collection("users").add(filteredData);
```

The `picker` function dynamically removes unwanted properties, ensuring only the keys specified in `User` are included. This approach:

- ⏳ Saves time by eliminating repetitive manual filtering.
- ✅ Ensures runtime safety by aligning object properties with TypeScript interfaces.
- 🐞 Reduces the risk of bugs and inefficiencies caused by sending unnecessary data.

---

## 📦 Installation

To start using `ts-runtime-picker`, follow these steps:

### 1. Install the Package
```bash
npm install ts-runtime-picker
```

### 2. Add the Vite Plugin or Webpack Loader

#### Vite Plugin

In your `vite.config.ts`, import the plugin and include it in the plugins array:

```typescript
import { defineConfig } from "vite";
import TsRuntimePickerVitePlugin from "ts-runtime-picker/vite-plugin";

export default defineConfig({
    plugins: [TsRuntimePickerVitePlugin()],
});
```

#### Webpack Loader

For projects using Webpack, you can integrate `ts-runtime-picker` with the following webpack loader.

```javascript
module.exports = {
    //...
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [
                    {
                        loader: 'ts-loader',
                    },
                    {
                        loader: 'ts-runtime-picker/webpack-loader', // add the ts-runtime-picker webpack loader
                    },
                ],
                include: path.resolve(__dirname, 'src'),
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
        fallback: {
            fs: false,
            path: false,
            os: false,
            perf_hooks: false,
        }
    },
    //...
}
```

---

## ✨ Usage

### 1. Define Your TypeScript Interface
Create a TypeScript interface that defines the structure of the object you want to pick keys from:

```typescript
interface User {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}
```

### 2. Use `createPicker`
Call the `createPicker` function with your TypeScript interface:

```typescript
import { createPicker } from "ts-runtime-picker";

const picker = createPicker<User>();

const inputObject = {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    password: "secret",
    extraField: "notNeeded",
};

const result = picker(inputObject);
console.log(result); // { firstName: "John", lastName: "Doe", email: "john.doe@example.com", password: "secret" }
```

### 3. Using `createFullPicker`
For cases where you are certain that all properties defined in the type will be present in the object
(for example, when extracting a child type from a parent type),
you can use `createFullPicker`.
It behaves exactly like `createPicker`, but returns a full type instead of a `Partial` type:

```typescript
import { createFullPicker } from "ts-runtime-picker";

interface User {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}

const fullPicker = createFullPicker (); 

const completeUser = {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    password: "secret",
    extraData: "will be removed"
};

const result = fullPicker(completeUser); // Type is User, not Partial<User>
```

### 4. How It Works
The plugin dynamically transforms the `createPicker<User>()` and `createFullPicker<User>()` calls into runtime-safe implementations
that pick only the keys defined in `User`.
This transformation works with both Vite (via the plugin) and Webpack (via the loader).
The main difference between the two functions is in their type signatures:
- `createPicker<T>()` returns `Partial<T>`, which is safer when some properties might be missing
- `createFullPicker<T>()` returns `T`, which is appropriate when you know all properties will be present, useful in case where you want to pick a child type from a parent type.

---

## 🎯 Purpose and Benefits

The goal of `ts-runtime-picker` is to bridge the gap between TypeScript's compile-time type safety and runtime JavaScript functionality. By transforming your code at build time, this package enables developers to:

- 🚫 Avoid repetitive manual key picking from objects.
- ⚡ Ensure runtime behavior aligns with TypeScript-defined interfaces.
- 🎉 Simplify code while maintaining type safety.
- 🛠 Works seamlessly with modern bundlers, including Vite (via a plugin) and Webpack (via a loader).
---



## Contributing

We welcome contributions! If you'd like to improve `ts-runtime-picker`, feel free to [open an issue](https://github.com/HichemTab-tech/ts-runtime-picker/issues) or [submit a pull request](https://github.com/HichemTab-tech/ts-runtime-picker/pulls).

## Author

- [@HichemTab-tech](https://www.github.com/HichemTab-tech)

## License

[MIT](https://github.com/HichemTab-tech/ts-runtime-picker/blob/master/LICENSE)

## 🌟 Acknowledgements

Special thanks to the open-source community and early adopters of `ts-runtime-picker` for their feedback, which helped expand support to Webpack alongside Vite.

<!-- GitAds-Verify: 9JJRMB9BB1DIYMRFCFC1V6GB2EJ7TCHJ -->


## GitAds Sponsored
[![Sponsored by GitAds](https://gitads.dev/v1/ad-serve?source=hichemtab-tech/ts-runtime-picker@github)](https://gitads.dev/v1/ad-track?source=hichemtab-tech/ts-runtime-picker@github)


