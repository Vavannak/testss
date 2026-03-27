const axios = require("axios");
const allowedId = 7330654183;

module.exports = {
  command: ["ttstalk", "tiktokstalk"],
  run: async ({ client, message }) => {
    const senderId = parseInt(message.sender?.userId || message.senderId?.userId || message.senderId);
    if (senderId !== allowedId) return;

    const rawText = message.message?.trim();
    const parts = rawText?.split(/\s+/);
    if (!parts || parts.length < 2) {
      return client.sendMessage(message.chatId, {
        message: "❌ Masukkan username TikTok!\nContoh: <code>ttstalk mrbeast</code>",
        parseMode: "html",
        replyTo: message.id
      });
    }

    const username = parts[1];

    try {
      const { data } = await axios.post("https://api.siputzx.my.id/api/stalk/tiktok", { username });

      if (!data.status) {
        return client.sendMessage(message.chatId, {
          message: "❌ Gagal mengambil data TikTok.",
          replyTo: message.id
        });
      }

      const user = data.data.user;
      const stats = data.data.stats;

      const caption = `<blockquote>
👤 <b>${user.nickname}</b> (@${user.uniqueId})
🆔 <b>ID:</b> <code>${user.id}</code>
${user.verified ? "✅ <b>Terverifikasi</b>" : "❌ <b>Belum Verifikasi</b>"}
📍 <b>Wilayah:</b> ${user.region}
📝 <b>Bio:</b> ${user.signature || "-"}
📆 <b>Dibuat:</b> ${new Date(user.createTime * 1000).toLocaleDateString("id-ID")}

📊 <b>Statistik TikTok</b>
👥 <b>Followers:</b> ${stats.followerCount.toLocaleString()}
👣 <b>Following:</b> ${stats.followingCount.toLocaleString()}
❤️ <b>Likes:</b> ${stats.heart.toLocaleString()}
🎞️ <b>Video:</b> ${stats.videoCount.toLocaleString()}
👫 <b>Teman:</b> ${stats.friendCount.toLocaleString()}
</blockquote>`;

      await client.sendFile(message.chatId, {
        file: user.avatarLarger,
        caption,
        parseMode: "html",
        replyTo: message.id
      });

    } catch (err) {
      console.error(err);
      return client.sendMessage(message.chatId, {
        message: "🚫 Terjadi kesalahan saat mengambil data.",
        replyTo: message.id
      });
    }
  }
};