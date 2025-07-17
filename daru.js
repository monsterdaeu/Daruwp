import makeWASocket, { useMultiFileAuthState, DisconnectReason, delay } from '@whiskeysockets/baileys';
import fs from 'fs';
import readline from 'readline';
import pino from 'pino';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (q) => new Promise((res) => rl.question(q, res));

// 🎨 Logo
console.log(`
\x1b[1;35m
██████╗  █████╗ ██████╗ ██╗   ██╗    ██╗    ██╗██████╗ 
██╔══██╗██╔══██╗██╔══██╗╚██╗ ██╔╝    ██║    ██║██╔══██╗
██║  ██║███████║██║  ██║ ╚████╔╝     ██║ █╗ ██║██████╔╝
██║  ██║██╔══██║██║  ██║  ╚██╔╝      ██║███╗██║██╔═══╝ 
██████╔╝██║  ██║██████╔╝   ██║       ╚███╔███╔╝██║     
╚═════╝ ╚═╝  ╚═╝╚═════╝    ╚═╝        ╚══╝╚══╝ ╚═╝     
\n\x1b[0m`);

const runBot = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      console.log('✅ Logged in successfully.\n');

      const msgFile = await ask('📄 Enter message file path (e.g., message.txt): ');
      const numberFile = await ask('📱 Enter numbers/groups file (e.g., targets.txt): ');
      const delaySec = parseInt(await ask('⏱️ Enter delay (sec): '), 10);
      rl.close();

      const message = fs.readFileSync(msgFile, 'utf-8').trim();
      const targets = fs
        .readFileSync(numberFile, 'utf-8')
        .split('\n')
        .map((n) => n.trim())
        .filter((n) => n);

      for (const target of targets) {
        try {
          let jid = target.includes('@g.us') ? target : `${target}@s.whatsapp.net`;
          await sock.sendMessage(jid, { text: message });
          console.log(`📨 Sent to: ${target}`);
          await delay(delaySec * 1000);
        } catch (err) {
          console.log(`❌ Failed to send to ${target}: ${err.message}`);
        }
      }

      console.log('✅ All messages processed.');
      process.exit(0);
    } else if (
      connection === 'close' &&
      lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
    ) {
      console.log('⚠️ Reconnecting...');
      runBot();
    }
  });
};

runBot().catch((err) => console.error('Error:', err));
