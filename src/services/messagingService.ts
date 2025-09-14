/**
 * Unified Messaging Service for Troves.fi AI Assistant
 * Orchestrates multiple messaging platforms (Telegram, WhatsApp, etc.)
 */

import { MessagingPlatform } from '../types/messaging';
import { TelegramBotService } from './telegramBot';
import { WhatsAppBotService } from './whatsappBot';
import { config } from '../config';

export class MessagingService {
  private platforms: Map<string, MessagingPlatform> = new Map();
  private _isRunning: boolean = false;

  constructor() {
    this.initializePlatforms();
  }

  private initializePlatforms(): void {
    if (config.telegram.botToken) {
      const telegramBot = new TelegramBotService();
      this.platforms.set('telegram', telegramBot);
      console.log('✅ Telegram bot initialized');
    } else {
      console.log('⚠️ Telegram bot token not provided, skipping Telegram');
    }

    if (config.whatsapp.accessToken && config.whatsapp.phoneNumberId) {
      const whatsappBot = new WhatsAppBotService();
      this.platforms.set('whatsapp', whatsappBot);
      console.log('✅ WhatsApp Cloud API bot initialized');
    } else {
      console.log('⚠️ WhatsApp credentials not provided, skipping WhatsApp');
    }
  }

  /**
   * Start all messaging platforms
   */
  start(): void {
    if (this._isRunning) {
      console.log('Messaging service is already running');
      return;
    }

    console.log('🚀 Starting messaging service...');

    for (const [platformName, platform] of this.platforms) {
      try {
        platform.start();
        console.log(`✅ ${platformName} bot started`);
      } catch (error) {
        console.error(`❌ Failed to start ${platformName} bot:`, error);
      }
    }

    this._isRunning = true;
    console.log('🎉 Messaging service started successfully');
    this.logPlatformStatus();
  }

  /**
   * Stop all messaging platforms
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('Messaging service is not running');
      return;
    }

    console.log('🛑 Stopping messaging service...');

    for (const [platformName, platform] of this.platforms) {
      try {
        platform.stop();
        console.log(`✅ ${platformName} bot stopped`);
      } catch (error) {
        console.error(`❌ Error stopping ${platformName} bot:`, error);
      }
    }

    this._isRunning = false;
    console.log('🛑 Messaging service stopped');
  }

  /**
   * Get a specific platform by name
   */
  getPlatform(platformName: string): MessagingPlatform | undefined {
    return this.platforms.get(platformName);
  }

  /**
   * Get all available platforms
   */
  getAvailablePlatforms(): string[] {
    return Array.from(this.platforms.keys());
  }

  /**
   * Get all running platforms
   */
  getRunningPlatforms(): string[] {
    return Array.from(this.platforms.entries())
      .filter(([_, platform]) => platform.isRunning())
      .map(([name, _]) => name);
  }

  /**
   * Send message to a specific platform
   */
  async sendMessageToPlatform(
    platformName: string,
    chatId: string,
    message: string,
    options?: any
  ): Promise<boolean> {
    const platform = this.platforms.get(platformName);
    if (!platform) {
      console.error(`Platform ${platformName} not found`);
      return false;
    }

    if (!platform.isRunning()) {
      console.error(`Platform ${platformName} is not running`);
      return false;
    }

    try {
      await platform.sendMessage(chatId, message, options);
      return true;
    } catch (error) {
      console.error(`Error sending message to ${platformName}:`, error);
      return false;
    }
  }

  /**
   * Send message to all running platforms
   */
  async broadcastMessage(): Promise<void> {
    const runningPlatforms = this.getRunningPlatforms();

    if (runningPlatforms.length === 0) {
      console.log('No running platforms to broadcast to');
      return;
    }

    console.log(
      `📢 Broadcasting message to ${runningPlatforms.length} platforms`
    );

    const promises = runningPlatforms.map(async platformName => {
      // Note: This is a simplified broadcast - in a real scenario,
      // you'd need to maintain a list of chat IDs for each platform
      console.log(
        `📤 Message would be sent to ${platformName} (no specific chat IDs configured)`
      );
    });

    await Promise.allSettled(promises);
  }

  /**
   * Send photo to a specific platform
   */
  async sendPhotoToPlatform(
    platformName: string,
    chatId: string,
    photoUrl: string,
    caption?: string
  ): Promise<boolean> {
    const platform = this.platforms.get(platformName);
    if (!platform) {
      console.error(`Platform ${platformName} not found`);
      return false;
    }

    if (!platform.isRunning()) {
      console.error(`Platform ${platformName} is not running`);
      return false;
    }

    try {
      await platform.sendPhoto(chatId, photoUrl, caption);
      return true;
    } catch (error) {
      console.error(`Error sending photo to ${platformName}:`, error);
      return false;
    }
  }

  /**
   * Check if messaging service is running
   */
  isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Get status of all platforms
   */
  getStatus(): {
    serviceRunning: boolean;
    platforms: Array<{
      name: string;
      running: boolean;
      platformName: string;
    }>;
  } {
    const platforms = Array.from(this.platforms.entries()).map(
      ([name, platform]) => ({
        name,
        running: platform.isRunning(),
        platformName: platform.getPlatformName(),
      })
    );

    return {
      serviceRunning: this._isRunning,
      platforms,
    };
  }

  /**
   * Log current platform status
   */
  private logPlatformStatus(): void {
    const status = this.getStatus();
    console.log('\n📊 Messaging Service Status:');
    console.log(`Service Running: ${status.serviceRunning ? '✅' : '❌'}`);

    status.platforms.forEach(platform => {
      console.log(
        `${platform.name}: ${platform.running ? '✅ Running' : '❌ Stopped'}`
      );
    });
    console.log('');
  }

  /**
   * Restart a specific platform
   */
  async restartPlatform(platformName: string): Promise<boolean> {
    const platform = this.platforms.get(platformName);
    if (!platform) {
      console.error(`Platform ${platformName} not found`);
      return false;
    }

    try {
      console.log(`🔄 Restarting ${platformName}...`);
      platform.stop();

      await new Promise(resolve => setTimeout(resolve, 2000));

      platform.start();
      console.log(`✅ ${platformName} restarted successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to restart ${platformName}:`, error);
      return false;
    }
  }

  /**
   * Restart all platforms
   */
  async restartAll(): Promise<void> {
    console.log('🔄 Restarting all messaging platforms...');
    this.stop();

    await new Promise(resolve => setTimeout(resolve, 3000));

    this.start();
  }
}
