/*  
 */

const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const config = require("../config");

module.exports = (client) => {
    const pluginsPath = path.join(__dirname, "../plugins");
    const pluginFiles = fs.readdirSync(pluginsPath).filter(file => file.endsWith(".js"));
    const commands = {};

    let loadedCount = 0;
    console.log(chalk.hex("#00FFFF")("\n⟨ Plugins Loader ⟩"));
    console.log(chalk.gray("════════════════════════════════════════════════════"));

    pluginFiles.forEach(file => {
        const plugin = require(path.join(pluginsPath, file));

        if (typeof plugin === "function") {
            console.log(chalk.red(`❌ ${file} -> Format plugin tidak valid!`));
            return;
        }

        if (!plugin.command) {
            console.log(chalk.red(`❌ ${file} -> Tidak memiliki 'command'.`));
            return;
        }

        plugin.command.forEach(cmd => {
            commands[cmd] = plugin;
        });

        loadedCount++;
        console.log(chalk.green(`✅ ${file} -> Dimuat.`));
    });

    console.log(chalk.gray("════════════════════════════════════════════════════"));
    console.log(chalk.hex("#00FF00").bold(`📦 Total Plugin Dimuat: ${loadedCount}/${pluginFiles.length}\n`));

    client.addEventHandler(async (event) => {
        const message = event.message;
        if (!message || !message.message) return;

        const senderId = message.senderId?.userId || message.senderId || "Unknown";

        console.log(chalk.bgHex("#e74c3c").bold(`▢ New Message`));
        console.log(
            chalk.bgHex("#00FF00").black(
                `   ⌬ Tanggal     : ${new Date().toLocaleString()}\n` +
                `   ⌬ Pesan       : ${message.message}\n` +
                `   ⌬ ID Pengirim : ${senderId}`
            )
        );
        console.log();

        const args = message.message.trim().split(/\s+/);
        const command = args.shift().toLowerCase();
        const text = args.join(" ");

        const handler = commands[command];
        if (!handler) return;

        if (handler.owner && parseInt(senderId) !== parseInt(config.ownerId)) {
            return client.sendMessage(message.peerId, {
                message: "❌ Access denied: hanya owner yang bisa menggunakan command ini.",
                replyTo: message.id
            });
        }

        await handler.run({
            client,
            text,
            reply: (msg) => client.sendMessage(message.peerId, { 
                message: msg, 
                replyTo: message.id 
            }),
            message
        });
    });
};