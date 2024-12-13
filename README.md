# ts-runtime-picker

**ts-runtime-picker** 🚀 is a TypeScript-first utility package designed to dynamically transform your code and provide runtime-safe "pickers" for your objects based on TypeScript interfaces or types. The package integrates seamlessly into your Vite-based projects and allows developers to enjoy type-safe runtime logic without sacrificing development speed or flexibility.

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

### 2. Add the Vite Plugin
In your `vite.config.ts`, import the plugin and include it in the plugins array:

```typescript
import { defineConfig } from "vite";
import tsRuntimePicker from "ts-runtime-picker/vite-plugin";

export default defineConfig({
    plugins: [tsRuntimePicker()],
});
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

### 3. How It Works
The Vite plugin dynamically transforms the `createPicker<User>()` call into a runtime-safe implementation that picks only the keys defined in `User`. This is achieved by analyzing the TypeScript interface during the build process and injecting the corresponding runtime logic.

---

## 🎯 Purpose and Benefits

The goal of `ts-runtime-picker` is to bridge the gap between TypeScript's compile-time type safety and runtime JavaScript functionality. By transforming your code at build time, this package enables developers to:

- 🚫 Avoid repetitive manual key picking from objects.
- ⚡ Ensure runtime behavior aligns with TypeScript-defined interfaces.
- 🎉 Simplify code while maintaining type safety.
---



## Contributing

We welcome contributions! If you'd like to improve `ts-runtime-picker`, feel free to [open an issue](https://github.com/HichemTab-tech/ts-runtime-picker/issues) or [submit a pull request](https://github.com/HichemTab-tech/ts-runtime-picker/pulls).

## Author

- [@HichemTab-tech](https://www.github.com/HichemTab-tech)

## License

[MIT](https://github.com/HichemTab-tech/ts-runtime-picker/blob/master/LICENSE)

## 🌟 Acknowledgements

Special thanks to the open-source community for inspiring the development of tools like this!