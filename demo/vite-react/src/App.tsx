import {useState} from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import {createPicker} from "ts-runtime-picker";
import type {Admin as Type} from "./types";

const request = {
    data: {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        password: "secret",
        extraField: "notNeeded", // This still exists at runtime
        anotherExtraField: "stillNotNeeded", // This too
        role: "blabla",
    }
};

function App() {
    const [count, setCount] = useState(0);

    try {
        const picker = createPicker<Type>();
        const filteredData = picker(request.data);
        console.log("filteredData", filteredData);
    } catch (e) {
        console.error("Error during data picking:", e);
    }

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
        </>
    )
}

export default App
