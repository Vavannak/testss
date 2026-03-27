const allowedId = 7330654183;

module.exports = {
  command: ["proses"],
  run: async ({ client, message }) => {
    const senderId = parseInt(message.sender?.userId || message.senderId?.userId || message.senderId);
    if (senderId !== allowedId) return;

    const rawText = message.message?.trim();
    const parts = rawText?.split(/\s+/);
    if (!parts || parts.length < 2) {
      return client.sendMessage(message.chatId, {
        message: "❌ Masukkan deskripsi pesanan.\n\nContoh: <code>proses install panel</code>",
        parseMode: "html",
        replyTo: message.id
      });
    }

    parts.shift(); // hapus kata 'proses'
    const deskripsi = parts.join(" ");

    const now = new Date();
    const hari = now.toLocaleDateString("id-ID", { weekday: "long" });
    const tanggal = now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

    const caption = `<blockquote>
⚙️ <b>Pesanan Anda sedang diproses</b>
═══════════════════════════════
📦 <b>Pesanan:</b> <i>${deskripsi}</i>
📆 <b>Tanggal:</b> ${tanggal}
📅 <b>Hari:</b> ${hari}
═══════════════════════════════
Silakan ditunggu, akan segera kami selesaikan.
</blockquote>`;

    await client.sendFile(message.chatId, {
      file: "https://files.catbox.moe/jtnp5t.jpg",
      caption,
      parseMode: "html",
      replyTo: message.id
    });
  }
};