const axios = require("axios");
const dns = require("dns").promises;

const allowedId = 7330654183;

module.exports = {
  command: ["trackip"],
  run: async ({ client, message, args, reply }) => {
    const senderId = parseInt(message.sender?.userId || message.senderId?.userId || message.senderId);
    if (senderId !== allowedId) return;

    let ip;
    if (args && args.length > 0) {
      ip = args[0];
    } else if (message.message) {
      const parts = message.message.trim().split(/\s+/);
      ip = parts[1];
    }

    if (!ip) {
      return reply("❌ Mohon masukkan IP address.\nContoh: trackip 8.8.8.8");
    }

    try {
      const response = await axios.get(`http://ip-api.com/json/${ip}`);
      const data = response.data;

      if (data.status === "success") {
        let hostnames = [];
        try {
          hostnames = await dns.reverse(ip);
        } catch {
          hostnames = ["Hostname tidak ditemukan"];
        }
        const hostname = hostnames[0] || "Hostname tidak ditemukan";
        const mapsLink = `https://www.google.com/maps/search/?api=1&query=${data.lat},${data.lon}`;

        const info = [
          "Informasi IP Address",
          "----------------------",
          `IP        : ${data.query}`,
          `Hostname  : ${hostname}`,
          `Negara    : ${data.country}`,
          `Kota      : ${data.city}`,
          `Zona Waktu: ${data.timezone}`,
          `Latitude  : ${data.lat}`,
          `Longitude : ${data.lon}`,
          `ISP       : ${data.isp}`,
          "",
          `Lihat di Google Maps:\n${mapsLink}`
        ].join("\n");

        await reply("```" + info + "```");
      } else {
        await reply("❌ IP tidak valid atau tidak ditemukan.");
      }
    } catch (err) {
      console.error(err);
      await reply("❌ Terjadi kesalahan saat melacak IP.");
    }
  }
};