const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

let bot = null;

if (token) {
  try {
    bot = new TelegramBot(token, { polling: true });

    bot.onText(/\/start/, (msg) => {
      const id = msg.chat.id;
      bot.sendMessage(id, `Welcome to Data Saver Bot! 🚀\n\nYour Chat ID is: <code>${id}</code>\nAdd this to your server's .env file as \`TELEGRAM_CHAT_ID\` to receive notifications.`, { parse_mode: 'HTML' });
    });

    console.log('Telegram bot is active and polling.');
  } catch (err) {
    console.log('Error initializing Telegram bot:', err);
  }
} else {
  console.log('No TELEGRAM_BOT_TOKEN found in .env. Telegram bot is disabled.');
}

const notifyDrop = async (chestData) => {
  if (!bot || !chatId) return;

  const { tier, fileName, fileSize, droppedBy, hasPin } = chestData;
  const tierEmoji = tier === 'gold' ? '🏆' : tier === 'silver' ? '🥈' : '🥉';

  const message = `
<b>New Intel Dropped!</b> ${tierEmoji}

<b>Tier:</b> ${tier.toUpperCase()}
<b>File:</b> ${fileName}
<b>Size:</b> ${fileSize}
<b>Agent:</b> ${droppedBy || 'Anonymous'}
<b>Protected:</b> ${hasPin ? 'Yes 🔒' : 'No 🔓'}
`;

  try {
    await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  } catch (error) {
    console.error('Error sending Telegram dropping notification:', error.message);
  }
};

module.exports = {
  bot,
  notifyDrop
};
