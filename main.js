function POwO_docgetel(InString)
{
    return document.getElementById(InString);
}

function POwO_Math_Clamp(InMin, InVal, InMax)
{
    
    //return Math.max(InMin, Math.min(InVal, InMax) );
    if (InVal > InMax)
    {
        return InMax;
    }
    else if (InVal < InMin)
    {
        return InMin;
    }
    else
    {
        return InVal;
    }

}

function POwO_Math_LERP(A, B, t)
{
    return (B-A) * t + A
}

//math lerping rev
function POwO_Math_LERPinv(A,B,V)
{
    let ReturnResult = 0;

    if (A==B)
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

function POwO_Bool_ArrayAND(inArray)
{
    for(let i = 0 ; i < inArray.length ; i++)
    {
        if (inArray[i] === false){return false}
    }
    return true;
}

// ---- ---- ---- ----

const canvas = document.getElementById("kanvas");
const ctx = canvas.getContext("2d");
const HTML_Body = POwO_docgetel("HTML_body")

const field_ResMode = POwO_docgetel("field_ResMode")
const field_freq = POwO_docgetel("field_Freq")

//setup
var GLOBAL_Res = []
var GLOBAL_Res_AcceptanceRadius = 16 //what is the radius that a mode can accept a frequency ? eg : say a mode resoFreq = 3000, if the radius is 16, then 3000-16 or 3000+16 can excite the mode
var GLOBAL_Mode = []
var GLOBAL_freq = Number(field_freq.value)

//runtime render
var GLOBAL_workers = []
var GLOBAL_plate = []
var GLOBAL_flagDone = []

//runtime view
var GLOBAL_sliceHeight = 0.05 //the whole 3D shape is plot, how thin should the slice we see be ?

//bench mark
var BENCH_phase1start = 0
var BENCH_phase2start = 0
var BENCH_phase3start = 0
var BENCH_phase4start = 0
var BENCH_phase5start = 0
var BENCH_phaseAllDone = 0

// ---- ---- ---- ----



function POwO_Math_Reso(inCurFreq,inResoFreq,inMax)
{
    //inCurFreq : the frequency that the metal plate is vibrating right now
    //inResoFreq : the Resonance Frequency for a Mode
    //inMax : something like a radius of acceptance

    let tempGet = POwO_Math_Clamp( 0 , inMax - Math.abs( inCurFreq - inResoFreq ) , inMax )
    return tempGet / inMax //(0~1)
}

function POwO_PLOT_Phase1()
{
    //get the Reso in an array , get the Mode in a array
    BENCH_phase1start = performance.now()
    console.log("Main Phase 1 : start")

    let temp_ResMode = field_ResMode.value
    let Array_ResMode_Pass1 = temp_ResMode.split(/\r?\n/) //every line is a mode
    GLOBAL_Res = []
    GLOBAL_Mode = []
    for(let i = 0 ; i < Array_ResMode_Pass1.length ; i++)
    {
        if (Array_ResMode_Pass1[i] !== "")
        {
            let temp_cut = Array_ResMode_Pass1[i].split(",")
            GLOBAL_Res.push( Number(temp_cut[0]) )
            GLOBAL_Mode.push( temp_cut[1] )
        }
    }
    POwO_PLOT_Phase2()
}

function POwO_PLOT_Phase2()
{
    //array of workers, give them the datas to plot, put result at another array
    BENCH_phase2start = performance.now()
    console.log("Phase 2 start ")

    GLOBAL_workers = []
    GLOBAL_plate = [] //put the resulting arry in here
    GLOBAL_flagDone = []

    for(let i = 0 ; i < GLOBAL_Mode.length ; i++)
    {
        //setup
        let worker = new Worker("OwOrker_plot.js")
        GLOBAL_workers.push(worker)
        GLOBAL_plate.push(null)
        GLOBAL_flagDone.push(false)

        //assign work
        GLOBAL_workers[i].postMessage({f:GLOBAL_Mode[i] , w:canvas.width , h:canvas.height , Xmin:-1 , Xmax:1 , Ymin:-1 , Ymax:1 })
        
        //when done
        GLOBAL_workers[i].onmessage = (event) =>
        {
            GLOBAL_plate[i] = new Float64Array(event.data) //put the result in the plate
            GLOBAL_flagDone[i] = true
            POwO_PLOT_Phase3() //request to goto nest phase
        }
        
    }
}

function POwO_PLOT_Phase3()
{
    //multiply everything by Reso
    //now GLOBAL_plate has everything
    console.log("Phase 3 trigger")

    //vibe check, if all the workers are done
    if ( !POwO_Bool_ArrayAND(GLOBAL_flagDone) ){console.log("Phase 3 wait") ; return}
    console.log("Phase 3 start")
    BENCH_phase3start = performance.now()

    //clean
    GLOBAL_workers = []
    GLOBAL_flagDone = []

    for(let i = 0 ; i < GLOBAL_Res.length ; i++)
    {
        //setup
        let worker = new Worker("OwOrker_scalar.js")
        GLOBAL_workers.push(worker)
        GLOBAL_flagDone.push(false)

        //assign
        GLOBAL_workers[i].postMessage({ a:GLOBAL_plate[i] , s:POwO_Math_Reso(GLOBAL_freq , GLOBAL_Res[i] ,GLOBAL_Res_AcceptanceRadius)  })

        //when done
        GLOBAL_workers[i].onmessage = (event) =>
        {
            GLOBAL_plate[i] = new Float64Array(event.data)
            GLOBAL_flagDone[i] = true
            POwO_PLOT_Phase4()
        }
    }

}

function POwO_PLOT_Phase4()
{
    //add all the array from each ModeRes

    //vibe check, if all the workers are done
    console.log("Phase 4 trigger")
    if ( !POwO_Bool_ArrayAND(GLOBAL_flagDone) ){console.log("Phase 4 wait") ; return}
    console.log("Phase 4 start")
    BENCH_phase4start = performance.now()

    

    let SumArray = new Float64Array( canvas.width * canvas.height )
    for( let i = 0 ; i < SumArray.length ; i++ ) //through every flatout pixels
    {
        let temp_sum = 0
        for( j = 0 ; j < GLOBAL_plate.length ; j++ ) //through every ResMode
        {
            temp_sum += GLOBAL_plate[j][i]
        }
        SumArray[i] = temp_sum
    }

    GLOBAL_plate = []
    GLOBAL_plate.push( SumArray ) //this is the final flat array to be drawn onto the canvas
    POwO_PLOT_Phase5()
}

function POwO_PLOT_Phase5()
{
    // step 5 : plot final onto canvas
    console.log("Phase 5 start")
    BENCH_phase5start = performance.now()

    let centerX = Math.floor(canvas.width/2)
    let centerY = Math.floor(canvas.height/2)
    let ImageData = ctx.createImageData(canvas.width, canvas.height);

    for(let y = 0 ; y < canvas.height ; y++)
    {
        for(let x = 0 ; x < canvas.width ; x++)
        {
            let PixelIndex = ( y * canvas.width + x ) * 4
            let giveTransparency = 0

            if ( Math.abs(GLOBAL_plate[0][y * canvas.width + x]) < GLOBAL_sliceHeight )
            {
                giveTransparency = 255
            }
            else
            {
                giveTransparency = 0
            }

            ImageData.data[PixelIndex + 0] = 255
            ImageData.data[PixelIndex + 1] = 255
            ImageData.data[PixelIndex + 2] = 255
            ImageData.data[PixelIndex + 3] = giveTransparency
        }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(ImageData, 0, 0);

    console.log("Phase All done")
    BENCH_phaseAllDone = performance.now()

    POwO_PLOT_BenchResult()
}

function POwO_PLOT_BenchResult()
{
    let PrintString = 
    "Bench result : \n" +
    "\n" +
    "Phase 1 (interpret user input) : " + (BENCH_phase2start - BENCH_phase1start).toFixed(3) + "\n" +
    "Phase 2 (phi(x,y))             : " + (BENCH_phase3start - BENCH_phase2start).toFixed(3) + "\n" +
    "Phase 3 (scale by R(f))        : " + (BENCH_phase4start - BENCH_phase3start).toFixed(3) + "\n" +
    "Phase 4 (sum)                  : " + (BENCH_phase5start - BENCH_phase4start).toFixed(3) + "\n" +
    "Phase 5 (print canvas)         : " + (BENCH_phaseAllDone - BENCH_phase5start).toFixed(3)  + "\n" +
    "\n" +
    "Over All                       : " + (BENCH_phaseAllDone - BENCH_phase1start).toFixed(3)
    
    console.log(PrintString)
}


/*
console.log("start")
let worker_temp = new Worker("OwOrker_plot.js")
worker_temp.postMessage({ f:"(x^2 + y^2)^0.5" , w:31 , h:31 , Xmin:-2 , Xmax:2 , Ymin:-2 , Ymax:2 })
worker_temp.onmessage = (event) =>
{
    let temp_printString = ""

    for(let i = 0 ; i < event.data.length ; i++)
    {
        for(let j = 0 ; j < event.data[i].length ; j++)
        {
            temp_printString += event.data[i][j].toFixed(3) + " , "
        }
        temp_printString += "\n"
    }
    console.log(temp_printString)
}
*/

console.log("start")
field_ResMode.value = "1000,sin(4 * pi * x) * sin(5 * pi * y) - sin(5 * pi * x) * sin(4 * pi * y)\n1008,cos(3 * pi * x) * cos(4 * pi * y) - cos(4 * pi * x) * cos(3 * pi * y)"
GLOBAL_freq = 1000
POwO_PLOT_Phase1()