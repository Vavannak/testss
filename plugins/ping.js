const os = require("os");
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");
const allowedId = 7330654183;

const botStartTime = Date.now();

function formatBytes(bytes) {
  const sizes = ["B", "KB", "MB", "GB"];
  if (bytes === 0) return "0 B";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

function formatUptime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}j ${m}m ${s}d`;
}

module.exports = {
  command: ["ping", "runtime", "status"],
  run: async ({ client, message }) => {
    const senderId = parseInt(message.sender?.userId || message.senderId?.userId || message.senderId);
    if (senderId !== allowedId) return;

    const start = performance.now();
    await client.sendMessage(message.peerId, {
      message: "📡 Mengecek ping...",
      replyTo: message.id,
    });
    const ping = Math.round(performance.now() - start);

    const usedMemory = os.totalmem() - os.freemem();
    const uptime = formatUptime(Date.now() - botStartTime);
    const cpuInfo = os.cpus();
    const cpuModel = cpuInfo && cpuInfo.length ? cpuInfo[0].model : "Tidak diketahui";
    const cpuUsage = os.loadavg()[0].toFixed(2); // 1 minute avg
    const ramUsage = formatBytes(usedMemory);
    const ramTotal = formatBytes(os.totalmem());

    const pluginPath = path.join(__dirname, "../plugins");
    const pluginCount = fs.existsSync(pluginPath)
      ? fs.readdirSync(pluginPath).filter(f => f.endsWith(".js")).length
      : 0;

    const result = `<blockquote>
<b>🤖 Status Bot</b>
────────────────────
📡 <b>Ping:</b> <code>${ping}ms</code>
⏱️ <b>Runtime:</b> ${uptime}
🧠 <b>CPU:</b> ${cpuModel}
⚙️ <b>CPU Usage:</b> ${cpuUsage}%
🧮 <b>RAM:</b> ${ramUsage} / ${ramTotal}
🧩 <b>Total Plugin:</b> ${pluginCount}
────────────────────
</blockquote>`;

    await client.sendMessage(message.peerId, {
      message: result,
      parseMode: "html",
      replyTo: message.id,
    });
  }
};