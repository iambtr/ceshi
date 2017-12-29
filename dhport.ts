const SerialPort = require("serialport");              //串口
const events = require("events");                  //事件
const StateMachine = require('javascript-state-machine');//有限状态机
/*
* 帧对象 就是数据 用来数据包装和返回
* 三种情况 回复帧 开头帧 数据帧
*
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
    * 00 回复帧或者首帧
    *   00 回复
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
            for(x in op){
                this.opt[x]=op[x]
            }
            return this.canPackage(this.opt)
        }
    }
}
/*
* 类串口
*   收发数据的串口
*
* */
class DhPort {
    constructor(option) {
        this.life = false
        this.pEvent = new events.EventEmitter()
        this.port = ''
        this.comName = option.comName
        this.baudRate = option.baudRate
        this.autoOpen = option.autoOpen || false
        this.init()
        return this
    }
    static list() {
        return new Promise((resolve, reject) => {
            SerialPort.list(function (err, ports) {
                if (!err) {
                    resolve(ports)
                } else {
                    reject(err)
                }
            });
        })
    }
    init() {
        this.port = new SerialPort(this.comName, {baudRate: this.baudRate, autoOpen: this.autoOpen});

        this.port.on('error', err=>{
            this.pEvent.emit("port_error", err);
        });
    }
    open() {
        return new Promise((resolve, reject) => {
            this.port.open(err => {
                if (!err) {
                    let msg = `已连接：${this.comName}，波特率：${this.baudRate}`;
                    //接收开始
                    if (!this.life) {
                        this.port.on('data', data=> {
                            this.pEvent.emit("data_proc", data);
                        });
                        this.life = !this.life
                    }
                    resolve(msg)
                } else {
                    reject('打开串口错误：' + err.message)
                }
            })
        })
    }

    //关闭串口
    close() {
        return new Promise((resolve, reject) => {
            this.port.close(err => {
                if (!err) {
                    let msg = `已关闭：${this.comName}，波特率：${this.baudRate}`;
                    resolve(msg)
                } else {
                    reject('关闭串口错误:' + err.message)
                }
            })
        })
    }

    write(data) {
        return new Promise((resolve, reject)=> {
            this.port.write(data, err=> {
                if (err) {
                    reject('Error on write:' + err.message)
                } else {
                    resolve('write success')
                }
            });
        })
    }

    register(id) {
        this.pEvent.on('data_proc', data=> {
            this.pEvent.emit(id,data)
        })
    }
    removeRegister(id,fn){
        this.pEvent.removeListener(id,fn)
    }
}


//精简帧解析 返回一个buffer
class reduce_Parse {
    fsm: any; //状态机

    use_data_len: any;
    use_data: any; //解析完成的数据
    use_data_cnt: any;

    use_data_sum: any;
    use_data_sum_array: Uint8Array;
    use_sum: any;

    isframe_ok: any;
    last_time: any;

    constructor() {
        //状态机
        this.fsm = new StateMachine({
            init: 'FF',
            transitions: [
                {name: 'aa', from: 'FF', to: 'AA'},
                {name: 'len1', from: 'AA', to: 'LEN1'},
                {name: 'len2', from: 'LEN1', to: 'LEN2'},
                {name: 'data', from: 'LEN2', to: 'DATA'},
                {name: 'sum1', from: 'DATA', to: 'SUM1'},
                {name: 'sum2', from: 'SUM1', to: 'SUM2'},
                {name: 'ff', from: ['FF', 'AA', 'LEN1', 'LEN2', 'DATA', 'SUM1', 'SUM2'], to: 'FF'}
            ]
        });

        this.use_data_len = 0;//收到说明数据字节数
        this.use_data =Buffer.alloc(23);
        this.use_data_cnt = 0;

        this.use_data_sum = 0;
        this.use_data_sum_array = Buffer.alloc(2);

        this.use_sum = 0;
        this.isframe_ok = false;
        this.last_time = 0;
    }

    reduceProcess(buff,successCallBack,failCallBack) {
        //检查超时
        this.check_timer(failCallBack);
        for (var i = 0; i < buff.length; i++) {
            var chr = buff[i];
            switch (this.fsm.state) {
                case 'FF':
                    if (chr == 0XFF) {
                        this.use_data[0]=chr
                        this.fsm.aa();
                    }
                    else {
                        this.clear();
                    }
                    break;
                case 'AA':
                    if (chr == 0XAA) {
                        this.use_data[1]=chr
                        this.fsm.len1();
                    }
                    else {
                        this.clear();
                    }
                    break;
                case 'LEN1':
                    if(chr==0x01){
                        //收到回复
                        this.use_data[2]=chr
                        this.fsm.len2();
                    }
                    break;
                case 'LEN2':
                    this.use_data_len = this.use_data[3]=chr;
                    //创建一个数据个数的缓冲区，自动初始化为全0
                    this.fsm.data();
                    break;
                case 'DATA':
                    if (this.use_data_cnt < this.use_data_len) {
                        this.use_data[this.use_data_cnt+4] = chr;
                        this.use_data_cnt++;
                    }
                    if (this.use_data_cnt == this.use_data_len) {
                        this.fsm.sum1();
                    }
                    break;

                case 'SUM1':
                    this.use_data[this.use_data_len+4] = chr;
                    this.fsm.sum2();
                    break;

                case 'SUM2':
                    this.use_data[this.use_data_len+5] = chr;
                    this.use_sum = this.use_data.readUInt16BE(this.use_data.length-2,2);

                    var temp_sum = 0;
                    for (var j = 0; j < this.use_data.length-2; j++){
                        temp_sum += this.use_data[j];
                    }
                    console.log('校验位',this.use_sum,temp_sum)
                    if (temp_sum == this.use_sum){
                        successCallBack&&successCallBack(this.use_data);
                    }else{
                        failCallBack&&failCallBack('校验位不对')
                    }
                    this.clear();
                    break;
            }
        }
    }


    clear() {
        this.fsm.ff();
        this.constructor();
    }

    check_timer(failCallBack) {
        if (this.last_time == 0)
            this.last_time = new Date().getTime();
        else {
            var now_time = new Date().getTime();
            if (now_time - this.last_time > 5 * 1000) {
                this.clear();
                failCallBack&&failCallBack('数据超时')
            }
            else {
                this.last_time = now_time;
            }
        }
    }
}
// 扫描枪真解析 返回一个buffer len期待返回长度 timer超时
class ScanGunParse{
    constructor(){
        this.timer=5000
        this.len=14
        this.result=''
        this.lastTime=0
        return this
    }
    reduceProcess(buffer,successCallBack,failCallBack){
        this.checkTimer(failCallBack)
        let str=buffer.toString()
        this.result=this.result+str
        if(this.result.length>=this.len){
            successCallBack(Buffer.from(this.result.slice(0,this.len)))
            this.reset();
        }
    }
    checkTimer(failCallBack){
        if (this.lastTime == 0)
            this.lastTime = Date.now();
        else {
            let nowTime =  Date.now();
            if (nowTime - this.lastTime > this.timer) {
                this.reset();
                failCallBack&&failCallBack('数据超时')

            }
            else {
                this.lastTime = nowTime;
            }
        }
    }
    reset(){
        this.result=''
        this.lastTime=0
    }

}

//数字转hex字符  如  0 =>00
function numToFixHex(num){
    let str=num.toString(16)
    return str.length%2==0?str:'0'+str
}
//hexStr 计算校验位后返回完整的 hexStr
function getAllHex(strHex){
    let bf=Buffer.from(strHex,'hex')
    let sum=0
    for(let i=0;i<bf.length;i++){
        sum+=bf[i]
    }
    return strHex+numToFixHex(sum)
}
//hexStr转数字 11=>17
function hexToNum(hexStr){
    return Number('0x'+hexStr)
}
//根据hexStr data 和有效长度 len 封装8字节数据 返回hexStr
function getDataHex(data,len){
    let str=''
    while (str.length<len*2-data.length){
        str='0'+str
    }
    str=str+data
    while (str.length<16){
        str=str+'0'
    }
    return str
}
/*
* 自动补零
* 字节长度 int
* 数字或者hexStr的数据
* */
function getFixHex(len,data){
    let hexStr=''
    if(/string/gi.test(data)){
        hexStr=hexStr+data
    }else {
        hexStr=hexStr+numToFixHex(data)
    }
    while (hexStr.length<len*2){
        hexStr=hexStr+'0'
    }
    return hexStr
}
//获取bf的验证位 默认大端  le true 小端
function getBfCheckNumber(bf,le) {
    let hexStr=0
    let bfe=''
    let bf2=''
    for(let i=0;i<bf.length;i++){
        hexStr=hexStr+bf[i]
    }
    bf2=Buffer.from(fixHexStr(hexStr.toString(16)),'hex')
    if(le){
        bfe=bf2.readUIntLE(0,bf2.length).toString(16)
    }else {
        bfe=bf2.readUIntBE(0,bf2.length).toString(16)
    }
    function fixHexStr(str) {
        return str.length%2==0?str:'0'+str
    }
    return fixHexStr(bfe)
}
//根据id      hexStr
//获取回复ID    hexStr
function getReplyId(id){
    let num=hexToNum(id)+1
    let hexStr=numToFixHex(num)
    while (hexStr.length<8){
        hexStr='0'+hexStr
    }
    return hexStr
}
//根据字符或者数字串获取hex数据
function strToHex(str,len){
    if(/number/gi.test(str.constructor)){
        str=Buffer.from(numToFixHex(str),'hex').toString()
    }
    if(len){
        let hex =Buffer.from(str).toString('hex')
        while (hex.length<len*2){
            hex=hex+'0'
        }
        return hex
    }else {
        return Buffer.from(str).toString('hex')
    }
}
//传入hexId 返回buffer里面翻转的idHex
function reverseHex(id){
    let bfId=[]
    for(let i=0;i<id.length/2;i++){
        bfId.unshift(id.slice(i*2,i*2+2))
    }
    return bfId.join('')
}
function getBfCan(can){
    can.data=strToHex(can.data)
    can.id=reverseHex(can.id)
    return can
}
module.exports={
    DhPort,
    MCan,
    CanBuffer,
    ScanGunParse,
    reduce_Parse,
    numToFixHex,
    getAllHex,
    hexToNum,
    getDataHex,
    getFixHex,
    getBfCheckNumber,
    getReplyId,
    strToHex,
    reverseHex,
    getBfCan
}

//参考资料  ffcc1000010101010101010101010101010101011000 测试数据
//ArrayBuffer对象：代表内存之中的一段二进制数据，它不能直接读写，
//只能通过视图（TypedArray视图和DataView视图)来读写，视图的作用是以指定格式解读二进制数据。