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
  command: ["methods"],
  run: async ({ client, message, reply }) => {
    if (parseInt(message.senderId) !== allowedId) return;

    const user = await client.getEntity(message.senderId);
    const username = user.username ? `@${user.username}` : "";
    const fullName = user.firstName + (user.lastName ? ` ${user.lastName}` : "");
    const mention = username || fullName;
    const userId = user.id;
    const runtime = formatRuntime(performance.now() - botStartTime);

    const caption = `<blockquote>
    
.floodv2
.http2-flood
.browser
.killnet
.h2f3
.h2-robz
.h2-flash
.h2
.robz-priv
.h2-x
.mix
.h2-rob
.h2-flood
.h2-robzx

</blockquote>`;

    await client.sendFile(message.chatId, {
      caption: caption,
      parseMode: "html",
      replyTo: message.id,
    });
  },
};