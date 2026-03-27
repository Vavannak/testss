const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI("AIzaSyDdfNNmvphdPdHSbIvpO5UkHdzBwx7NVm0");

// ID yang diizinkan
const allowedId = 7330654183;

module.exports = {
  command: ["gemini", "Gemini", "GEMINI", "aigemini", "AiGemini"], // semua variasi didukung
  run: async ({ client, message, reply }) => {
    if (parseInt(message.senderId) !== allowedId) {
      return; // Abaikan jika bukan pemilik
    }

    const text = message.message?.trim() || "";
    const regex = /^(gemini|aigemini)(@\w+)?\s*(.*)/i;
    const match = text.match(regex);

    if (!match || !match[3]) {
      return reply("❗ Penggunaan: Gemini <pertanyaan>");
    }

    const prompt = match[3].trim();

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const answer = response.text().trim();

      if (!answer) return reply("❌ Tidak ada jawaban.");

      await client.sendMessage(message.chatId, {
        message: `🧠 Gemini Jawaban:\n\n${answer}`,
        replyToMsgId: message.id
      });
    } catch (err) {
      console.error("Gemini Error:", err);
      reply("❌ Terjadi kesalahan saat menjawab dengan Gemini.");
    }
  }
};