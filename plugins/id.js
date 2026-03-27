 /*  
 */
const allowedId = 7330654183; // Ganti jika perlu

module.exports = {
command: ["id", "Id", "ID"],
run: async ({ client, message, reply }) => {
if (parseInt(message.senderId) !== allowedId) return;

let targetId;  

// Cek reply  
if (message.replyTo?.senderId) {  
  targetId = message.replyTo.senderId;  
}  

// Cek tag username  
else if (message.message) {  
  const mention = message.message.match(/@([a-zA-Z0-9_]+)/);  
  if (mention) {  
    try {  
      const user = await client.getEntity(mention[1]);  
      targetId = user.id;  
    } catch (e) {  
      return reply(`❌ Username tidak ditemukan.\n\nContoh:\n• tag username seperti id @Robzcxxz`);  
    }  
  }  
}  

// Kalau tidak reply dan tidak tag  
if (!targetId) {  
  return reply(`❌ Gunakan dengan tag username.\n\nContoh:\n• tag username seperti id @Robzcxxz`);  
}  

try {  
  const user = await client.getEntity(targetId);  

  const info = `

🆔 ID: ${user.id}
👤 Nama: ${user.firstName || ""} ${user.lastName || ""}
🔰 Username: ${user.username ? "@" + user.username : "-"}
`;

return reply(info, { parseMode: "html" });  
} catch (err) {  
  console.error("ID Error:", err);  
  return reply(`❌ Gagal mengambil data user.`);  
}

}
};