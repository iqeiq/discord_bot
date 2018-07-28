require('dotenv').config()
const Discord = require('discord.js')
const client = new Discord.Client()

const sp = process.platform === 'win32' ? ';' : ':'
process.env.PATH = `node_modules/ffmpeg-binaries/bin${sp}${process.env.PATH}`

const commands = {
    "!paon": './resource/pao.mp3',
    "!xperia":  './resource/xperia.mp3'
}

const VOLUME = 0.75

let dispatcher = null
function do_paon(voiceChannel, file) {
    cancel_paon()
    voiceChannel.join().then(connection => {
        dispatcher = connection.playFile(file)
        dispatcher.setVolumeLogarithmic(VOLUME)
        dispatcher.on('end', () => {
            voiceChannel.leave()
            dispatcher = null
        });
    }).catch(console.error)
}

function cancel_paon() {
    if (dispatcher) dispatcher.end()
}


client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`)
    client.user.setActivity('象', { type: 'PLAYING' })
});
 
client.on('message', msg => {
    const {content, channel, member, author} = msg;

    function reaction() {
        msg.react("🐘").then(r => {
            setTimeout(()=> { r.remove(client.user) }, 3000);
        }).catch(console.error);
    }
    
    function play(file) {
        if(member && member.voiceChannel) {
            do_paon(member.voiceChannel, file)
        } else {
            msg.reply('You need to join a voice channel first! :elephant:')
        }
    }
    
    function help() {
        let message = Object.keys(commands).join("`, `")
        msg.channel.send(`:elephant: :dash:\n\`${message}\``)
    }
    
    if (author.id === client.user.id) {
        msg.delete(10000)
        return
    }
    if (content === 'ping') {
        msg.reply('pong')
        return
    }
    if (content === '?pao') {
        help(msg)
        return
    }
    if (content === '!cancel') {
        reaction()
        cancel_paon()
        return
    }
    
    let cmd = commands[content.split(" ")[0]]
    if (cmd) {
        reaction()
        play(cmd)
    }
    
});
 
client.login(process.env.TOKEN)
