const {hexToNum,reverseHex}= require('./lib')
/*
* 帧对象 就是数据 用来数据包装和返回
* 三种情况 回复帧 开头帧 数据帧
* canHexStr 就是canBuffer的data字段 hexStr
* */
class MCan{
    constructor(canHexStr){
        this.canType=''
        this.total=''
        this.canNow=''
        this.msgType=''
        this.id=''
        this.data=''
        this.hex=''
        this.init(canHexStr)
        return this
    }
    /*
    * 00 回复帧或者首帧 第一个字节
    *   00 回复        第二个字节
    *   其他首帧
    * 非00
    *   数据帧
    * */
    init(canHexStr){
        switch (canHexStr.slice(0, 2)) {
            case '00':
                if(canHexStr.slice(2,4)=='00'){
                    this.setReplyCan(canHexStr)
                }else {
                    this.setFirstCan(canHexStr)
                }
                break;
            default:
                this.setDataCan(canHexStr)
        }
    }
    /*
    * canType  first data reply
    * */
    setFirstCan(op){
        this.canType='first'
        this.total=hexToNum(op.slice(2,4))
        this.canNow=hexToNum(op.slice(0,2))
        this.msgType=hexToNum(op.slice(4,6))
        this.id=op.slice(6,12)
        this.checkNum=hexToNum(reverseHex(op.slice(12)))
        this.data=op.slice(2,12)
        this.hex=op
        return this
    }
    setDataCan(op){
        this.canType='data'
        this.canNow=hexToNum(op.slice(0,2))
        this.data=op.slice(2)
        this.hex=op
        return this
    }
    setReplyCan(op){
        this.canType='reply'
        this.msgType=hexToNum(op.slice(4,6))
        this.id=op.slice(6,12)
        this.data=op.slice(12)
        this.hex=op
        return this
    }
}
module.exports=MCan