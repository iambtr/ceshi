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
//tbox串口
var portTbox=''
var reduceParse=''
var serial   = document.getElementById('port');
var baudrate = document.getElementById('baudrate');
var button_connect    = document.getElementById('connect');
var button_disconnect = document.getElementById('disconnect');
var button_writeTbox    = document.getElementById('writeTbox');

//扫码枪串口
var portScan=''
var portScanParse=''
var serialScan = document.getElementById('portScan');
var button_connectScan    = document.getElementById('connectScan');
var button_disconnectScan = document.getElementById('disconnectScan');

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

button_connect.onclick    = createConnect;
button_disconnect.onclick = closeConnect;

button_connectScan.onclick    = createScanConnect;
button_disconnectScan.onclick = closeScanConnect;

document.getElementById('update').onclick = startCheck;
button_writeTbox.onclick = writeTbox;

button_disconnect.disabled = true;
button_disconnectScan.disabled = true;

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
        portScanParse=new ScanGunParse(14,2)
        // 设置tbox编码
        portScan.readByCanAnalyse(portScanParse,portScanParse.reduceProcess,data=>{
            document.getElementById('vcusn').value = data.toString()
        },err=>{
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
        reduceParse=new ReduceParse()
        portTbox.readByCanAnalyse(reduceParse,reduceParse.reduceProcess,data=>{
            let resCan=new Can().init(data.toString('hex'))
            console.log('收到：'+data.toString('hex'))
            if(resCan.id=='c9032001'){
                // 自检返回
                checkSelf(hexToNum(resCan.data.slice(0,2)))
            }else if(resCan.id=='01022001'){
                // 写入tbox编号返回
                console.log(hexToNum(resCan.data))
                if(hexToNum(resCan.data)==1){
                    button_writeTbox.innerHTML = "写入成功";
                    let setSn=document.getElementById('setSn')
                    setSn.innerHTML = "写入成功";
                    setSn.setAttribute("class", "greey-color span1");
                }
            }else if(resCan.id==13173536){

            }

        },err=>{
            document.getElementById('vcusn').value = err
        })
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
// 开始自检
function startCheck() {
    styleInit()
    let writeCan=new Can().init({
        head:'ffcc',
        type:'ee',
        id:'c9032000',
        data:'00',
        len:8,
        ch:0,
        format:1,
        remoteType:1
    })
    portTbox.write(writeCan)
        .then(function (msg) {
            console.log(msg);
        }).catch(function (err) {
            console.error(err);
    });
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

//写tbox
function writeTbox(tboxStr) {
    let tBoxNo=document.getElementById('vcusn').value
    if(tBoxNo.length!=14){
        button_writeTbox.innerHTML = "请先扫描二维码";
        setTimeout(()=>{
            button_writeTbox.innerHTML = "写入tBox编号";
        },1500)
    }else {
        let writeCan=new Can().init({
            head:'ffcc',
            type:'ee',
            id:'1e022000',
            data:Buffer.from('NrWo2yqN').toString('hex'),
            len:8,
            ch:0,
            format:1,
            remoteType:0
        })
        console.log(writeCan.toString('hex'))
        portTbox.write(writeCan)
            .then(function (msg) {
                console.log('密码'+msg);

                button_writeTbox.innerHTML = "正在写入编号";
                setTimeout(()=>{
                    writeCans(tBoxNo,(bfc)=>{
                    console.log('写入：'+bfc.toString('hex'))
                        portTbox.write(bfc)
                            .then(function (msg) {
                                console.log('写入帧'+msg);
                            }).catch(function (err) {
                            console.error(err);
                        });
                    })
                },500)
            }).catch(function (err) {
            console.error(err);
        });
    }
}
//传入14字节的tboxNumber 封装成多个帧对象返回回调
function writeCans(str,callBack) {
    let cansHeadHexStr='0200000001'
    let conBf=Buffer.concat([Buffer.from(cansHeadHexStr,'hex'),Buffer.from(str)])
    for(let i=0;i<str.length/7+1;i++){
        if(i==0){
            let writeCan=new Can().init({
                head:'ffcc',
                type:'ee',
                id:'01022000',
                data:numToFixHex(i)+cansHeadHexStr+getBfCheckNumber(conBf,true),
                len:8,
                ch:0,
                format:1,
                remoteType:0
            })
            callBack&&callBack(writeCan)
        }else {
            let writeCan=new Can().init({
                head:'ffcc',
                type:'ee',
                id:'01022000',
                data:numToFixHex(i)+Buffer.from(str.slice((i-1)*7,i*7)).toString('hex'),
                len:8,
                ch:0,
                format:1,
                remoteType:0
            })
            callBack&&callBack(writeCan)
        }
    }
}

