const fs = require("fs");
const path = require("path");
const axios = require("axios");

const allowedId = 7330654183;

module.exports = {
  command: ["subfinder"],
  run: async ({ client, message, args, reply }) => {
    const senderId = parseInt(message.sender?.userId || message.senderId?.userId || message.senderId);
    if (senderId !== allowedId) return;

    // Safe fallback kalau args tidak tersedia
    let domain;
    if (args && args.length > 0) {
      domain = args[0].toLowerCase();
    } else if (message.message) {
      const parts = message.message.trim().split(/\s+/);
      domain = parts[1]?.toLowerCase(); // Ambil argumen setelah command
    }

    if (!domain) {
      return reply("Contoh penggunaan:\nsubfinder example.com");
    }

    const filename = `subfinder-${domain}.txt`;
    const filepath = path.join(__dirname, "..", "temp", filename);

    try {
      const res = await axios.get(`https://crt.sh/?q=%25.${domain}&output=json`);
      const raw = res.data;

      const subdomains = new Set();

      raw.forEach(entry => {
        const name = entry.name_value;
        name.split("\n").forEach(n => {
          if (n.endsWith(domain)) subdomains.add(n.trim());
        });
      });

      const list = [...subdomains];
      if (list.length === 0) {
        return reply(`Tidak ditemukan subdomain untuk ${domain}`);
      }

      fs.mkdirSync(path.dirname(filepath), { recursive: true });
      fs.writeFileSync(filepath, list.join("\n"));

      await client.sendFile(message.chatId || message.peerId, {
        file: filepath,
        caption: `🔍 Ditemukan ${list.length} subdomain dari: ${domain}`,
      });

      fs.unlinkSync(filepath);
    } catch (err) {
      console.error(err);
      reply("❌ Terjadi kesalahan saat mengambil data subdomain.");
    }
  }
};