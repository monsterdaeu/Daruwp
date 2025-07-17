// daru.mjs
import { makeWASocket, useMultiFileAuthState, DisconnectReason, delay } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import pino from 'pino';
import readline from 'readline';

console.clear();
console.log(`\x1b[32m
╔═══════════════════════════╗
║      WHATSAPP BOT 🚀      ║
║   By: Aryano (Termux)     ║
╚═══════════════════════════╝
\x1b[0m`);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (q) => new Promise((res) => rl.question(q, res));

const runBot = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    auth: state,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log("📲 Scan the QR code below to login:\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      console.log("✅ Login successful!");

      const messageFile = await ask("📨 Message file path (e.g. message.txt): ");
      const targetsFile = await ask("🎯 Targets file path (e.g. targets.txt): ");
      const delaySec = parseInt(await ask("⏱️ Delay (seconds): "), 10);
      rl.close();

      const message = fs.readFileSync(messageFile, 'utf-8').trim();
      const targets = fs.readFileSync(targetsFile, 'utf-8')
        .split('\n')
        .map(n => n.trim())
        .filter(n => n);

      for (const target of targets) {
        const jid = target.includes('@g.us') ? target : target + "@s.whatsapp.net";
        try {
          await sock.sendMessage(jid, { text: message });
          console.log(`✅ Sent to: ${target}`);
          await delay(delaySec * 1000);
        } catch (err) {
          console
