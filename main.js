require('dotenv').config()
const Discord = require('discord.js')
const async = require('async')
const Rx = require('rx')

const McLogWatcher = require('./mclog')
const watcher = new McLogWatcher()
watcher.start()

// win用にパス通す
const sp = process.platform === 'win32' ? ';' : ':'
process.env.PATH = `node_modules/ffmpeg-binaries/bin${sp}${process.env.PATH}`

// 各種クライアント
const client = new Discord.Client()

// 定数たち
const soundCommands = {
    "!paon": './resource/pao.mp3',
    "!xperia":  './resource/xperia.mp3'
}
const VOLUME = 0.75

// お便利
function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

// 音再生まわり
const { createPlayer, canceler } = (() => {
    // キューにためこむ
    let q = async.queue((task, cb) => { task(cb) }, 1)
    let dispatcher = null
    const canceler = () => {
        // 音がなってたら止める
        if (dispatcher) dispatcher.end()
        // キューを空に
        q.kill()
    }
    // 再生リクエスト関数を作成
    const createPlayer = (factory) => {
        return (voiceChannel, extra, extra2) => {
            // キューに入れて逐次処理
            q.push(cb => {
                // 入室
                voiceChannel.join()
                // 再生
                .then(conn => new Promise(resolve => {
                    dispatcher = factory(conn, extra, extra2)
                    dispatcher.setVolumeLogarithmic(VOLUME)
                    dispatcher.on('end', () => {
                        dispatcher = null
                        resolve()
                    })
                }))
                // 退出
                .then(() => voiceChannel.leave())
                // 処理完了したので, 次のキューを消化
                .then(() => cb())
                .catch(console.error)
            })    
        }
    }
    return { createPlayer, canceler }
})()

function findUserVoiceChannel(id) {
    for (let ch of client.channels.values()) {
        if(ch.type !== 'voice') continue
        if(!ch.members || !ch.members.size) continue
        for (let usr of ch.members.values()) {
            if(usr.id !== id) continue
            return ch
        }
    }
    return null
}

function findVoiceChannel(name) {
    for (let ch of client.channels.values()) {
        if(ch.type !== 'voice') continue
        //if(!ch.members || !ch.members.size) continue
        if(ch.name == name || ch.id == name) return ch
    }
    return null
}

function findTextChannel(name) {
    for (let ch of client.channels.values()) {
        if(ch.type !== 'text') continue
        //if(!ch.members || !ch.members.size) continue
        if(ch.name == name || ch.id == name) return ch
    }
    return null
}

function findUser(guild, name) {
    for (let mem of guild.members.values()) {
        if(mem.user.username == name || mem.user.id == name) return mem
    }
    return null
}

const do_paon = createPlayer((conn, file) => conn.playFile(file))

// 象する
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`)
    client.user.setActivity('象', { type: 'WATCHING' })

    mc_ch = findTextChannel('325296413103882241')
    if(mc_ch == null) {
        console.error("not found minecraft channel")
    } else {
        Rx.Observable
            .fromEvent(watcher, 'chat')
            .buffer(() => Rx.Observable.timer(60 * 1000))
            .where(lines => lines.length > 0)
            .subscribe(lines => {
                mes = lines.join('\n')
                mc_ch.send(mes)
                console.log("[chat]", mes)
            });
        watcher.on('notify', (mes)=> {
            mc_ch.send(`**${mes}**`)
            console.log("[notify]", mes)
        })
    }
})
 
// 象メイン
client.on('message', msg => {
    const {content, channel, member, author, guild} = msg

    // 自分のメッセージ
    if (author.id === client.user.id) {
        //msg.delete(10000)
        return
    }

    function reaction() {
        msg.react("🐘").then(r => {
            setTimeout(()=> { r.remove(client.user) }, 3000)
        }).catch(console.error)
    }

    function play(player, extra, extra2) {
        if(member && member.voiceChannel) {
            player(member.voiceChannel, extra, extra2)
        } else if(author.id === process.env.OWNER_ID && channel.type === 'dm') {
            let ch = findUserVoiceChannel(process.env.OWNER_ID)
            if(ch != null) player(ch, extra, extra2)
            else msg.reply('You need to join a voice channel first! :elephant:')
        } else {
            msg.reply('You need to join a voice channel first! :elephant:')
        }
    }

    // コマンド処理
    let [first, ...rest] = content.split(" ")

    let commands = {}
    // help
    commands["?pao"] = () => { 
        let arr = Object.keys(soundCommands)
        arr.push(...Object.keys(commands))
        let message = arr.join("`, `")
        msg.channel.send(`:elephant: :dash:\n\`${message}\``)
    }
    // 生存確認
    commands["!ping"] = () => {}
    // ヨシ！
    commands["!cancel"] = () => { canceler() }
    
    let command = commands[first]
    if(command) { reaction(); command(); return }

    // デバッグ用
    if(first === "!debug") {
        if(!guild) {
            msg.reply(`guild is null !`)
            return
        }
        if(rest.length == 0) return
        let arr = []
        if(rest[0] == "channels") {
            for (let ch of guild.channels.values()) 
                if(ch.type != "category") arr.push(`${ch.id} ${ch.name} (${ch.type})`)
        } else if(rest[0] == "members") {
            for (let mem of guild.members.values()) 
                arr.push(`${mem.user.id} ${mem.user.username}`)
        } else return
        msg.channel.send(`\`\`\`${arr.join('\n')}\`\`\``)
        return
    }
    if(first === "!join") {
        let ch = null
        if(rest.length == 0) {
            ch = findUserVoiceChannel(author.id)
        } else {
            ch = findVoiceChannel(rest[0])
        }
        if(ch == null) {
            msg.reply(`voiceChannel not found !`)
            return
        }
        ch.join(conn => {

        })
        return
    }
    
    // 音再生
    // let cmd = soundCommands[first]
    // if (cmd) {
    //     let sound = Array.isArray(cmd) ? randomChoice(cmd) : cmd
    //     reaction()
    //     // 他のチャンネルにpaon
    //     if(rest.length) {
    //         let ch = findVoiceChannel(rest.join(" "))
    //         if(ch == null ) msg.reply(`voiceChannel "${rest.join(" ")}" not found !`)
    //         else do_paon(ch, sound)
    //     }
    //     // 自分にpaon
    //     else play(do_paon, sound)
    //     return
    // }

    // 管理者特権
    if(author.id === process.env.OWNER_ID) {
        if(channel.type === 'dm') {
            let ch = findUserVoiceChannel(process.env.OWNER_ID)
            if(ch != null) talk(ch, content)
            else msg.reply('You need to join a voice channel first! :elephant:')
        }
    }

})
 
client.login(process.env.DISCORD_TOKEN)

process.on('unhandledRejection', console.dir)
process.on('uncaughtException', console.error)
