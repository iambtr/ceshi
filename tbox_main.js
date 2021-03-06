const dh = require('./dhport.js')
const DhPort = dh.DhPort
const CanBuffer = dh.CanBuffer
const MCan = dh.MCan
const ReduceParse = dh.reduce_Parse
const ScanGunParse = dh.ScanGunParse
const getAllHex = dh.getAllHex
const getDataHex = dh.getDataHex
const getFixHex = dh.getFixHex
const hexToNum = dh.hexToNum
const numToFixHex = dh.numToFixHex
const getBfCheckNumber = dh.getBfCheckNumber
const getReplyId = dh.getReplyId
const strToHex = dh.strToHex
const reverseHex = dh.reverseHex
const events = require('events')
const appEventManage = new events.EventEmitter()
const getBfCan = dh.getBfCan
//tbox串口
let portTbox = ''

//扫码枪串口
let portScan = ''
//应用app
const App = new Vue({
    el: '#app',
    data: {
        portList: [],
        v_tBoxCom: '',
        v_tBoxLink: false,
        v_scanCom: '',
        v_scanLink: false,
        v_scanTboxNum: '',
        resultNotify: '测试中输出提示相关',
        warn: false,
        testList1: [{
            name: '测试CAN',
            test: true,
            status: 'ready'//ok fail
        }, {
            name: '测试CLOCK',
            test: true,
            status: 'ready'//ok fail
        }, {
            name: '测试ADC',
            test: true,
            status: 'ready'//ok fail
        }, {
            name: '测试FLASH',
            test: true,
            status: 'ready'//ok fail
        }],
        testList2: [{
            name: '测试FATFS',
            test: true,
            status: 'ready'//ok fail
        }, {
            name: '测试RTC',
            test: true,
            status: 'ready'//ok fail
        }, {
            name: '测试mpu6500',
            test: true,
            status: 'ready'//ok fail
        }]
    },
    created() {
        getPostList()
    },
    methods: {
        createConnect,
        closeConnect,
        createScanConnect,
        closeScanConnect,
        startCheck,
        writeTbox,
        resetTest,
        clickT,
        changeTestItem(item) {
            item.test = !item.test
        },
        alert(str) {
            this.resultNotify = str
            this.warn = false
        },
        error(str) {
            this.resultNotify = str
            this.warn = true
        }
    }
})
// 测试专用
function clickT(){
    let writeCan = {
        id: '002003B9',
        data: 0,
        remoteType: 1
    }
    // ffcc0011eeb903200000000000000000000800010103b0
    portWriteWithReply(portTbox, writeCan, ReduceParse, 'reduceProcess', 2000)
        .then(data => {
            console.log(Buffer.from(data,'hex').toString())
        })
        .catch(err => {
            App.error('tBox自检出现错误输出：' + err)
        })
    setTimeout(()=>{
        portTbox.pEvent.emit('data_proc',Buffer.from('ffaa0111eeb903200100020000000165030800010003fa','hex'))
        portTbox.pEvent.emit('data_proc',Buffer.from('ffaa0111eeb90320010154314d48303148080001000553','hex'))
        portTbox.pEvent.emit('data_proc',Buffer.from('ffaa0111eeb90320010259413831313239080001000530','hex'))
    },80)

}

// 获取串口列表
function getPostList() {
    DhPort.list()
        .then(ports => {
            App.portList = ports
        })
        .catch(err => {
            console.error(err);
        });
}

//根据所选串口与扫描枪建立连接
function createScanConnect() {
    let COM = App.v_scanCom
    if (!COM) {
        alert('请先选择串口')
        return
    }
    if (!portScan || portScan.comName != COM) {
        // 实例化一个串口类
        portScan = new DhPort({
            comName: COM,
            baudRate: 9600,
            autoOpen: false
        });
        // 设置tbox编码
        portReadByReduce(portScan, 'scan', ScanGunParse, 'reduceProcess', data => {
            App.v_scanTboxNum = data.toString()
            App.alert('扫描成功输出：' + data.toString())
        }, err => {
            App.error('扫描失败输出：' + err)
        })
    }

    portScan.open().then(msg => {
        App.v_scanLink = true
        App.alert('扫码枪打开成功输出:' + msg)
    }).catch(err => {
        App.error('扫码枪打开失败输出：' + err)
    })
}

//带触发断开与扫描枪连接
function closeScanConnect() {
    portScan.close()
        .then(function (msg) {
            App.v_scanLink = false
            App.resultNotify = '扫码枪关闭成功输出:' + msg
            App.warn = false
        })
        .catch(function (err) {
            App.resultNotify = '扫码枪关闭失败输出：' + err
            App.warn = true
        });
}

//根据所选串口与tbox板建立连接
function createConnect() {
    let COM = App.v_tBoxCom
    if (!COM) {
        alert('请先选择串口')
        return
    }
    if (!portTbox || portTbox.comName != COM) {
        // 实例化一个串口类
        portTbox = new DhPort({
            comName: COM,
            baudRate: 115200,
            autoOpen: false
        });
    }
    portTbox.open()
        .then(msg => {
            App.v_tBoxLink = true
            App.alert('tBox串口打开成功输出:' + msg)
        })
        .catch(err => {
            App.error('tBox串口打开失败输出：' + err)
        })
}

//带触发断开与vcu板连接
function closeConnect() {
    portTbox.close()
        .then(function (msg) {
            App.v_tBoxLink = false
            App.alert('tBox串口关闭成功输出:' + msg)
        })
        .catch(function (err) {
            App.error('tBox串口关闭失败输出：' + err)
        });
}

// 开始自检
function startCheck() {
    if (!App.v_tBoxLink) {
        alert('请先连接tBox')
        return
    }
    let writeCan = {
        id: '002003C9',
        data: 0,
        remoteType: 1
    }
    portWriteWithReply(portTbox, writeCan, ReduceParse, 'reduceProcess', 2000)
        .then(data => {
            checkSelf(data.canNow)
            App.alert('tBox自检成功')
        })
        .catch(err => {
            App.error('tBox自检出现错误输出：' + err)
        })
}

//写tbox
function writeTbox() {
    let tBoxNo = App.v_scanTboxNum
    if (!App.v_tBoxLink) {
        alert('请先连接tBox')
        return
    }
    if (!tBoxNo) {
        alert('请先扫描tBox编号')
        return
    }
    let writeCan = {
        id: '0020021E',
        data: 'NrWo2yqN',
    }
    //解密
    portWriteNoReply(portTbox, writeCan).catch(err => {
        App.error('解密失败:' + err)
        return
    })
    // 写入tbox
    let can = {
        id: '00200201',
        data:tBoxNo,
        uniqueId:'000001'
    }

    portWriteWithReply(portTbox, can, ReduceParse, 'reduceProcess', 2000)
        .then(data => {
            if (data == '01') {
                App.alert('tBox已经写入,下面重启校验')
//重启
                let can = {
                    id: '00200201',
                    data:0,
                    remoteType:1
                }

                portWriteWithReply(portTbox, can, ReduceParse, 'reduceProcess', 2000)
                    .then(data => {
                        App.alert('tBox重启成功,下面校验')
                        //读取
                        let can = {
                            id: '00200201',
                            data:0,
                            remoteType:1
                        }

                        portWriteWithReply(portTbox, can, ReduceParse, 'reduceProcess', 2000)
                            .then(data => {
                                //读取tbox编号比较
                                let tboxReadNum=Buffer.from(data,'hex').toString()
                                if(tboxReadNum==tBoxNo){
                                    App.alert('tBox已经写入并校验成功')
                                }else {
                                    App.error('tBox写入校验失败:读取的tBox编号' + Buffer.from(data,'hex').toString())
                                }

                            })
                            .catch(err => {
                                App.error('tBox写入失败:读取tbox编号失败' + err)
                            })
                    })
                    .catch(err => {
                        App.error('tBox写入失败:重启失败' + err)
                    })
            } else {
                App.error('tBox返回：tBox写入失败')
            }
        })
        .catch(err => {
            App.error('tBox写入失败:未写入' + err)
        })

}

//传入14字节的tboxNumber 封装成多个帧对象返回回调
/*
* data 对象包含head,type,data,id,len,ch,format,remoteType
* */
function getWriteCans(data) {
    let canTotal = Math.ceil(data.data.length / 14)
    let lastLen = data.data.length % 14 == 0 ? 8 : (data.data.length % 14 / 2 + 1)
    let cansHeadHexStr = numToFixHex(canTotal) + '00' + data.uniqueId||'000001'
    let conBf = Buffer.concat([Buffer.from(cansHeadHexStr, 'hex'), Buffer.from(data.data, 'hex')])
    let arr = []
    for (let i = 0; i < canTotal + 1; i++) {
        if (i == 0) {
            let writeCan = {
                id: data.id,
                data: numToFixHex(i) + cansHeadHexStr + getBfCheckNumber(conBf, true),
                len: data.len || 8,
                ch: data.ch || 0,
                format: data.format || 1,
                remoteType: data.remoteType || 0
            }
            let bfCanData = new CanBuffer().init(writeCan)
            arr.push(bfCanData)
        } else if (i == canTotal) {
            let writeCan = {
                id: data.id,
                data: numToFixHex(i) + data.data.slice((i - 1) * 14, i * 14),
                len: lastLen,
                ch: data.ch || 0,
                format: data.format || 1,
                remoteType: data.remoteType || 0
            }
            let bfCanData = new CanBuffer().init(writeCan)
            arr.push(bfCanData)
        } else {
            let writeCan = {
                id: data.id,
                data: numToFixHex(i) + data.data.slice((i - 1) * 14, i * 14),
                len: data.len || 8,
                ch: data.ch || 0,
                format: data.format || 1,
                remoteType: data.remoteType || 0
            }
            let bfCanData = new CanBuffer().init(writeCan)
            arr.push(bfCanData)
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
function portWriteWithReply(port, data, canParseClass, canParseFn, timer) {
    let id = data.id
    data = getBfCan(data)
    let replyId = getReplyId(data.id)
    let canParse = new canParseClass()
    let readReduce = function (data) {
        canParse[canParseFn](data, endData => {
            let resCan = new CanBuffer().init(endData.toString('hex'))
            console.log(resCan.id,replyId,resCan.id == replyId)
            if (resCan.id == replyId) {
                port.pEvent.emit(id + 'data', true, resCan.data)
            }
        }, err => {
            port.pEvent.emit(id + 'data', false, err)
        })
    }
    portRead(port, id, readReduce)
    // 分帧
    if (data.data.length > 16) {
        return new Promise((resolve, reject) => {
            let resultData = ''
            let checkData = ''
            let firstCan = ''
            let bufferCanDataArr = getWriteCans(data)
            let mcan = function (reduceOk, canData) {
                if (reduceOk) {
                    let can = new MCan(canData)
                    switch (can.canType) {
                        case 'reply':
                            port.removeRegister(id + 'data', mcan)
                            port.removeRegister(id, readReduce)
                            resolve(can.data)
                            break;
                        case 'first':
                            firstCan = can
                            break;
                        case 'data':
                            if (firstCan == '') {
                                resolve(can)
                            }
                            if (can.canNow == firstCan.total) {
                                resultData += can.data
                                checkData+=resultData
                                console.log(checkData)
                                if (hexToNum(getBfCheckNumber(Buffer.from(checkData, 'hex'))) == firstCan.checkNum) {
                                    port.removeRegister(id + 'data', mcan)
                                    port.removeRegister(id, readReduce)
                                    resolve(resultData)
                                }else {
                                    reject('数据不完整')
                                }
                            } else {
                                resultData += can.data
                            }
                    }
                } else {
                    port.removeRegister(id + 'data', mcan)
                    port.removeRegister(id, readReduce)
                    reject(canData)
                }
            }
            port.pEvent.on(id + 'data', mcan)
            bufferCanDataArr.forEach(item => {
                console.log(item.toString('hex'))
                port.write(item)
                    .catch(err => {
                        port.removeRegister(id + 'data', mcan)
                        port.removeRegister(id, readReduce)
                        reject(err)
                    })
            })
            setTimeout(() => {
                port.removeRegister(id + 'data', mcan)
                port.removeRegister(id, readReduce)
                reject('超时了')
            }, timer)
        })
    } else {
        return new Promise((resolve, reject) => {
            let resultData = ''
            let checkData = ''
            let firstCan = ''
            let bufferCanData = new CanBuffer().init(data)
            let mcan = function (reduceOk, canData) {
                console.log(reduceOk,canData)
                if (reduceOk) {
                    let can = new MCan(canData)
                    console.log(can)
                    switch (can.canType) {
                        case 'reply':
                            port.removeRegister(id + 'data', mcan)
                            port.removeRegister(id, readReduce)
                            resolve(can.data)
                            break;
                        case 'first':
                            firstCan = can
                            checkData += firstCan.data
                            break;
                        case 'data':
                            if (firstCan == '') {
                                port.removeRegister(id + 'data', mcan)
                                port.removeRegister(id, readReduce)
                                resolve(can)
                            }
                            console.log(2,can.canNow,firstCan.total)
                            if (can.canNow == firstCan.total) {
                                resultData += can.data
                                checkData+=resultData
                                console.log(checkData)
                                if (hexToNum(getBfCheckNumber(Buffer.from(checkData, 'hex'))) == firstCan.checkNum) {
                                    port.removeRegister(id + 'data', mcan)
                                    port.removeRegister(id, readReduce)
                                    resolve(resultData)
                                }
                            } else {
                                resultData += can.data
                            }
                    }
                } else {
                    port.removeRegister(id + 'data', mcan)
                    port.removeRegister(id, readReduce)
                    reject(canData)
                }
            }
            port.pEvent.on(id + 'data', mcan)
            console.log(bufferCanData.toString('hex'))
            port.write(bufferCanData)
                .catch(err => {
                    port.removeRegister(id + 'data', mcan)
                    port.removeRegister(id, readReduce)
                    reject(err)
                })
            setTimeout(() => {
                port.removeRegister(id + 'data', mcan)
                port.removeRegister(id, readReduce)
                reject('超时了')
            }, timer)
        })
    }
}

/*
* 串口发数据没有回复 如分帧，只有最后一帧有回复
* 参数
*   port 串口实例化对象    对象
*   data 数据对象  类似帧 没有回复 只写data
* */
function portWriteNoReply(port, data) {
    let id = data.id
    data = getBfCan(data)
    // 分帧
    if (data.data.length > 16) {
        return new Promise((resolve, reject) => {
            let bufferCanDataArr = getWriteCans(data)
            bufferCanDataArr.forEach(item => {
                console.log(item.toString('hex'))
                port.write(item)
                    .catch(err => {
                        reject(err)
                    })
            })
        })
    } else {
        return new Promise((resolve, reject) => {
            let bufferCanData = new CanBuffer().init(data)
            console.log(bufferCanData.toString('hex'))
            port.write(bufferCanData)
                .catch(err => {
                    reject(err)
                })
        })
    }
}

/*
* 注册读的数据 ID要是replay对应的hex
* */
function portRead(port, id, fn) {
    port.register(id)
    port.pEvent.on(id, fn)
}

/*
* 只收数据的串口 如扫码枪
* 参数
*   port 串口实例化对象    对象
*   id 事件对应的ID
*   canParseClass 对读的数据结果处理类    类名
*   canParseFn canParseClass的处理主方法名 字符串
* */
function portReadByReduce(port, id, canParseClass, canParseFn, successcb, failcb) {
    let canParse = new canParseClass()
    let readReduce = function (data) {
        canParse[canParseFn](data, endData => {
            successcb(endData, readReduce)
        }, err => {
            failcb(err, readReduce)
        })
    }
    portRead(port, id, readReduce)
}

// 样式重置
function resetTest() {
    App.testList1 = [{
        name: '测试CAN',
        test: true,
        status: 'ready'//ok fail
    }, {
        name: '测试CLOCK',
        test: true,
        status: 'ready'//ok fail
    }, {
        name: '测试ADC',
        test: true,
        status: 'ready'//ok fail
    }, {
        name: '测试FLASH',
        test: true,
        status: 'ready'//ok fail
    }]
    App.testList2 = [{
        name: '测试FATFS',
        test: true,
        status: 'ready'//ok fail
    }, {
        name: '测试RTC',
        test: true,
        status: 'ready'//ok fail
    }, {
        name: '测试mpu6500',
        test: true,
        status: 'ready'//ok fail
    }]
    App.resultNotify = '自检显示已重置'

}

// 自检视图更新
function checkSelf(number, cb) {
    let checkRes = number.toString(2)
    while (checkRes.length < 8) {
        checkRes = '0' + checkRes
    }

    let canBuf = checkRes[7]
    let clockBuf = checkRes[6]
    let adcBuf = checkRes[5]
    let flashBuf = checkRes[4]
    let fatfsBuf = checkRes[3]
    let rtcBuf = checkRes[2]
    let mpuBuf = checkRes[1]

    App.testList1[0].status = canBuf == 1 ? 'ok' : 'fail'
    App.testList1[1].status = clockBuf == 1 ? 'ok' : 'fail'
    App.testList1[2].status = adcBuf == 1 ? 'ok' : 'fail'
    App.testList1[3].status = flashBuf == 1 ? 'ok' : 'fail'
    App.testList2[0].status = fatfsBuf == 1 ? 'ok' : 'fail'
    App.testList2[1].status = rtcBuf == 1 ? 'ok' : 'fail'
    App.testList2[2].status = mpuBuf == 1 ? 'ok' : 'fail'
}
