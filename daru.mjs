import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  delay,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import Pino from 'pino';
import readline from 'readline';
import fs from 'fs';

// readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const ask = (q) => new Promise((res) => rl.question(q, res));

function printLogo() {
  console.log(`
\x1b[1;31m

██████╗░░█████╗░██████╗░██╗░░░██╗
██╔══██╗██╔══██╗██╔══██╗██║░░░██║
██║░░██║███████║██████╔╝██║░░░██║
██║░░██║██╔══██║██╔══██╗██║░░░██║
██████╔╝██║░░██║██║░░██║╚██████╔╝
╚═════╝░╚═╝░░╚═╝╚═╝░░╚═╝░╚═════╝░   
\x1b[0m
\x1b[1;33m=====  WhatsApp by Daru  =====\x1b[0m
`);
}

async function start() {
  printLogo();

  // load WhatsApp version (optional but recommended)
  const { version } = await fetchLatestBaileysVersion();
  console.log(`Using WA version v${version.join('.')}`);

  // load or create auth state
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

  // create socket connection
  const sock = makeWASocket({
    version,
    logger: Pino({ level: 'silent' }),
    auth: state,
  });

  sock.ev.on('creds.update', saveCreds);

  // listen for connection updates
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr, pairing } = update;

    if (qr) {
      console.log('⚠️ Scan this QR code with your WhatsApp app:');
      console.log(qr);
      // optionally you can generate terminal QR code here using qrcode-terminal lib
    }

    if (pairing?.request) {
      console.log('🔐 Pairing code required!');
      const code = await ask('Enter the pairing code shown on your phone: ');
      try {
        await sock.requestPairingCode(code);
        console.log('✅ Pairing code sent!');
      } catch (err) {
        console.error('❌ Failed sending pairing code:', err.message);
      }
    }

    if (connection === 'open') {
      console.log('✅ Logged in successfully!');

      // Once logged in, ask for inputs
      const sender = await ask('Enter your WhatsApp number (with country code, no +): ');
      const messageFile = await ask('Enter message file path (text): ');
      const targetNumbersFile = await ask('Enter target numbers file path (one number per line): ');
      const targetGroupsFile = await ask('Enter target group IDs file path (one ID per line, or leave blank): ');
      const delaySec = parseInt(await ask('Enter delay between messages in seconds: '), 10);

      rl.close();

      // read message content
      const messageText = fs.readFileSync(messageFile, 'utf-8').trim();

      // read target numbers and format for WhatsApp JID
      const targetsNumbers = fs.readFileSync(targetNumbersFile, 'utf-8')
        .split('\n')
        .map(n => n.trim())
        .filter(Boolean)
        .map(n => n.includes('@s.whatsapp.net') ? n : `${n}@s.whatsapp.net`);

      // read target groups if file provided
      let targetsGroups = [];
      if (targetGroupsFile.trim() !== '') {
        targetsGroups = fs.readFileSync(targetGroupsFile, 'utf-8')
          .split('\n')
          .map(g => g.trim())
          .filter(Boolean)
          .map(g => g.includes('@g.us') ? g : `${g}@g.us`);
      }

      console.log(`🚀 Sending messages to ${targetsNumbers.length} numbers and ${targetsGroups.length} groups...`);

      // send messages to individual numbers
      for (const jid of targetsNumbers) {
        try {
          await sock.sendMessage(jid, { text: messageText });
          console.log(`✅ Sent message to ${jid}`);
          await delay(delaySec * 1000);
        } catch (err) {
          console.error(`❌ Failed to send to ${jid}: ${err.message}`);
        }
      }

      // send messages to groups
      for (const groupJid of targetsGroups) {
        try {
          await sock.sendMessage(groupJid, { text: messageText });
          console.log(`✅ Sent message to group ${groupJid}`);
          await delay(delaySec * 1000);
        } catch (err) {
          console.error(`❌ Failed to send to group ${groupJid}: ${err.message}`);
        }
      }

      console.log('🎉 All messages sent!');
      process.exit(0);
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode !== DisconnectReason.loggedOut) {
        console.log('🔄 Connection closed, reconnecting...');
        startBot();
      } else {
        console.log('❌ You are logged out. Please delete auth_info and login again.');
        process.exit(1);
      }
    }
  });
}

startBot().catch(console.error);
