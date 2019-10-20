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
                const sp = line[0].split(/\]:\s*/)
                if(sp.length < 2) { return }
                let t = sp[0].split(/\s+/)[0]
                if(sp[1].length == 0) { return }
                let mes = `${t} ${sp[1]}`
                if(mes == prevlog) { return }
                prevlog = mes
                //mes = `${sp[1]}`
                if(/<[^>]+>/.test(mes)) {
                    this.emit('chat', mes)
                } else if(/advancement \[/.test(mes) || /completed the challenge/.test(mes)) {
                    this.emit('chat', `**${mes}**`)
                } else if(/the game/.test(mes)) {
                    this.emit('chat', `**${mes}**`)
                } else if(dm.some((v)=> v.test(mes))) {
                    this.emit('chat', `**${mes}**`)
                } else if(/Starting remote control listener/.test(mes)) {
                    this.emit('notify', "restart")
                } else {
                    console.log(mes)
                }
            })
        })
    }

    command(cmd, cb) {
        exec(`/home/ilil/mc.sh command ${cmd}`, (err, stdout, stderr)=> {
            if(err) { console.error(err); return }
            if(stderr) { console.error(stderr); return }
            const line = stdout.toString().split(/\r*\n/)
            if(line.length < 2) { return }
            line.splice(0, 1)
            const result = line
                .map(l => l.split(/]:\s*/))
                .filter(s => s.length > 0)
                .map(s => s.length > 1 ? s[1] : s[0])
                .join('\n');
            if(result.length == 0) { return }
            if(cb) { cb(result) }
        })
    }

    list(cb) {
        this.command('list', (str)=> {
            const sp = str.split(/:\s*/)
            if(sp.length > 1 && sp[1].length > 0) { return cb(sp[1]) }
            cb('daremo inai yo...')
        })
    }

    say(message) {
        this.command(`say ${message}`)
    }

    mc_command(cmd, cb) {
        exec(`/home/ilil/mc.sh ${cmd}`, (err, stdout, stderr)=> {
            if(err) { console.error(err); cb('err'); return }
            if(stderr) { console.error(stderr); cb('stderr'); return }
            cb(stdout)
        })
    }

    restart(cb) {
        this.mc_command('restart', (_) => {
            if(_ == 'err' || _ == 'stderr') return cb(_)
            cb('done')
        })
    }
}

module.exports = McLogWatcher