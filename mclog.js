const fs = require('fs')
const {EventEmitter} = require('events')
const {exec} = require('child_process')
const dm = require('./deathmessages')

const LOGFILE = "/home/ilil/minecraft/logs/latest.log"

class McLogWatcher extends EventEmitter {
    constructor() {
        super()
    }

    start() {
        let prevlog = "" 
        const watcher = fs.watch(LOGFILE, (event)=> {
            if(event == 'rename') {
                console.log("logfile was renamed");
                process.exit(0);
                return
            }
            if(event != 'change') { return }
            exec(`tail -n 1 ${LOGFILE}`, (err, stdout, stderr)=> {
                if(err) { console.error(err); return }
                if(stderr) { console.error(stderr); return }
                const line = stdout.toString().split(/\r*\n/)
                if(line.length == 0) { return }
                const sp = line[0].split(/]:\s*/)
                if(sp.length < 2) { return }
                let t = sp[0].split(/\s+/)[0]
                if(sp[1].length == 0) { return }
                let mes = `${t} ${sp[1]}`
                if(mes == prevlog) { return }
                prevlog = mes
                //mes = `${sp[1]}`
                if(/<[^>]+>/.test(mes)) {
                    this.emit('chat', mes)
                } else if(/advancement/.test(mes)) {
                    this.emit('chat', `**${mes}**`)
                } else if(/the game/.test(mes)) {
                    this.emit('chat', `**${mes}**`)
                } else if(dm.some((v)=> v.test(mes))) {
                    this.emit('chat', `**${mes}**`)
                } else {
                    console.log(mes)
                }
            })
        })
    }
}

module.exports = McLogWatcher