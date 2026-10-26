importScripts(
    "https://unpkg.com/mathjs@15.2.0/lib/browser/math.js"
);

//math lerping
function POwO_Math_LERP(A, B, t)
{
    return (B-A) * t + A
}

//math lerping rev
function POwO_Math_LERPinv(A,B,V)
{
    let ReturnResult = 0;

    if (A === B)
    {
        ReturnResult = A;
    }
    else
    {
        ReturnResult = (V-A) / (B-A) 
    }
    
    return ReturnResult;
}

//math lerp Mapping
function POwO_Math_LERPmap(a,b,v,A,B)
{
    let t = POwO_Math_LERPinv(a,b,v);
    return POwO_Math_LERP(A,B,t);
}

onmessage = (event) => {

    /*
    inputs :
    
    f : the excutable function
    w : how wide should the array be
    h : how high should the array be
    Xmin : the smallest X will be plotted
    Xmax
    Ymin
    Ymax

    */

    try
    {
        console.log("OwOrker_plot : start")
        let Time_Start = performance.now()

        //step 1 : compile
        //console.log("OwOrker_plot : start compile")
        let MathCompiled = math.parse(event.data.f).compile()
        //console.log("OwOrker_plot : end compile")

        //step 2 : precompute X and Y coords for plotting
        let temp_CoordX = []
        let temp_CoordY = []
        for(let i = 0 ; i < event.data.w ; i++)
        {
            temp_CoordX.push(POwO_Math_LERPmap(0, event.data.w - 1 , i , event.data.Xmin , event.data.Xmax))
        }
        for(let i = 0 ; i < event.data.h ; i++)
        {
            temp_CoordY.push(POwO_Math_LERPmap(0, event.data.h - 1 , i , event.data.Ymax , event.data.Ymin))
        }

        //step 2 : plot
        //console.log("OwOrker_plot : start plot")
        let ResultArray = new Float64Array(event.data.w * event.data.h)
        let temp_Scope = {x:null , y:null}
        for(let i = 0 ; i < event.data.h ; i++)//for every row
        {
            temp_Scope.y = temp_CoordY[i]
            for(let j = 0 ; j < event.data.w ; j++)//for every column
            {
                temp_Scope.x = temp_CoordX[j]
                ResultArray[ i * event.data.w + j ] = MathCompiled.evaluate( temp_Scope ) 
            }
        }
        //console.log("OwOrker_plot : end plot")

        //send the result
        //console.log("OwOrker_plot : sending result")
        postMessage(ResultArray.buffer , [ResultArray.buffer])
        //console.log("OwOrker_plot : result sent")

        console.log("OwOrker_plot : duration : " + (performance.now() - Time_Start).toFixed(4))
    }
    catch(error)
    {
        console.log("OwOrker_plot : oh nyo QAQ : ")
        console.log(error)
    }

    self.close()
}