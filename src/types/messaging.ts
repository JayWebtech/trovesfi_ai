/**
 * Base interface for messaging platforms
 */

export interface Message {
  id: string;
  text: string;
  from: string;
  chatId: string;
  timestamp: Date;
  platform: 'telegram' | 'whatsapp';
}

export interface BotResponse {
  message: string;
  imageUrls?: string[];
  parseMode?: 'Markdown' | 'HTML' | 'Plain';
}

export interface MessagingPlatform {
  start(): void;
  stop(): void;
  sendMessage(chatId: string, message: string, options?: any): Promise<void>;
  sendPhoto(chatId: string, photoUrl: string, caption?: string): Promise<void>;
  isRunning(): boolean;
  getPlatformName(): string;
}

export interface CommandHandler {
  command: string;
  description: string;
  handler: (message: Message, args?: string[]) => Promise<BotResponse>;
}
