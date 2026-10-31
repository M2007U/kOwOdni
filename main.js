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
const field_ResAccept = POwO_docgetel("field_ResAccept")

const field_plotXmin = POwO_docgetel("field_plotXmin")
const field_plotXmax = POwO_docgetel("field_plotXmax")
const field_plotYmin = POwO_docgetel("field_plotYmin")
const field_plotYmax = POwO_docgetel("field_plotYmax")
const field_plotZheight = POwO_docgetel("field_plotZheight")

const field_color_R = POwO_docgetel("field_color_R")
const field_color_G = POwO_docgetel("field_color_G")
const field_color_B = POwO_docgetel("field_color_B")



//setup
var GLOBAL_Res = [] //an array of numbers
var GLOBAL_Res_AcceptanceRadius = 32 //what is the radius that a mode can accept a frequency ? eg : say a mode resoFreq = 3000, if the radius is 16, then 3000-16 or 3000+16 can excite the mode
var GLOBAL_Mode = [] //an array of strings, strings are Math functions
var GLOBAL_freq = 0

//runtime render
var GLOBAL_workers = []
var GLOBAL_plate = []
var GLOBAL_flagDone = []

//runtime view
var GLOBAL_plotXmin = -1
var GLOBAL_plotXmax = 1
var GLOBAL_plotYmin = -1
var GLOBAL_plotYmax = 1
var GLOBAL_sliceHeight = 0.05 //the whole 3D shape is plot, how thin should the slice we see be ?

//visuals
var GLOBAL_color_R = 255
var GLOBAL_color_G = 255
var GLOBAL_color_B = 255

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
    //draw the shape functions
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
        GLOBAL_workers[i].postMessage({f:GLOBAL_Mode[i] , w:canvas.width , h:canvas.height , Xmin:GLOBAL_plotXmin, Xmax:GLOBAL_plotXmax, Ymin:GLOBAL_plotYmin, Ymax:GLOBAL_plotYmax})
        
        //when done
        GLOBAL_workers[i].onmessage = (event) =>
        {
            GLOBAL_plate[i] = new Float64Array(event.data) //put the result in the plate
            GLOBAL_flagDone[i] = true
            POwO_FreqChangeDrawCanvas() //request to goto nest phase
        }
        
    }
}

function POwO_FreqChangeDrawCanvas()
{
    //check if current frequency excites modes
    //multiply everything by Reso
    //now GLOBAL_plate has every shape function stand by
    console.log("Phase 3 trigger")

    //vibe check, if all the workers are done
    if ( !POwO_Bool_ArrayAND(GLOBAL_flagDone) ){console.log("Phase 3 wait") ; return}

    //add everything
    let temp_SumArray = new Float64Array( canvas.width * canvas.height )
    for(let i = 0 ; i < GLOBAL_Res.length ; i++)
    {
        let ResoResult = POwO_Math_Reso(GLOBAL_freq , GLOBAL_Res[i] ,GLOBAL_Res_AcceptanceRadius)

        if (ResoResult > 0)
        {
            for(let j = 0 ; j < temp_SumArray.length ; j ++)
            {
                temp_SumArray[j] += GLOBAL_plate[i][j] * ResoResult
            }
        }
    }



    //draw on canvas
    let ImageData = ctx.createImageData(canvas.width, canvas.height);
    for(let y = 0 ; y < canvas.height ; y++) //for every row
    {
        for(let x = 0 ; x < canvas.width ; x++) //for every column
        {
            let PixelIndex = ( y * canvas.width + x ) * 4
            let giveTransparency = 0

            if ( Math.abs(temp_SumArray[y * canvas.width + x]) < GLOBAL_sliceHeight )
            {
                giveTransparency = 255
            }
            else
            {
                giveTransparency = 0
            }

            ImageData.data[PixelIndex + 0] = GLOBAL_color_R
            ImageData.data[PixelIndex + 1] = GLOBAL_color_G
            ImageData.data[PixelIndex + 2] = GLOBAL_color_B
            ImageData.data[PixelIndex + 3] = giveTransparency
        }
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(ImageData, 0, 0);



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
field_ResMode.value = "1000,abs(sin(2 * pi * x) * sin(3 * pi * y) - sin(3 * pi * x) * sin(2 * pi * y))*0.5\n1008,abs(cos(2 * pi * x) * cos(1 * pi * y) + cos(1 * pi * x) * cos(2 * pi * y))*(-0.5)"

//field_ResMode.value = "1000,sin(2 * pi * x) * sin(3 * pi * y) - sin(3 * pi * x) * sin(2 * pi * y)"
//field_ResMode.value = "1000,cos(2 * pi * x) * cos(1 * pi * y) + cos(1 * pi * x) * cos(2 * pi * y)"
GLOBAL_freq = 1007
POwO_PLOT_Phase1()



field_ResMode.addEventListener("change", (event) => {
    POwO_PLOT_Phase1();
});

field_ResAccept.addEventListener("change", (event) => {
    GLOBAL_Res_AcceptanceRadius = Number( field_ResAccept.value )
    POwO_FreqChangeDrawCanvas()
});



field_plotXmin.addEventListener("change", (event) => {
    GLOBAL_plotXmin = Number(field_plotXmin.value)
    POwO_PLOT_Phase1();
})

field_plotXmax.addEventListener("change", (event) => {
    GLOBAL_plotXmax = Number(field_plotXmax.value)
    POwO_PLOT_Phase1();
})

field_plotYmin.addEventListener("change", (event) => {
    GLOBAL_plotYmin = Number(field_plotYmin.value)
    POwO_PLOT_Phase1();
})

field_plotYmax.addEventListener("change", (event) => {
    GLOBAL_plotYmax = Number(field_plotYmax.value)
    POwO_PLOT_Phase1();
})



field_plotZheight.addEventListener("change" , (event) => {
    GLOBAL_sliceHeight = Number(field_plotZheight.value)
    POwO_FreqChangeDrawCanvas()
})

field_color_R.addEventListener("change" , (event) => {
    GLOBAL_color_R = Number(field_color_R.value)
    POwO_FreqChangeDrawCanvas()
})

field_color_G.addEventListener("change" , (event) => {
    GLOBAL_color_G = Number(field_color_G.value)
    POwO_FreqChangeDrawCanvas()
})

field_color_B.addEventListener("change" , (event) => {
    GLOBAL_color_B = Number(field_color_B.value)
    POwO_FreqChangeDrawCanvas()
})

window.addEventListener("message", (event) =>
{
    GLOBAL_freq = Number(event.data);
    POwO_FreqChangeDrawCanvas();
});

const field_SettingsRow = POwO_docgetel("field_SettingsRow")
const field_ShowCanvas = POwO_docgetel("field_showCanvas")
canvas.addEventListener("click" , (event) => {
    canvas.style.display = "none"
    field_SettingsRow.style.display = "flex"
})
field_ShowCanvas.addEventListener("click" , (event) => {
    canvas.style.display = "block"
    field_SettingsRow.style.display = "none"
} )
//default
canvas.style.display = "block"
field_SettingsRow.style.display = "none"