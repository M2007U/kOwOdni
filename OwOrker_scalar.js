onmessage = (event) =>
{
    //a: array
    //s: scalar

    console.log("OwOker_scalar : start")
    let Time_Start = performance.now()

    let outArray = new Float64Array( event.data.a.length )

    for(let i = 0 ; i < event.data.a.length ; i++)
    {
        outArray[i] = event.data.a[i] * event.data.s
    }

    //console.log("OwOrker_scalar : sending result")
    postMessage(outArray.buffer , [outArray.buffer])
    //console.log("OwOrker_scalar : result sent")

    console.log("OwOrker_scalar : duration : " + (performance.now() - Time_Start).toFixed(3))

    self.close()
}