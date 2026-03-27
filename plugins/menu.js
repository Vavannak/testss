 /*  
 */
 
const os = require("os");
const { formatSize } = require("../utils/fungsion");
const { performance } = require("perf_hooks");

const totalMem = os.totalmem();
const freeMem = os.freemem();
const usedMem = totalMem - freeMem;
const formattedUsedMem = formatSize(usedMem);
const formattedTotalMem = formatSize(totalMem);

function formatRuntime(ms) {
  let seconds = Math.floor(ms / 1000) % 60;
  let minutes = Math.floor(ms / (1000 * 60)) % 60;
  let hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
  let days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

let botStartTime = performance.now();

// ID kamu
const allowedId = 7330654183;

module.exports = {
  command: ["menu"],
  run: async ({ client, message, reply }) => {
    if (parseInt(message.senderId) !== allowedId) return;

    const user = await client.getEntity(message.senderId);
    const username = user.username ? `@${user.username}` : "";
    const fullName = user.firstName + (user.lastName ? ` ${user.lastName}` : "");
    const mention = username || fullName;
    const userId = user.id;
    const runtime = formatRuntime(performance.now() - botStartTime);

    const caption = `<blockquote>
╔══════════════════════════════════════╗
║   𓆩⚔𓆪   ヤ Uʙᴏᴛ DDOS ヤ  𓆩⚔𓆪       ║
╠══════════════════════════════════════╣
║ ▢ Username: ${mention}          ║
║ ▢ BOT NAMA : Uʙᴏᴛ DDOS        ║
║ ▢ Developer : Robz               ║
║ ▢ 𝖫𝗂𝖻𝗋𝖺𝗋𝗒 : 𝖩𝖺𝗏𝖺𝖲𝖼𝗋𝗂𝗉𝗍            ║
║ ▢ 𝖱𝗎𝗇𝗍𝗂𝗆𝖾 : ${runtime}            ║    
║ ▢ ID Telegram: ${userId}            ║
╚══════════════════════════════════════╝
╔─━━━━━━═⊱ 𝐌͢𝐄͡𝐍͜𝐔 ─━━━━━━━━━═⬣
│▢ gitclone
│▢ scan 
│▢ scan
│▢ gemini
│▢ mediafire
│▢ id
│▢ subfinder
│▢ trackip
│▢ done
│▢ proses
│▢ ttstalk
│▢ status
│▢ reportch
│▢ methods [ddos]
┗═════════════════════════⬣
</blockquote>`;


    await client.sendFile(message.chatId, {
      file: "https://files.catbox.moe/k7f7xi.mp4",
      caption: caption,
      parseMode: "html",
      replyTo: message.id,
    });
  },
};