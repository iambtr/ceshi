
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