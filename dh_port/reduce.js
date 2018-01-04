const StateMachine = require('javascript-state-machine');//有限状态机
//精简帧解析 返回一个buffer
class ReduceParse {
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
        this.init()
        return this
    }
    init(){
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
        console.log('buffer来的数据',buff.toString('hex'))
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
                    }else {
                        this.clear();
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
        this.fsm.ff()
        this.init()
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
// 特定的字符串长度帧解析  len 长度
class ForLenStrParse{
    constructor(len){
        this.timer=5000
        this.len=len
        this.result=''
        this.checkTimer=''
        return this
    }
    reduceProcess(buffer,successCallBack,failCallBack){
        this.checkTime(failCallBack)
        let str=buffer.toString()
        this.result=this.result+str
        if(this.result.length>=this.len){
            clearTimeout(this.checkTimer)
            successCallBack(Buffer.from(this.result.slice(0,this.len)))
            this.reset();
        }
    }
    checkTime(failCallBack){
        clearTimeout(this.checkTimer)
        this.checkTimer= setTimeout(()=>{
            this.reset();
            failCallBack && failCallBack('数据超时')
        },this.timer)
    }
    reset(){
        this.result=''
    }

}
module.exports={ReduceParse,ForLenStrParse}