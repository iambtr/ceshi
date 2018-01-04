const {hexToNum,getDataHex,numToFixHex,getAllHex}= require('./lib')
/*
*类 用于处理串口实际收发buffer
*   init 传入hex返回对象
*   init 传入对象返回hex
**/
class CanBuffer{
    constructor(){
        this.opt={
            head:'ffcc',
            type:'ee',
            id:'11111111',
            data:'01',
            len:8,
            ch:0,
            format:1,
            remoteType:0
        }
        return this
    }

    canPrase(hexStr){
        this.opt['head']=hexStr.slice(0,4)
        this.opt['type']=hexStr.slice(8,10)
        this.opt['id']=hexStr.slice(10,18)
        this.opt['len']=hexToNum(hexStr.slice(34,36))
        this.opt['data']=hexStr.slice(18,this.opt.len*2+18)
        this.opt['ch']=hexToNum(hexStr.slice(36,38))
        this.opt['format']=hexToNum(hexStr.slice(38,40))
        this.opt['remoteType']=hexToNum(hexStr.slice(40,42))
        return this.opt
    }
    // 返回一个buffer，用来写
    canPackage(obj){
        let resBf=''
        resBf=obj.head+'00'+'11'+obj.type+obj.id+getDataHex(obj.data,obj.len)+numToFixHex(obj.len)+numToFixHex(obj.ch)+numToFixHex(obj.format)+numToFixHex(obj.remoteType)
        return Buffer.from(getAllHex(resBf),'hex')
    }
    init(op){
        if(/string/gi.test(op.constructor)){
            return this.canPrase(op)
        }else{
            for(let x in op){
                this.opt[x]=op[x]
            }
            return this.canPackage(this.opt)
        }
    }
}
module.exports=CanBuffer