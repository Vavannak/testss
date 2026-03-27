const allowedId = 7330654183;

module.exports = {
  command: ["reportch"],
  run: async ({ client, message }) => {
    const senderId = parseInt(message.sender?.userId || message.senderId?.userId || message.senderId);
    if (senderId !== allowedId) return;

    const abuseBot = "@RobzMD_bot";
    let pesan = message.message?.split(" ").slice(1).join(" ").trim();

    // Jika reply pesan, ambil isi pesan target
    if (message.replyToMsgId) {
      const replied = await client.getMessages(message.peerId, { ids: [message.replyToMsgId] });
      if (replied.length > 0) {
        const target = replied[0];
        pesan = `🚨 Laporan Penyalahgunaan:\n\n${target.message || "[Pesan tidak dapat dibaca]"}`;
      }
    }

    if (!pesan) {
      return client.sendMessage(message.peerId, {
        message: `❌ Harap balas pesan atau tuliskan isi laporan.\n\nContoh:\n<code>reportch akun ini melakukan spam</code>`,
        parseMode: "html",
        replyTo: message.id
      });
    }

    try {
      await client.sendMessage(abuseBot, { message: pesan });
      return client.sendMessage(message.peerId, {
        message: `<blockquote>
✅ <b>Laporan dikirim ke</b> @RobzMD_bot
📝 <i>${pesan.length > 300 ? "Pesan terlalu panjang." : pesan}</i>
</blockquote>`,
        parseMode: "html",
        replyTo: message.id
      });
    } catch (error) {
      console.error(error);
      return client.sendMessage(message.peerId, {
        message: "❌ Gagal mengirim ke @RobzMD_bot. Mungkin Anda diblokir atau bot tidak dapat dihubungi.",
        replyTo: message.id
      });
    }
  }
};