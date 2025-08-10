export const PrintR = ({obj}: {obj: any}) => {
    return <div style={{textAlign: "left"}}><pre>{JSON.stringify(obj, null, 2)}</pre></div>
}