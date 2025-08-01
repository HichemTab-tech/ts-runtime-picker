import {useEffect, useState} from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import {createPicker} from "ts-runtime-picker";
import type {Admin as Type, User} from "./types";
import Component from "./Component";

const request = {
    data: {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        password: "secret",
        extraField: "notNeeded", // This still exists at runtime
        anotherExtraField: "stillNotNeeded", // This too
        role: "blabla",
        a: "a",
    }
};

const realPicker = createPicker<Type>();

const createBiggerPicker = <T = any>() => {
    return createGenericPicker2<T>();
}

const createGenericPicker2 = <T = any>() => {
    return createPicker<T>({ignoreErrors: true});
    //return (_: any) => ({}) as T;
}

/*const createGenericPicker = <T = any>() => {
    return createPicker<T>({ignoreErrors: true});
}*/

function App() {
    const [count, setCount] = useState(0);

    try {
        const picker = createBiggerPicker<Type>();
        const picker2 = createBiggerPicker<User>();
        const filteredData = picker(request.data);
        const filteredData2 = picker2(request.data);
        console.log("generic With Admin", filteredData);
        console.log("generic With User", filteredData2);
        console.log("realPicker", realPicker(request.data));
    } catch (e) {
        console.error("Error during data picking:", e);
    }

    useEffect(() => {
        //console.log("Hello from App: ", HelloBOSS);
    }, [count]);

    return (
        <>
            <div>
                <a href="https://vite.dev" target="_blank">
                    <img src={viteLogo} className="logo" alt="Vite logo"/>
                </a>
                <a href="https://react.dev" target="_blank">
                    <img src={reactLogo} className="logo react" alt="React logo"/>
                </a>
            </div>
            <h1>Vite + React</h1>
            <div className="card">
                <button onClick={() => setCount((count) => count + 1)}>
                    count is {count}
                </button>
                <p>
                    Edit <code>src/App.tsx</code> and save to test HMR
                </p>
            </div>
            <p className="read-the-docs">
                Click on the Vite and React logos to learn more
            </p>
            <div className="card">
                <Component/>
            </div>
        </>
    )
}

export default App
