const CanBuffer = require('./canbuffer')
const MCan = require('./mcan')
const { numToFixHex,hexToNum,getBfCheckNumber,getReplyId,getBfCan}= require('./lib')

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
            let resultData = []
            let checkData = []
            let firstCan = ''
            let bufferCanDataArr = getWriteCans(data)
            let mcan = function (reduceOk, canData) {
                if (reduceOk) {
                    let can = new MCan(canData)
                    console.log('读到的can',can)
                    switch (can.canType) {
                        case 'reply':
                            port.removeRegister(id + 'data', mcan)
                            port.removeRegister(id, readReduce)
                            resolve(can.data)
                            break;
                        case 'first':
                            firstCan = can
                            checkData[firstCan.canNow]= firstCan.data
                            break;
                        case 'data':
                            if (firstCan == '') {
                                port.removeRegister(id + 'data', mcan)
                                port.removeRegister(id, readReduce)
                                resolve(can)
                            }
                            console.log(can.canNow,firstCan.total)
                            if (can.canNow == firstCan.total) {
                                resultData[can.canNow-1] = can.data
                                checkData[can.canNow]=can.data
                                console.log(checkData)
                                if (hexToNum(getBfCheckNumber(Buffer.from(checkData.join(''), 'hex'))) == firstCan.checkNum) {
                                    port.removeRegister(id + 'data', mcan)
                                    port.removeRegister(id, readReduce)
                                    resolve(resultData.join(''))
                                }
                            } else {
                                resultData[can.canNow-1] = can.data
                                checkData[can.canNow]=can.data
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
            let resultData = []
            let checkData = []
            let firstCan = ''
            let bufferCanData = new CanBuffer().init(data)
            let mcan = function (reduceOk, canData) {
                if (reduceOk) {
                    let can = new MCan(canData)
                    console.log('读到的can',can)
                    switch (can.canType) {
                        case 'reply':
                            port.removeRegister(id + 'data', mcan)
                            port.removeRegister(id, readReduce)
                            resolve(can.data)
                            break;
                        case 'first':
                            firstCan = can
                            checkData[firstCan.canNow]= firstCan.data
                            break;
                        case 'data':
                            if (firstCan == '') {
                                port.removeRegister(id + 'data', mcan)
                                port.removeRegister(id, readReduce)
                                resolve(can)
                            }
                            console.log(can.canNow,firstCan.total)
                            if (can.canNow == firstCan.total) {
                                resultData[can.canNow-1] = can.data
                                checkData[can.canNow]=can.data
                                console.log(checkData)
                                if (hexToNum(getBfCheckNumber(Buffer.from(checkData.join(''), 'hex'))) == firstCan.checkNum) {
                                    port.removeRegister(id + 'data', mcan)
                                    port.removeRegister(id, readReduce)
                                    resolve(resultData.join(''))
                                }
                            } else {
                                resultData[can.canNow-1] = can.data
                                checkData[can.canNow]=can.data
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
function portReadByReduce(port, id, canParseClass, canParseFn, successcb, failcb,len) {
    len=len||14
    let canParse = new canParseClass(len)
    let readReduce = function (data) {
        canParse[canParseFn](data, endData => {
            successcb(endData, readReduce)
        }, err => {
            failcb(err, readReduce)
        })
    }
    portRead(port, id, readReduce)
}

module.exports={
    portReadByReduce,
    portRead,
    portWriteNoReply,
    portWriteWithReply
}