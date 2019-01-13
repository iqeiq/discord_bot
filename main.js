require('dotenv').config()
const Discord = require('discord.js')
const { VoiceText } = require('voice-text')

// win用にパス通す
const sp = process.platform === 'win32' ? ';' : ':'
process.env.PATH = `node_modules/ffmpeg-binaries/bin${sp}${process.env.PATH}`

// 各種クライアント
const client = new Discord.Client()
const voiceText = new VoiceText(process.env.VOICETEXT_TOKEN)

// 定数たち
const soundCommands = {
    "!paon": './resource/pao.mp3',
    "!xperia":  './resource/xperia.mp3'
}
const VoiceTable = ['hikari', 'haruka', 'takeru', 'santa', 'bear', 'show']
const VOLUME = 0.75

// お便利
function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

// -----

function joinAndLeave(voiceChannel, openListener) {
    voiceChannel.join()
        .then(conn => openListener(conn, ()=> voiceChannel.leave()))
        .catch(console.error)
}

const { createPlayer, cancelPlayerAll } = (() => {
    let cancelers = [];
    const createPlayer = (factory) => {
        let dispatcher = null
        const canceler = () => {
            if (dispatcher) dispatcher.end()
        }
        cancelers.push(canceler)
        const player = (voiceChannel, extra) => {
            canceler()
            joinAndLeave(voiceChannel, (conn, done)=> {
                dispatcher = factory(conn, extra)
                dispatcher.setVolumeLogarithmic(VOLUME)
                dispatcher.on('end', () => {
                    dispatcher = null
                    done();
                });
            })
        }
        return player
    }
    const cancelPlayerAll = () => cancelers.forEach((cancel) => cancel())
    return {createPlayer, cancelPlayerAll}
})();

function voiceTextStream(text) {
    return voiceText.stream(text, { format: 'ogg', speaker: randomChoice(VoiceTable) })
}

const do_paon = createPlayer((conn, file) => conn.playFile(file))
const talk = createPlayer((conn, text) => conn.playStream(voiceTextStream(text)))

// 象する
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`)
    client.user.setActivity('象', { type: 'PLAYING' })
});
 
// 象メイン
client.on('message', msg => {
    const {content, channel, member, author} = msg;

    function reaction() {
        msg.react("🐘").then(r => {
            setTimeout(()=> { r.remove(client.user) }, 3000);
        }).catch(console.error);
    }
    
    function play(player, extra) {
        if(member && member.voiceChannel) {
            player(member.voiceChannel, extra)
        } else {
            msg.reply('You need to join a voice channel first! :elephant:')
        }
    }
    
    // 揮発性メッセージ君
    if (author.id === client.user.id) {
        msg.delete(10000)
        return
    }

    if (content === 'ping') {
        reaction()
        return
    }
    if (content === '?pao') {
        let arr = Object.keys(soundCommands)
        arr.join('!talk (text)')
        let message = arr.join("`, `")
        msg.channel.send(`:elephant: :dash:\n\`${message}\``)
        return
    }
    if (content === '!cancel') {
        reaction()
        cancelPlayerAll()
        return
    }

    const first = content.split(" ")[0]
    let rest = content.split(" ")
    rest.splice(0, 1)
    
    // しゃべる
    if(first === "!talk") {
        reaction()
        play(talk, rest.join(" "))
        return
    }
    
    // 音再生
    let cmd = soundCommands[first]
    if (cmd) {
        reaction()
        play(do_paon, cmd)
    }
    
});
 
client.login(process.env.DISCORD_TOKEN)
