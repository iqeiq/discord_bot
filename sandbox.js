require('dotenv').config()
const Discord = require('discord.js')
const AudioMixer = require('audio-mixer')
const {inspect} = require('util')

// 定数 from .env
const { DISCORD_TOKEN, OWNER_ID } = process.env

// win用にパス通す
const sp = process.platform === 'win32' ? ';' : ':'
process.env.PATH = `node_modules/ffmpeg-binaries/bin${sp}${process.env.PATH}`


// 各種クライアント
const client = new Discord.Client()

// mixer
const mixer = new AudioMixer.Mixer({
    "channels": 2,
    "bitDepth": 16,
    "sampleRate": 48000,
    "clearInterval": 250
})
const mixerInputConfig = {
    "channels": 2,
    "bitDepth": 16,
    "sampleRate": 48000,
    "volume": 100
}
mixer.on("data", (chunk) => {
    console.log(`[mixer] on data: ${chunk.length}`)
    mixer.resume()
})

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

// 象する
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`)
    client.user.setActivity('象', { type: 'WATCHING' })
})
 
// 象メイン
let currentChannel = null
client.on('message', msg => {
    const {content, channel, member, author, guild} = msg

    // 自分のメッセージ
    if (author.id === client.user.id) return

    // 管理者以外を弾く
    //if(author.id !== OWNER_ID) return 

    // コマンド処理
    let [first, ...rest] = content.split(" ")

    // デバッグ用
    if(first === "!paoin") {
        let ch = null
        if(rest.length == 0) {
            ch = findUserVoiceChannel(author.id) // !paoin
        } else {
            ch = findVoiceChannel(rest[0]) // !paoin (チャンネル名)
        }
        if(ch == null) {
            msg.reply(`voiceChannel not found !`)
            return
        }
        currentChannel = ch
        ch.join().then(conn => { conn.play('resource/tin.mp3').on('end', ()=> {
            const receiver = conn.receiver // for 12.x
            //const receiver = conn.createReceiver() // for 11.x
            //let isFirst = true
            conn.play(mixer, {type: 'converted', bitrate: '48'}) // for 12.x
            //conn.playConvertedStream(mixer, {bitrate: '48'}) // for 11.x
                                    
            conn.on("speaking", (user, speaking) => {
                console.log(`[${user.username}] speaking: ${inspect(speaking)}`)
                const input = mixer.input(mixerInputConfig)
                input.on("finish", () => {
					mixer.removeInput(input)
					console.log(`[${user.username}] mixer input: on finish`);
				})
                if (speaking) {
                    const stream = receiver.createStream(user, { mode: 'pcm' }) // for 12.x
                    //const stream = receiver.createPCMStream(user) // for 11.x
                    stream.pipe(input)
                    stream.on("data", () => {
                        console.log(`[${user.username}] PCM stream: on data`)
                    })
                    stream.on("end", () => {
                        stream.unpipe()
                        console.log(`[${user.username}] STREAM END`)
                    })
                    console.log(`[${user.username}] STREAM START`)

                    // 初回だけ実行される
                    /*if(isFirst) {
                        console.log("DISPATCHER")
                        const dispatcher = conn.play(mixer, {type: 'converted', bitrate: '48'}) // for 12.x
                        //const dispatcher = conn.playConvertedStream(mixer, {bitrate: '48'}) // for 11.x
                        isFirst = false
                    }*/
                }
            }) })
        }).catch(console.error)
        return
    }
    if(first === "!damare") {
        if(currentChannel) currentChannel.leave()
        currentChannel = null
        return
    }
})
 
client.login(DISCORD_TOKEN)

process.on('unhandledRejection', console.dir)
process.on('uncaughtException', console.error)
process.on('SIGINT', ()=> {
    console.log("SIGINT")
    if(currentChannel) currentChannel.leave()
    client.destroy()
    process.exit()
})
