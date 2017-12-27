const path       = require('path');
const dh = require('./dhport')
const fs         = require('fs');
const async      = require('async');
const events     = require("events");

const DhPort=dh.DhPort
const Can=dh.Can
const ReduceParse=dh.reduce_Parse
const ScanGunParse=dh.ScanGunParse
const getAllHex=dh.getAllHex
const getDataHex=dh.getDataHex
const getFixHex=dh.getFixHex
const hexToNum=dh.hexToNum
const numToFixHex=dh.numToFixHex
const getBfCheckNumber=dh.getBfCheckNumber
const getReplyId=dh.getReplyId
const strToHex=dh.strToHex
const viewEvents=new events.EventEmitter()

//tbox串口
var portTbox=''
var reduceParse=''

//扫码枪串口
var portScan=''
var portScanParse=''
// 视图相关：
//tbox串口
var serial   = document.getElementById('port');
var baudrate = document.getElementById('baudrate');
var button_connect    = document.getElementById('connect');
var button_disconnect = document.getElementById('disconnect');
var button_writeTbox    = document.getElementById('writeTbox');
var button_startCheck = document.getElementById('update')
//扫码枪串口
var serialScan = document.getElementById('portScan');
var button_connectScan    = document.getElementById('connectScan');
var button_disconnectScan = document.getElementById('disconnectScan');

button_disconnect.disabled = true;
button_disconnectScan.disabled = true;

const App=new Vue({
    el:'app',
    data:{
        portList:[],
        v_tBoxCom:'',
        v_tBoxLink:false,
        v_scanCom:'',
        v_scanLink:false,
    },
    create(){
        DhPort.list()
            .then(ports=>{
                this.portList=ports
            })
            .catch(err=> {
                console.error(err);
            });
    },
    methods:{
        ale(){
            alert(this.)
        }
    }
})
app()
function app() {
    portList()//串口列表

    button_connect.onclick    = createConnect;//tbox连接
    button_disconnect.onclick = closeConnect;//tbox断开

    button_connectScan.onclick    = createScanConnect;//扫描枪连接
    button_disconnectScan.onclick = closeScanConnect;//扫码枪断开

    button_startCheck.onclick = startCheck;//tbox自检
    button_writeTbox.onclick = writeTbox;//写入tbox
}
//根据所选串口与扫描枪建立连接
function createScanConnect(){
    button_connectScan.disabled = true;
    if(!portScan||portScan.comName!=serialScan.value){
        // 实例化一个串口类
        portScan = new DhPort({
            comName: serialScan.value,
            baudRate: 9600,
            autoOpen: false
        });
        // 设置tbox编码
        portRead(portScan,ScanGunParse,'reduceProcess')
            .then(data=>{
                document.getElementById('vcusn').value = data.toString()
            })
            .catch(err=>{
                document.getElementById('vcusn').value = err
            })
    }

    portScan.open().then(msg=>{
        console.log('扫码枪：'+msg)
        button_connectScan.setAttribute("class", "btn-gary btn")
        button_disconnectScan.setAttribute("class", "btn-blue btn")
        button_disconnectScan.disabled = false;
    }).catch(err=>{
            console.log('扫码枪：'+err)
        button_connectScan.disabled = false;
        button_connectScan.setAttribute("class", "btn-blue btn")
        button_disconnectScan.setAttribute("class", "btn-gary btn")
    })
}
//带触发断开与扫描枪连接
function closeScanConnect() {
    button_disconnectScan.disabled = true;
    portScan.close()
        .then(function (msg) {
            console.log('扫码枪：'+msg);
            button_disconnectScan.setAttribute("class", "btn-gary btn")
            button_connectScan.setAttribute("class", "btn-blue btn")
            button_connectScan.disabled = false;
        })
        .catch(function (err) {
            console.log('扫码枪：'+err);
            button_disconnectScan.disabled = false;
            button_connectScan.disabled = true;
        });
}

//根据所选串口与tbox板建立连接
function createConnect(){
    button_connect.disabled = true;
    if(!portTbox||portTbox.comName!=serial.value){
        // 实例化一个串口类
        portTbox = new DhPort({
            comName: serial.value,
            baudRate: 115200,
            autoOpen: false
        });
    }
    portTbox.open()
        .then(msg=>{
            console.log('tbox：'+msg)
            button_connect.setAttribute("class", "btn-gary btn")
            button_disconnect.setAttribute("class", "btn-blue btn")
            button_disconnect.disabled = false;
        })
        .catch(err=>{
            console.error('tbox：'+err)
            button_connect.disabled = false;
            button_disconnect.setAttribute("class", "btn-gary btn")
            button_connect.setAttribute("class", "btn-blue btn")
        })
}
//带触发断开与vcu板连接
function closeConnect() {
    button_disconnect.disabled = true;
    portTbox.close()
        .then(function (msg) {
            console.log('tbox：'+msg);
            button_disconnect.setAttribute("class", "btn-gary btn")
            button_connect.setAttribute("class", "btn-blue btn")
            button_connect.disabled = false;
        })
        .catch(function (err) {
            console.log('tbox：'+err);
            button_disconnect.disabled = false;
            button_connect.disabled = true;
            button_disconnect.setAttribute("class", "btn-blue btn")
            button_connect.setAttribute("class", "btn-gary btn")
        });
}
// 开始自检
function startCheck() {
    styleInit()
    let writeCan={
        head:'ffcc',
        type:'ee',
        id:'c9032000',
        data:'00',
        len:8,
        ch:0,
        format:1,
        remoteType:1
    }
    portWriteWithReply(portTbox,writeCan,ReduceParse,'reduceProcess',1000)
        .then(data=>{
            checkSelf(hexToNum(data.slice(0,2)))
        })
        .catch(err=>{
            button_startCheck.innerHTML=err
        })
}
//写tbox
function writeTbox() {
    let tBoxNo=document.getElementById('vcusn').value
    if(tBoxNo.length!=14){
        button_writeTbox.innerHTML = "请先扫描二维码";
        setTimeout(()=>{
            button_writeTbox.innerHTML = "写入tBox编号";
        },1500)
    }else {
        let writeCan={
            head:'ffcc',
            type:'ee',
            id:'1e022000',
            data:strToHex('NrWo2yqN'),
            len:8,
            ch:0,
            format:1,
            remoteType:0
        }
        //解密
        portWriteNoReply(portTbox,writeCan).catch(err=>{
            console.error('解密失败')
        })
        // 写入tbox
        let can={
            head:'ffcc',
            type:'ee',
            id:'01022000',
            len:8,
            ch:0,
            format:1,
            remoteType:0
        }
        let tBoxCans=getWriteCans(tBoxNo,'0200000001',can)
        //第一帧
        portWriteNoReply(portTbox,tBoxCans[0]).catch(err=>{
            console.error('第1帧写入失败')
        })
        //第2帧
        portWriteNoReply(portTbox,tBoxCans[1]).catch(err=>{
            console.error('第2帧写入失败')
        })
        //第3帧
        portWriteWithReply(portTbox,tBoxCans[2],ReduceParse,'reduceProcess',1000)
            .then(data=>{
                if(hexToNum(data)==1){
                    button_writeTbox.innerHTML='写入成功'
                }
            })
            .catch(err=>{
                button_writeTbox.innerHTML=err
            })
    }
}
//传入14字节的tboxNumber 封装成多个帧对象返回回调
/*
* str:要写入的 字符 如tbox编码
* cansHead：分帧拼接的头hex 写tbox是0200000001
* can 对象包含head,type,id,len,ch,format,remoteType
* */
function getWriteCans(str,cansHead,can) {
    let cansHeadHexStr=cansHead
    let conBf=Buffer.concat([Buffer.from(cansHeadHexStr,'hex'),Buffer.from(str)])
    let arr=[]
    for(let i=0;i<str.length/7+1;i++){
        if(i==0){
            let writeCan={
                head:can.head||'ffcc',
                type:can.type||'ee',
                id:can.id,
                data:numToFixHex(i)+cansHeadHexStr+getBfCheckNumber(conBf,true),
                len:can.len||8,
                ch:can.ch||0,
                format:can.format||1,
                remoteType:can.remoteType||0
            }
            arr.push(writeCan)
        }else {
            let writeCan={
                head:can.head||'ffcc',
                type:can.type||'ee',
                id:can.id,
                data:numToFixHex(i)+Buffer.from(str.slice((i-1)*7,i*7)).toString('hex'),
                len:can.len||8,
                ch:can.ch||0,
                format:can.format||1,
                remoteType:can.remoteType||0
            }
            arr.push(writeCan)
        }
    }
    return arr
}
/*
* 串口发数据有回复 如分帧最后一帧 自检
* 参数
*   port 串口实例化对象    对象
*   data 数据对象  类似帧
*   canParseClass 对读的数据结果处理类    类名
*   canParseFn canParseClass的处理主方法名 字符串
*   timer 期待回复的超时时间
* */
function portWriteWithReply(port,data,canParseClass,canParseFn,timer){
    return new Promise((resolve,reject)=>{
        let canParse=new canParseClass()
        let replyId=getReplyId(data.id)
        let canData=new Can().init(data)
        let writeOption={
            data:canData,
            canParseObj:canParse,
            analyse:canParse[canParseFn],
            timer:timer
        }
        port.write(writeOption)
            .then(resData=>{
                let resCan=new Can().init(resData.toString('hex'))
                console.log('收到：'+resData.toString('hex'))
                if(resCan.id==replyId){
                    resolve(resCan.data)
                }
            })
            .catch(err=>{
                reject(err)
            })
    })

}
/*
* 串口发数据没有回复 如分帧，只有最后一帧有回复
* 参数
*   port 串口实例化对象    对象
*   data 数据对象  类似帧 没有回复 只写data
* */
function portWriteNoReply(port,data){
    return new Promise((resolve,reject)=>{
        let canData=new Can().init(data)
        let writeOption={
            data:canData
        }
        port.write(writeOption)
            .then(resData=>{
               resolve(resData)
            })
            .catch(err=>{
                reject(err)
            })
    })
}
/*
* 只收数据的串口 如扫码枪
* 参数
*   port 串口实例化对象    对象
*   canParseClass 对读的数据结果处理类    类名
*   canParseFn canParseClass的处理主方法名 字符串
* */
function portRead(port,canParseClass,canParseFn){
    return new Promise((resolve,reject)=>{
        let canParse=new canParseClass()
        port.read((data)=>{
            canParse[canParseFn](data,endData=>{
                resolve(endData)
            },err=>{
                reject(err)
            })
        })
    })
}
// ************************************************
function portList() {
    // 串口初始化
    DhPort.list()
        .then(function (ports) {
            let str = "";
            ports.forEach(function(port) {
                var option = document.createElement("option");
                option.text = port.comName + "  " + port.locationId;
                option.value = port.comName;

                str += "\<option value=" + port.comName +  "\>" + port.comName + "\<\/option\>"
                console.log(port)
            });
            serial.innerHTML = str;
            serialScan.innerHTML = str;
        })
        .catch(function (err) {
            console.error(err);
        });
}
// 样式重置
function styleInit() {
    var can     = document.getElementById('can');
    var clock   = document.getElementById('clock');
    var adc     = document.getElementById('adc');
    var flash   = document.getElementById('flash');
    var fatfs   = document.getElementById('fatfs');
    var rtc     = document.getElementById('rtc');
    var mpu6500 = document.getElementById('mpu');
    var setSn   = document.getElementById('setSn');

    can.innerHTML = "测试";
    can.setAttribute("class", "span1");
    clock.innerHTML = "测试";
    clock.setAttribute("class", "span1");
    adc.innerHTML = "测试";
    adc.setAttribute("class", "span1");
    flash.innerHTML = "测试";
    flash.setAttribute("class", "span1");
    fatfs.innerHTML = "测试";
    fatfs.setAttribute("class", "span1");
    rtc.innerHTML = "测试";
    rtc.setAttribute("class", "span1");
    mpu6500.innerHTML = "测试";
    mpu6500.setAttribute("class", "span1");
    setSn.innerHTML = "未设置";
    setSn.setAttribute("class", "span1");
    button_writeTbox.innerHTML = "写入tBox编号";
}
// 自检视图更新
function checkSelf(number,cb) {
    let checkRes=number.toString(2)
    while(checkRes.length<8){
        checkRes='0'+checkRes
    }

    var canBuf   = checkRes[7]
    var clockBuf = checkRes[6]
    var adcBuf   = checkRes[5]
    var flashBuf = checkRes[4]
    var fatfsBuf = checkRes[3]
    var rtcBuf   = checkRes[2]
    var mpuBuf   = checkRes[1]

    var can   = document.getElementById('can');
    var clock = document.getElementById('clock');
    var adc   = document.getElementById('adc');
    var flash = document.getElementById('flash');
    var fatfs = document.getElementById('fatfs');
    var rtc   = document.getElementById('rtc');
    var mpu   = document.getElementById('mpu');

    if (canBuf == 1)
    {
        can.innerHTML = "正常";
        can.setAttribute("class", "greey-color span1");
    }
    else
    {
        can.innerHTML = "异常";
        can.setAttribute("class", "red-color span1");
    }
    if (clockBuf == 1)
    {
        clock.innerHTML = "正常";
        clock.setAttribute("class", "greey-color span1");
    }
    else
    {
        clock.innerHTML = "异常";
        clock.setAttribute("class", "red-color span1");
    }
    if (adcBuf == 1)
    {
        adc.innerHTML = "正常";
        adc.setAttribute("class", "greey-color span1");
    }
    else
    {
        adc.innerHTML = "异常";
        adc.setAttribute("class", "red-color span1");
    }
    if (flashBuf == 1)
    {
        flash.innerHTML = "正常";
        flash.setAttribute("class", "greey-color span1");
    }
    else
    {
        flash.innerHTML = "异常";
        flash.setAttribute("class", "red-color span1");
    }
    if (fatfsBuf == 1)
    {
        fatfs.innerHTML = "正常";
        fatfs.setAttribute("class", "greey-color span1");
    }
    else
    {
        fatfs.innerHTML = "异常";
        fatfs.setAttribute("class", "red-color span1");
    }
    rtc.innerHTML = "正常";
    rtc.setAttribute("class", "greey-color span1");
    // if (rtcBuf == 1)
    // {
    //     rtc.innerHTML = "正常";
    //     rtc.setAttribute("class", "greey-color span1");
    // }
    // else
    // {
    //     rtc.innerHTML = "异常";
    //     rtc.setAttribute("class", "red-color span1");
    // }
    mpu.innerHTML = "正常";
    mpu.setAttribute("class", "greey-color span1");
    // if (mpuBuf == 1)
    // {
    //     mpu.innerHTML = "正常";
    //     mpu.setAttribute("class", "greey-color span1");
    // }
    // else
    // {
    //     mpu.innerHTML = "异常";
    //     mpu.setAttribute("class", "red-color span1");
    // }
    cb&&cb()
}
