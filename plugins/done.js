const allowedId = 7330654183;

module.exports = {
  command: ["done"],
  run: async ({ client, message }) => {
    const senderId = parseInt(message.sender?.userId || message.senderId?.userId || message.senderId);
    if (senderId !== allowedId) return;

    const rawText = message.message?.trim();
    const parts = rawText?.split(/\s+/);

    if (!parts || parts.length < 3) {
      return client.sendMessage(message.peerId, {
        message: "❌ Masukkan deskripsi pesanan dan total harga.\n\nContoh: <code>done install panel 15k</code>",
        parseMode: "html",
        replyTo: message.id
      });
    }

    parts.shift(); // hapus 'done'
    const total = parts.pop(); // ambil harga
    const deskripsi = parts.join(" "); // sisanya jadi deskripsi

    const now = new Date();
    const hari = now.toLocaleDateString("id-ID", { weekday: "long" });
    const tanggal = now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

    const caption = `<blockquote>
✨ <b>Terima kasih telah order di toko kami!</b>
╔─━━━━━━━━━━━━━━━━━━━━━━━━═⬣
┃📦 <b>Pesanan Anda:</b> <i>${deskripsi}</i>
┃💰 <b>Total:</b> <code>${total}</code>
┃📆 <b>Tanggal:</b> ${tanggal}
┃📅 <b>Hari:</b> ${hari}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━⬣
</blockquote>`;

    await client.sendFile(message.chatId, {
      file: "https://files.catbox.moe/k7f7xi.mp4",
      caption: caption,
      parseMode: "html",
      replyTo: message.id,
    });
  }
};