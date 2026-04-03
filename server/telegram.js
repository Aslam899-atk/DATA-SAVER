const TelegramBot = require('node-telegram-bot-api');
const db = require('./db');

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

let bot = null;

if (token) {
  try {
    bot = new TelegramBot(token, { polling: true });

    bot.onText(/\/start/, (msg) => {
      const id = msg.chat.id;
      bot.sendMessage(id, `<b>Data Dropper Command Center</b> 🚀\n\nYour ID: <code>${id}</code>\n\nCommands:\n/status - System Status\n/list - List Active Drops`, { parse_mode: 'HTML' });
    });

    bot.onText(/\/status/, async (msg) => {
      const data = await db.read();
      const message = `<b>System Status</b> ✅\n\n<b>Active Drops:</b> ${data.chests.length}\n<b>Operational Agents:</b> ${data.users.length}\n<b>Active Broadcasts:</b> ${data.ads.length}`;
      bot.sendMessage(msg.chat.id, message, { parse_mode: 'HTML' });
    });

    bot.onText(/\/list/, async (msg) => {
      const data = await db.read();
      if (data.chests.length === 0) return bot.sendMessage(msg.chat.id, "No active drops detected.");
      
      let message = "<b>Active Intel Drops:</b>\n\n";
      data.chests.slice(-10).forEach((c, i) => {
        message += `${i+1}. <b>${c.title}</b> (${c.tier})\nAgent: ${c.droppedBy}\n\n`;
      });
      bot.sendMessage(msg.chat.id, message, { parse_mode: 'HTML' });
    });

    bot.on('document', async (msg) => {
      const { document, chat, from } = msg;
      if (!document) return;

      const fileLink = await bot.getFileLink(document.file_id);
      
      const newChest = {
        lat: 11.051 + (Math.random() - 0.5) * 0.1, // Near Malappuram
        lng: 76.071 + (Math.random() - 0.5) * 0.1,
        title: document.file_name || 'TELEGRAM_DROP',
        tier: 'bronze',
        droppedBy: from.username || 'TelegramUser',
        fileName: document.file_name,
        fileSize: (document.file_size / (1024*1024)).toFixed(2) + 'MB',
        fileUrl: fileLink,
        files: [{
          fileName: document.file_name,
          fileSize: (document.file_size / (1024*1024)).toFixed(2) + 'MB',
          fileUrl: fileLink,
          mimeType: document.mime_type
        }],
        hasPin: false,
        pin: '',
        currentOpens: 0,
        createdAt: new Date().toISOString()
      };

      await db.saveChest(newChest);
      bot.sendMessage(chat.id, `✅ <b>Intel Received & Deployed!</b>\n\nYour file has been dropped into the tactical grid near Malappuram HQ.`, { parse_mode: 'HTML' });
    });

    console.log('Telegram bot is active and polling.');
  } catch (err) {
    console.log('Error initializing Telegram bot:', err);
  }
}

const notifyDrop = async (chestData) => {
  if (!bot || !chatId) return;
  const { tier, fileName, fileSize, droppedBy, hasPin } = chestData;
  const tierEmoji = tier === 'gold' ? '🏆' : tier === 'silver' ? '🥈' : '🥉';
  const message = `<b>New Intel Dropped!</b> ${tierEmoji}\n\n<b>File:</b> ${fileName}\n<b>Size:</b> ${fileSize}\n<b>Agent:</b> ${droppedBy}\n<b>Protected:</b> ${hasPin ? 'Yes 🔒' : 'No 🔓'}`;
  try {
    await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  } catch (error) {
    console.error('Error sending Telegram dropping notification:', error.message);
  }
};

module.exports = { bot, notifyDrop };
