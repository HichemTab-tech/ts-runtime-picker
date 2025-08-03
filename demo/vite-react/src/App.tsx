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
        b: "b",
        c: "c",
    }
};


function MyComponent <X = {a: string;c: string;}>() {
    return <h1><pre>{JSON.stringify((createPicker<X>())(request))}</pre></h1>
}


const realPicker = createPicker<Type>();

const createEvenBiggerPicker = <T = any, P = any>() => {
    return createBiggerPicker<T, P>();
}

const createBiggerPicker = <T = any, P = any>() => {
    return [
        createGenericPicker2<T>(),
        createGenericPicker2<T>(),
        createGenericPicker2<P>()
    ];
}

class MyClass<X> {
    data: any;
    constructor(data: any) {
        this.data = data;
    }

    getText<F>() {
        return JSON.stringify((createPicker<F>())(this.data));
    }

    /*getText2() {
        return JSON.stringify((createPicker<X>({ignoreErrors: true}))(this.data));
    }*/

    static getTHing() {

    }
}

const createGenericPicker2 = <T = any>() => {
    return createPicker<T>({ignoreErrors: true});
}

/*const createGenericPicker = <T = any>() => {
    return createPicker<T>({ignoreErrors: true});
}*/

function App() {
    const [count, setCount] = useState(0);

    try {
        const picker = createEvenBiggerPicker<Type, User>();
        const filteredData = picker[0](request.data);
        const filteredData2 = picker[1](request.data);
        const filteredData3 = picker[2]?.(request.data)??null;
        console.log("generic With Admin", filteredData);
        console.log("generic With Admin", filteredData2);
        console.log("generic With User 2", filteredData3);
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
                {/*<MyComponent/>*/}
                <pre>{(new MyClass<Type>(request.data)).getText<Type>()}</pre>
            </div>
        </>
    )
}

export default App
