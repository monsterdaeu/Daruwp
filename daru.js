const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const fs = require('fs');
const P = require('pino');
import fs from "fs";
import readline from "readline";
import pino from "pino";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (q) => new Promise((res) => rl.question(q, res));

const runBot = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    printQRInTerminal: true,
    auth: state,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("✅ Logged in successfully.");

      const sender = await ask("Enter your number (without +): ");
      const messageFile = await ask("Enter message file path (e.g., message.txt): ");
      const targetFile = await ask("Enter target numbers file path (e.g., target.txt): ");
      const delaySec = parseInt(await ask("Enter delay in seconds: "), 10);

      rl.close();

      const message = fs.readFileSync(messageFile, "utf-8").trim();
      const targets = fs.readFileSync(targetFile, "utf-8")
        .split("\n")
        .map((n) => n.trim())
        .filter((n) => n !== "");

      for (const number of targets) {
        try {
          const jid = number + "@s.whatsapp.net";
          await sock.sendMessage(jid, { text: message });
          console.log(`📨 Message sent to: ${number}`);
          await delay(delaySec * 1000);
        } catch (err) {
          console.log(`❌ Failed to send to ${number}: ${err.message}`);
        }
      }

      console.log("✅ All messages processed.");
      process.exit(0);
    } else if (
      connection === "close" &&
      lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
    ) {
      console.log("⚠️ Reconnecting...");
      runBot();
    }
  });
};

runBot().catch((err) => {
  console.error("Error:", err);
});
