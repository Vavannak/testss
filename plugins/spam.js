const allowedId = 7330654183;

module.exports = {
  command: ["spam"],
  run: async ({ client, message }) => {
    const senderId = parseInt(message.sender?.userId || message.senderId?.userId || message.senderId);
    if (senderId !== allowedId) return;

    const textRaw = message.message?.trim();
    const args = textRaw?.split(/\s+/) || [];

    // Ambil reply message
    const replyMsg = message.replyMessage?.message || message.replyTo?.message;

    let count = 1;
    let text = "";

    if (replyMsg) {
      // Jika reply, ambil jumlah dari args[1]
      count = parseInt(args[1]) || 5;
      text = replyMsg;
    } else {
      // Tidak reply
      const lastArg = parseInt(args[args.length - 1]);
      if (!isNaN(lastArg)) {
        count = lastArg;
        text = args.slice(1, -1).join(" ");
      } else {
        text = args.slice(1).join(" ");
      }

      if (!text) {
        return client.sendMessage(message.chatId, {
          message: "Contoh:\n- spam halo 3\n",
        });
      }
    }

    for (let i = 0; i < count; i++) {
      await client.sendMessage(message.chatId, { message: text });
    }
  },
};