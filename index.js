const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");
const fs = require("fs");
const config = require("./config");
const loadPlugins = require("./utils/loader");

(async () => {
  console.log("🚀 Memulai Userbot Telegram...");

  // Cek apakah file session sudah ada
  const sessionString = fs.existsSync(config.sessionFile)
    ? fs.readFileSync(config.sessionFile, "utf8")
    : "";
  const session = new StringSession(sessionString);

  // Inisialisasi client
  const client = new TelegramClient(
    session,
    config.apiId,
    config.apiHash,
    {
      connectionRetries: 5,
    }
  );

  try {
    await client.start({
      phoneNumber: async () =>
        await input.text("📲 Masukkan nomor Telegram Anda: "),
      password: async () =>
        await input.text("🔑 Masukkan password akun Telegram (jika ada): "),
      phoneCode: async () =>
        await input.text("📩 Masukkan kode OTP: "),
      onError: (err) => console.log("❌ Error: ", err),
    });

    console.log("✅ Login berhasil!");
    // Simpan sesi agar tidak perlu login ulang
    fs.writeFileSync(config.sessionFile, client.session.save(), "utf8");

    await client.sendMessage("me", {
      message: "SUKCES BROOO TY FOR BUYING jika error atau ada kendala pv @Robzcxxz ",
    });

    console.log("🤖 Userbot siap digunakan!");
    // Muat semua plugin
    loadPlugins(client);

  } catch (err) {
    console.error("❌ Gagal login:", err);
  }
})();