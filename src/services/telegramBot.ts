/**
 * Telegram Bot Service for Troves.fi AI Assistant
 */

import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config';
import { AIService } from './aiService';
import { ContractService } from './contractService';
import { MessagingPlatform } from '../types/messaging';

export class TelegramBotService implements MessagingPlatform {
  private bot: TelegramBot;
  private aiService: AIService;
  private contractService: ContractService;
  private _isRunning: boolean = false;

  constructor() {
    this.bot = new TelegramBot(config.telegram.botToken, { polling: true });
    this.aiService = new AIService();
    this.contractService = new ContractService();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.bot.onText(/\/start/, msg => {
      const chatId = msg.chat.id;
      const welcomeMessage = `
🚀 **Welcome to Troves.fi AI Assistant!**

I'm here to help you with everything about Troves.fi, the yield aggregator on Starknet.

💡 **What I can do:**
• Answer questions about Troves.fi
• Provide real-time contract data
• Explain yield farming strategies
• Help with Starknet ecosystem

🔍 **Just ask me anything in natural language!**

Examples:
• "What's the current yield?"
• "How do I get started?"
• "What pools are available?"

Use /help for more information.
      `;

      this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    });

    this.bot.onText(/\/help/, async msg => {
      const chatId = msg.chat.id;
      try {
        const helpMessage = await this.aiService.getHelpMessage();
        this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Error getting help message:', error);
        this.bot.sendMessage(
          chatId,
          'Sorry, I encountered an error. Please try again.'
        );
      }
    });

    this.bot.onText(/\/status/, async msg => {
      const chatId = msg.chat.id;
      try {
        await this.bot.sendMessage(
          chatId,
          '🔄 Fetching contract status for all vaults...'
        );

        const availableVaults = this.contractService.getAvailableVaults();
        let statusMessage = '📊 **Troves.fi Contract Status**\n\n';

        for (const vaultType of availableVaults) {
          try {
            const contractData =
              await this.contractService.getContractData(vaultType);
            const vaultInfo = this.getVaultInfo(vaultType);

            statusMessage += `🏦 **${vaultInfo.name}**\n`;
            statusMessage += `💰 TVL: ${this.formatNumber(
              contractData.totalAssets
            )}\n`;
            statusMessage += `🔄 Supply: ${this.formatNumber(
              await this.contractService.getTotalSupply(vaultType)
            )}\n`;
            statusMessage += `⚙️ Fee: ${contractData.settings.feeBps} BPS\n`;
            statusMessage += `🏊 Pools: ${contractData.allowedPools.length}\n\n`;
          } catch (error) {
            console.error(`Error getting data for ${vaultType}:`, error);
            statusMessage += `❌ Error fetching data for ${vaultType}\n\n`;
          }
        }

        statusMessage += `🌐 **Network:** ${
          config.nodeEnv === 'development' ? 'Sepolia Testnet' : 'Mainnet'
        }`;

        this.bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Error getting status:', error);
        this.bot.sendMessage(
          chatId,
          '❌ Error fetching contract status. Please try again.'
        );
      }
    });

    this.bot.onText(/\/balance (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const input = match?.[1];

      if (!input) {
        this.bot.sendMessage(
          chatId,
          'Please provide a valid Starknet address.\nUsage: /balance <address> [vault_type]'
        );
        return;
      }

      const parts = input.split(' ');
      const userAddress = parts[0];
      const vaultType = parts[1];

      try {
        await this.bot.sendMessage(chatId, '🔄 Fetching balance...');

        if (vaultType) {
          // Get balance for specific vault
          const balance = await this.contractService.getUserBalance(
            userAddress,
            vaultType as any
          );
          const totalSupply = await this.contractService.getTotalSupply(
            vaultType as any
          );
          const totalAssets = await this.contractService.getTotalAssets(
            vaultType as any
          );
          const vaultInfo = this.getVaultInfo(vaultType);

          // Calculate percentage of total supply
          const percentage =
            (BigInt(balance) * BigInt(10000)) / BigInt(totalSupply);

          const balanceMessage = `
💰 **Balance Information - ${vaultInfo.name}**

👤 **Address:** \`${userAddress}\`
💎 **Balance:** ${this.formatNumber(balance)} tokens
📊 **% of Total Supply:** ${(Number(percentage) / 100).toFixed(4)}%

📈 **Portfolio Value:**
• Total Assets in Vault: ${this.formatNumber(totalAssets)}
• Your Share: ${this.formatNumber(balance)} tokens
          `;

          this.bot.sendMessage(chatId, balanceMessage, {
            parse_mode: 'Markdown',
          });
        } else {
          const availableVaults = this.contractService.getAvailableVaults();
          let balanceMessage = `💰 **Balance Information**\n\n👤 **Address:** \`${userAddress}\`\n\n`;

          for (const vault of availableVaults) {
            try {
              const balance = await this.contractService.getUserBalance(
                userAddress,
                vault
              );
              const vaultInfo = this.getVaultInfo(vault);

              if (BigInt(balance) > 0) {
                balanceMessage += `🏦 **${vaultInfo.name}**\n`;
                balanceMessage += `💎 Balance: ${this.formatNumber(
                  balance
                )} tokens\n\n`;
              }
            } catch (error) {
              console.error(`Error getting balance for ${vault}:`, error);
            }
          }

          this.bot.sendMessage(chatId, balanceMessage, {
            parse_mode: 'Markdown',
          });
        }
      } catch (error) {
        console.error('Error getting balance:', error);
        this.bot.sendMessage(
          chatId,
          '❌ Error fetching balance. Please check the address and try again.'
        );
      }
    });

    this.bot.on('message', async msg => {
      if (msg.text?.startsWith('/')) return;

      const chatId = msg.chat.id;
      const userMessage = msg.text;

      if (!userMessage) return;

      try {
        await this.bot.sendChatAction(chatId, 'typing');

        const userId = msg.from?.id?.toString() || 'anonymous';
        const response = await this.aiService.processQuery(userMessage, userId);

        await this.bot.sendMessage(chatId, response.message, {
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        });

        if (response.imageUrls && response.imageUrls.length > 0) {
          for (const imageUrl of response.imageUrls) {
            try {
              await this.bot.sendPhoto(chatId, imageUrl, {
                caption: '📸 Visual Guide',
                parse_mode: 'Markdown',
              });
            } catch (error) {
              console.error('Error sending image:', error);
              await this.bot.sendMessage(
                chatId,
                `📸 Visual Guide: ${imageUrl}`
              );
            }
          }
        }
      } catch (error) {
        console.error('Error processing message:', error);
        this.bot.sendMessage(
          chatId,
          '❌ Sorry, I encountered an error processing your message. Please try again.'
        );
      }
    });

    this.bot.on('error', error => {
      console.error('Telegram bot error:', error);
    });

    this.bot.on('polling_error', error => {
      console.error('Telegram polling error:', error);
    });
  }

  /**
   * Get vault information for a specific vault type.
   */
  private getVaultInfo(vaultType: string): {
    name: string;
    description: string;
  } {
    const vaultInfoMap: Record<string, { name: string; description: string }> =
      {
        vesuEth: {
          name: 'Vesu Fusion ETH (vfETH)',
          description:
            'Rebalancing vault that supplies ETH to multiple Vesu pools for optimized yield. Uses Vesu lending protocol with automated rebalancing across verified pools.',
        },
        vesuStrk: {
          name: 'Vesu Fusion STRK (vfSTRK)',
          description:
            'Rebalancing vault that supplies STRK to multiple Vesu pools for optimized yield. Uses Vesu lending protocol with automated rebalancing across verified pools.',
        },
        vesuUsdc: {
          name: 'Vesu Fusion USDC (vfUSDC)',
          description:
            'Rebalancing vault that supplies USDC to multiple Vesu pools for optimized yield. Uses Vesu lending protocol with automated rebalancing across verified pools.',
        },
        vesuUsdt: {
          name: 'Vesu Fusion USDT (vfUSDT)',
          description:
            'Rebalancing vault that supplies USDT to multiple Vesu pools for optimized yield. Uses Vesu lending protocol with automated rebalancing across verified pools.',
        },
        ekuboStrkXstrk: {
          name: 'Ekubo CL xSTRK/STRK',
          description:
            'Concentrated liquidity vault for xSTRK/STRK pair on Ekubo. Automatically manages LP positions within optimal price ranges and reinvests trading fees.',
        },
      };

    return (
      vaultInfoMap[vaultType] || {
        name: 'Unknown Vault',
        description: 'Vault information not available',
      }
    );
  }

  /**
   * Format large numbers for display
   */
  private formatNumber(num: string): string {
    const number = BigInt(num);
    if (number < BigInt(1000000)) {
      return number.toString();
    } else if (number < BigInt(1000000000)) {
      return (Number(number) / 1000000).toFixed(2) + 'M';
    } else {
      return (Number(number) / 1000000000).toFixed(2) + 'B';
    }
  }

  /**
   * Start the bot
   */
  start(): void {
    if (this._isRunning) {
      console.log('Bot is already running');
      return;
    }

    this._isRunning = true;
    console.log('🤖 Telegram bot started successfully');
    console.log('📱 Bot is ready to receive messages');
  }

  /**
   * Stop the bot
   */
  stop(): void {
    if (!this._isRunning) {
      console.log('Bot is not running');
      return;
    }

    this.bot.stopPolling();
    this._isRunning = false;
    console.log('🛑 Telegram bot stopped');
  }

  /**
   * Send message to specific chat
   */
  async sendMessage(
    chatId: string | number,
    message: string,
    options?: any
  ): Promise<void> {
    try {
      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...options,
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  /**
   * Send photo to specific chat
   */
  async sendPhoto(
    chatId: string | number,
    photoUrl: string,
    caption?: string
  ): Promise<void> {
    try {
      await this.bot.sendPhoto(chatId, photoUrl, {
        caption,
        parse_mode: 'Markdown',
      });
    } catch (error) {
      console.error('Error sending photo:', error);
      // Fallback to sending URL as text
      await this.sendMessage(chatId, `📸 ${caption || 'Image'}: ${photoUrl}`);
    }
  }

  /**
   * Check if bot is running
   */
  isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Get platform name
   */
  getPlatformName(): string {
    return 'telegram';
  }

  /**
   * Set webhook for production
   */
  async setWebhook(): Promise<void> {
    try {
      await this.bot.setWebHook(config.telegram.webhookUrl);
      console.log('✅ Webhook set successfully');
    } catch (error) {
      console.error('Error setting webhook:', error);
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(): Promise<void> {
    try {
      await this.bot.deleteWebHook();
      console.log('✅ Webhook deleted successfully');
    } catch (error) {
      console.error('Error deleting webhook:', error);
    }
  }
}
