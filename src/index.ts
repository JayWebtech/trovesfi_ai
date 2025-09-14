/**
 * Main entry point for the trovesfi-ai application
 */

import app from './app';
import { config } from './config';
import { TelegramBotService } from './services/telegramBot';

const PORT = config.port;

const telegramBot = new TelegramBotService();

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🏦 Troves API: http://localhost:${PORT}/api/troves`);
  console.log(`🤖 Telegram bot starting...`);

  telegramBot.start();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  telegramBot.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  telegramBot.stop();
  process.exit(0);
});
