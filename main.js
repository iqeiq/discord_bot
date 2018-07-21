require('dotenv').config()
const Discord = require('discord.js');
const client = new Discord.Client();

const sp = process.platform === 'win32' ? ';' : ':'

process.env.PATH = `node_modules/ffmpeg-binaries/bin${sp}${process.env.PATH}`;

let dispatcher = null;
function do_paon(voiceChannel) {
    if (dispatcher) dispatcher.end();
    voiceChannel.join().then(connection => {
        dispatcher = connection.playFile('./resource/pao.mp3');
        dispatcher.on('end', () => {
            voiceChannel.leave();
            dispatcher = null;
        });
    }).catch(console.error);
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});
 
client.on('message', msg => {
    let content = msg.content;
    let member = msg.member;
    if (content === 'ping') {
        msg.reply('pong');
    } 
    if (content === '!paon') {
        if(member && member.voiceChannel) {
            do_paon(member.voiceChannel);
        } else {
          msg.reply('You need to join a voice channel first!');
        }
    }
});
 
client.login(process.env.TOKEN);
