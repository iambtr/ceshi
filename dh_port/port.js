const SerialPort = require("serialport");              //串口
const events = require("events");                  //事件
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
            console.log('底层',data.toString('hex'))
            this.pEvent.emit(id,data)
        })
    }
    removeRegister(id,fn){
        this.pEvent.removeListener(id,fn)
    }
}

module.exports=DhPort