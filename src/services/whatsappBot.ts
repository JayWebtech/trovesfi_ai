/**
 * WhatsApp Cloud API Bot Service for Troves.fi AI Assistant
 */

import axios from 'axios';
import { config } from '../config';
import { AIService } from './aiService';
import { ContractService } from './contractService';
import { MessagingPlatform, Message, BotResponse } from '../types/messaging';

export class WhatsAppBotService implements MessagingPlatform {
  private aiService: AIService;
  private contractService: ContractService;
  private _isRunning: boolean = false;
  private apiUrl: string;

  constructor() {
    this.aiService = new AIService();
    this.contractService = new ContractService();
    this.apiUrl = `${config.whatsapp.baseUrl}/${config.whatsapp.apiVersion}/${config.whatsapp.phoneNumberId}`;
  }

  /**
   * Send a text message via WhatsApp Cloud API
   */
  async sendMessage(
    chatId: string,
    message: string,
    _options?: any
  ): Promise<void> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: chatId,
          type: 'text',
          text: {
            preview_url: true,
            body: message,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.whatsapp.accessToken}`,
          },
        }
      );

      console.log('WhatsApp message sent successfully:', response.data);
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw error;
    }
  }

  /**
   * Send a media message (image) via WhatsApp Cloud API
   */
  async sendPhoto(
    chatId: string,
    photoUrl: string,
    caption?: string
  ): Promise<void> {
    try {
      // First, upload the media to get a media ID
      const mediaResponse = await axios.post(
        `${this.apiUrl}/media`,
        {
          messaging_product: 'whatsapp',
          url: photoUrl,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.whatsapp.accessToken}`,
          },
        }
      );

      const mediaId = mediaResponse.data.id;

      const messageResponse = await axios.post(
        `${this.apiUrl}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: chatId,
          type: 'image',
          image: {
            id: mediaId,
            caption: caption || '📸 Visual Guide',
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.whatsapp.accessToken}`,
          },
        }
      );

      console.log('WhatsApp photo sent successfully:', messageResponse.data);
    } catch (error) {
      console.error('Error sending WhatsApp photo:', error);
      await this.sendMessage(chatId, `📸 ${caption || 'Image'}: ${photoUrl}`);
    }
  }

  /**
   * Process incoming webhook message
   */
  async processWebhookMessage(webhookData: any): Promise<void> {
    try {
      const entry = webhookData.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value?.messages) {
        return;
      }

      for (const message of value.messages) {
        const chatId = message.from;
        const messageText = message.text?.body || '';
        const messageId = message.id;

        if (!messageText) {
          continue;
        }

        const msg: Message = {
          id: messageId,
          text: messageText,
          from: chatId,
          chatId: chatId,
          timestamp: new Date(),
          platform: 'whatsapp',
        };

        // Handle commands
        if (messageText.startsWith('/')) {
          await this.handleCommand(msg);
        } else {
          // Handle regular messages
          await this.handleRegularMessage(msg);
        }
      }
    } catch (error) {
      console.error('Error processing WhatsApp webhook message:', error);
    }
  }

  /**
   * Handle command messages
   */
  private async handleCommand(message: Message): Promise<void> {
    const command = message.text.split(' ')[0];
    const args = message.text.split(' ').slice(1);

    try {
      let response: BotResponse;

      switch (command) {
        case '/start':
          response = await this.getWelcomeMessage();
          break;
        case '/help':
          response = await this.getHelpMessage();
          break;
        case '/status':
          response = await this.getStatusMessage();
          break;
        case '/balance':
          response = await this.getBalanceMessage(args);
          break;
        default:
          response = {
            message: '❓ Unknown command. Use /help to see available commands.',
          };
      }

      await this.sendMessage(message.chatId, response.message);

      if (response.imageUrls && response.imageUrls.length > 0) {
        for (const imageUrl of response.imageUrls) {
          await this.sendPhoto(message.chatId, imageUrl, '📸 Visual Guide');
        }
      }
    } catch (error) {
      console.error('Error handling command:', error);
      await this.sendMessage(
        message.chatId,
        '❌ Sorry, I encountered an error processing your command. Please try again.'
      );
    }
  }

  /**
   * Handle regular messages
   */
  private async handleRegularMessage(message: Message): Promise<void> {
    try {
      const userId = message.from;
      const response = await this.aiService.processQuery(message.text, userId);

      await this.sendMessage(message.chatId, response.message);

      if (response.imageUrls && response.imageUrls.length > 0) {
        for (const imageUrl of response.imageUrls) {
          await this.sendPhoto(message.chatId, imageUrl, '📸 Visual Guide');
        }
      }
    } catch (error) {
      console.error('Error processing regular message:', error);
      await this.sendMessage(
        message.chatId,
        '❌ Sorry, I encountered an error processing your message. Please try again.'
      );
    }
  }

  /**
   * Get welcome message
   */
  private async getWelcomeMessage(): Promise<BotResponse> {
    const welcomeMessage = `
🚀 *Welcome to Troves.fi AI Assistant!*

I'm here to help you with everything about Troves.fi, the yield aggregator on Starknet.

💡 *What I can do:*
• Answer questions about Troves.fi
• Provide real-time contract data
• Explain yield farming strategies
• Help with Starknet ecosystem

🔍 *Just ask me anything in natural language!*

*Examples:*
• "What's the current yield?"
• "How do I get started?"
• "What pools are available?"

Use /help for more information.
    `;

    return { message: welcomeMessage };
  }

  /**
   * Get help message
   */
  private async getHelpMessage(): Promise<BotResponse> {
    try {
      const helpMessage = await this.aiService.getHelpMessage();
      return { message: helpMessage };
    } catch (error) {
      console.error('Error getting help message:', error);
      return {
        message: 'Sorry, I encountered an error. Please try again.',
      };
    }
  }

  /**
   * Get status message
   */
  private async getStatusMessage(): Promise<BotResponse> {
    try {
      const availableVaults = this.contractService.getAvailableVaults();
      let statusMessage = '📊 *Troves.fi Contract Status*\n\n';

      for (const vaultType of availableVaults) {
        try {
          const contractData =
            await this.contractService.getContractData(vaultType);
          const vaultInfo = this.getVaultInfo(vaultType);

          statusMessage += `🏦 *${vaultInfo.name}*\n`;
          statusMessage += `💰 TVL: ${this.formatNumber(contractData.totalAssets)}\n`;
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

      statusMessage += `🌐 *Network:* ${
        config.nodeEnv === 'development' ? 'Sepolia Testnet' : 'Mainnet'
      }`;

      return { message: statusMessage };
    } catch (error) {
      console.error('Error getting status:', error);
      return {
        message: '❌ Error fetching contract status. Please try again.',
      };
    }
  }

  /**
   * Get balance message
   */
  private async getBalanceMessage(args: string[]): Promise<BotResponse> {
    if (!args || args.length === 0) {
      return {
        message:
          'Please provide a valid Starknet address.\nUsage: /balance <address> [vault_type]',
      };
    }

    const userAddress = args[0];
    const vaultType = args[1];

    try {
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
💰 *Balance Information - ${vaultInfo.name}*

👤 *Address:* \`${userAddress}\`
💎 *Balance:* ${this.formatNumber(balance)} tokens
📊 *% of Total Supply:* ${(Number(percentage) / 100).toFixed(4)}%

📈 *Portfolio Value:*
• Total Assets in Vault: ${this.formatNumber(totalAssets)}
• Your Share: ${this.formatNumber(balance)} tokens
        `;

        return { message: balanceMessage };
      } else {
        const availableVaults = this.contractService.getAvailableVaults();
        let balanceMessage = `💰 *Balance Information*\n\n👤 *Address:* \`${userAddress}\`\n\n`;

        for (const vault of availableVaults) {
          try {
            const balance = await this.contractService.getUserBalance(
              userAddress,
              vault
            );
            const vaultInfo = this.getVaultInfo(vault);

            if (BigInt(balance) > 0) {
              balanceMessage += `🏦 *${vaultInfo.name}*\n`;
              balanceMessage += `💎 Balance: ${this.formatNumber(balance)} tokens\n\n`;
            }
          } catch (error) {
            console.error(`Error getting balance for ${vault}:`, error);
          }
        }

        return { message: balanceMessage };
      }
    } catch (error) {
      console.error('Error getting balance:', error);
      return {
        message:
          '❌ Error fetching balance. Please check the address and try again.',
      };
    }
  }

  /**
   * Get vault information
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

  start(): void {
    if (this._isRunning) {
      console.log('WhatsApp bot is already running');
      return;
    }

    this._isRunning = true;
    console.log('✅ WhatsApp Cloud API bot started successfully');
    console.log('📱 Bot is ready to receive webhook messages');
  }

  stop(): void {
    if (!this._isRunning) {
      console.log('WhatsApp bot is not running');
      return;
    }

    this._isRunning = false;
    console.log('🛑 WhatsApp bot stopped');
  }

  isRunning(): boolean {
    return this._isRunning;
  }

  getPlatformName(): string {
    return 'whatsapp';
  }
}
