const axios = require("axios");

const allowedId = 7330654183;

module.exports = {
  command: ["githubstalk"],
  run: async ({ client, message }) => {
    const senderId = parseInt(message.sender?.userId || message.senderId?.userId || message.senderId);
    if (senderId !== allowedId) return;

    const rawText = message.message?.trim();
    const parts = rawText?.split(/\s+/);
    if (!parts || parts.length < 2) {
      return client.sendMessage(message.chatId, {
        message: "❌ Masukkan username GitHub.\n\nContoh: <code>githubstalk torvalds</code>",
        parseMode: "html",
        replyTo: message.id
      });
    }

    const username = parts[1];

    try {
      const res = await axios.post(
        "https://api.siputzx.my.id/api/stalk/github",
        { user: username },
        { headers: { "Content-Type": "application/json" } }
      );

      const data = res.data;
      if (!data.status) {
        return client.sendMessage(message.chatId, {
          message: "❌ Pengguna tidak ditemukan atau terjadi kesalahan.",
          replyTo: message.id
        });
      }

      const p = data.data;
      const createdAt = new Date(p.created_at).toLocaleDateString("id-ID", {
        day: "numeric", month: "long", year: "numeric"
      });

      const caption = `<blockquote>
🐙 <b>GitHub Profile</b>
────────────────────
👤 <b>Username:</b> ${p.username}
📝 <b>Nama:</b> ${p.nickname || 'N/A'}
📄 <b>Bio:</b> ${p.bio || 'N/A'}
🏢 <b>Perusahaan:</b> ${p.company || 'N/A'}
🔗 <b>Blog:</b> ${p.blog || 'N/A'}
📍 <b>Lokasi:</b> ${p.location || 'N/A'}
📧 <b>Email:</b> ${p.email || 'N/A'}
📦 <b>Repos Publik:</b> ${p.public_repo}
🧾 <b>Gist Publik:</b> ${p.public_gists}
👥 <b>Followers:</b> ${p.followers}
👣 <b>Following:</b> ${p.following}
🆔 <b>ID:</b> ${p.id}
📆 <b>Dibuat:</b> ${createdAt}
🔗 <a href="${p.url}">Lihat Profil GitHub</a>
────────────────────
</blockquote>`;

      await client.sendFile(message.chatId, {
        file: p.profile_pic,
        caption,
        parseMode: "html",
        replyTo: message.id
      });

    } catch (err) {
      console.error(err);
      return client.sendMessage(message.chatId, {
        message: "❌ Gagal mengambil data dari GitHub API.",
        replyTo: message.id
      });
    }
  }
};