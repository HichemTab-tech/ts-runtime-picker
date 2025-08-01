import {useEffect, useState} from "react";
import {HelloBOSS} from "virtual:hello-boss";

const Component = () => {
    // simple counter
    const [count, setCount] = useState(0);

    useEffect(() => {
        HelloBOSS.push("Hello from Component: "+count);
    }, [count]);
    return (
        <div>
            <h1>Counter deep: {count}</h1>
            <button onClick={() => setCount(count + 1)}>Increment</button>
            <button onClick={() => setCount(count - 1)}>Decrement</button>
        </div>
    );
}

export default Component;