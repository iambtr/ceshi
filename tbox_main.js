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
let portTbox=''

//扫码枪串口
let portScan=''
//应用app
const App=new Vue({
    el:'#app',
    data:{
        portList:[],
        v_tBoxCom:'',
        v_tBoxLink:false,
        v_scanCom:'',
        v_scanLink:false,
        v_scanTboxNum:'',
        resultNotify:'测试中输出提示相关',
        warn:false,
        testList1:[{
            name:'测试CAN',
            test:true,
            status:'ready'//ok fail
        },{
            name:'测试CLOCK',
            test:true,
            status:'ready'//ok fail
        },{
            name:'测试ADC',
            test:true,
            status:'ready'//ok fail
        },{
            name:'测试FLASH',
            test:true,
            status:'ready'//ok fail
        }],
        testList2:[{
            name:'测试FATFS',
            test:true,
            status:'ready'//ok fail
        },{
            name:'测试RTC',
            test:true,
            status:'ready'//ok fail
        },{
            name:'测试mpu6500',
            test:true,
            status:'ready'//ok fail
        }]
    },
    created(){
        getPostList()
    },
    methods:{
        createConnect,
        closeConnect,
        createScanConnect,
        closeScanConnect,
        startCheck,
        writeTbox,
        resetTest,
        changeTestItem(item){
            item.test=!item.test
        },

    }
})
// 获取串口列表
function getPostList() {
    DhPort.list()
        .then(ports=>{
            App.portList=ports
        })
        .catch(err=> {
            console.error(err);
        });
}
//根据所选串口与扫描枪建立连接
function createScanConnect(){
    let COM=App.v_scanCom
    if(!COM){
        App.resultNotify = '请先选择串口'
        App.warn = true
        return
    }
    if(!portScan||portScan.comName!=COM){
        // 实例化一个串口类
        portScan = new DhPort({
            comName: COM,
            baudRate: 9600,
            autoOpen: false
        });
        // 设置tbox编码
        portRead(portScan,ScanGunParse,'reduceProcess')
            .then(data=>{
                App.v_scanTboxNum = data.toString()
                App.resultNotify = '扫描成功输出：'+data.toString()
                App.warn = false
            })
            .catch(err=>{
                App.resultNotify = '扫描失败输出：'+err
                App.warn = true
            })
    }

    portScan.open().then(msg=>{
        App.v_scanLink = true
        App.resultNotify = '扫码枪打开成功输出:'+msg
        App.warn = false
    }).catch(err=>{
        App.resultNotify = '扫码枪打开失败输出：'+err
        App.warn = true
    })
}
//带触发断开与扫描枪连接
function closeScanConnect() {
    portScan.close()
        .then(function (msg) {
            App.v_scanLink = false
            App.resultNotify = '扫码枪关闭成功输出:'+msg
            App.warn = false
        })
        .catch(function (err) {
            App.resultNotify = '扫码枪关闭失败输出：'+err
            App.warn = true
        });
}

//根据所选串口与tbox板建立连接
function createConnect(){
    let COM=App.v_tBoxCom
    if(!COM){
        App.resultNotify = '请先选择串口'
        App.warn = true
        return
    }
    if(!portTbox||portTbox.comName!=COM){
        // 实例化一个串口类
        portTbox = new DhPort({
            comName: COM,
            baudRate: 115200,
            autoOpen: false
        });
    }
    portTbox.open()
        .then(msg=>{
            App.v_tBoxLink = true
            App.resultNotify = 'tBox串口打开成功输出:'+msg
            App.warn = false
        })
        .catch(err=>{
            App.resultNotify = 'tBox串口打开失败输出：'+err
            App.warn = true
        })
}
//带触发断开与vcu板连接
function closeConnect() {
    portTbox.close()
        .then(function (msg) {
            App.v_tBoxLink = false
            App.resultNotify = 'tBox串口关闭成功输出:'+msg
            App.warn = false
        })
        .catch(function (err) {
            App.resultNotify = 'tBox串口关闭失败输出：'+err
            App.warn = true
        });
}
// 开始自检
function startCheck() {
    if(!App.v_tBoxLink){
        App.resultNotify = '请先连接tBox'
        App.warn = true
        return
    }
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
            App.resultNotify = 'tBox自检成功'
            App.warn = false
        })
        .catch(err=>{
            App.resultNotify = 'tBox自检出现错误输出：'+err
            App.warn = true
        })
}
//写tbox
function writeTbox() {
    let tBoxNo=App.v_scanTboxNum
    if(!tBoxNo){
        App.resultNotify = '请先扫描tBox编号'
        App.warn = true
        return
    }
    let writeCan = {
        head: 'ffcc',
        type: 'ee',
        id: '1e022000',
        data: strToHex('NrWo2yqN'),
        len: 8,
        ch: 0,
        format: 1,
        remoteType: 0
    }
    //解密
    portWriteNoReply(portTbox, writeCan).catch(err => {
        App.resultNotify = '解密失败:'+err
        App.warn = true
        return
    })
    // 写入tbox
    let can = {
        head: 'ffcc',
        type: 'ee',
        id: '01022000',
        len: 8,
        ch: 0,
        format: 1,
        remoteType: 0
    }
    let tBoxCans = getWriteCans(tBoxNo, '0200000001', can)
    //第一帧
    portWriteNoReply(portTbox, tBoxCans[0]).catch(err => {
        App.resultNotify = '第1帧写入失败:'+err
        App.warn = true
        return
    })
    //第2帧
    portWriteNoReply(portTbox, tBoxCans[1]).catch(err => {
        App.resultNotify = '第2帧写入失败:'+err
        App.warn = true
        return
    })
    //第3帧
    portWriteWithReply(portTbox, tBoxCans[2], ReduceParse, 'reduceProcess', 1000)
        .then(data => {
            if (hexToNum(data) == 1) {
                App.resultNotify = 'tBox写入成功'
                App.warn = false
            }
        })
        .catch(err => {
            App.resultNotify = 'tBox写入失败:'+err
            App.warn = true
        })
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
// 样式重置
function resetTest() {
    App.testList1=[{
        name:'测试CAN',
        test:true,
        status:'ready'//ok fail
    },{
        name:'测试CLOCK',
        test:true,
        status:'ready'//ok fail
    },{
        name:'测试ADC',
        test:true,
        status:'ready'//ok fail
    },{
        name:'测试FLASH',
        test:true,
        status:'ready'//ok fail
    }]
    App.testList2=[{
        name:'测试FATFS',
        test:true,
        status:'ready'//ok fail
    },{
        name:'测试RTC',
        test:true,
        status:'ready'//ok fail
    },{
        name:'测试mpu6500',
        test:true,
        status:'ready'//ok fail
    }]
    App.resultNotify='自检显示已重置'

}
// 自检视图更新
function checkSelf(number,cb) {
    let checkRes=number.toString(2)
    while(checkRes.length<8){
        checkRes='0'+checkRes
    }

    let canBuf   = checkRes[7]
    let clockBuf = checkRes[6]
    let adcBuf   = checkRes[5]
    let flashBuf = checkRes[4]
    let fatfsBuf = checkRes[3]
    let rtcBuf   = checkRes[2]
    let mpuBuf   = checkRes[1]

    App.testList1[0].status= canBuf==1?'ok':'fail'
    App.testList1[1].status= clockBuf==1?'ok':'fail'
    App.testList1[2].status= adcBuf==1?'ok':'fail'
    App.testList1[3].status= flashBuf==1?'ok':'fail'
    App.testList2[0].status= fatfsBuf==1?'ok':'fail'
    App.testList2[1].status= rtcBuf==1?'ok':'fail'
    App.testList2[2].status= mpuBuf==1?'ok':'fail'
}
