/**
 * Anthropic AI Service for natural language processing
 */

import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { ContractService } from './contractService';

export interface AIResponse {
  message: string;
  imageUrls?: string[];
  requiresContractData?: boolean;
  contractQuery?: string;
  toolResults?: any[];
}

export class AIService {
  private anthropic: Anthropic;
  private contractService: ContractService;
  private conversationHistory: Map<
    string,
    Array<{ role: string; content: string }>
  > = new Map();

  private TROVES_TOOLS = [
    {
      name: 'get_vault_balance',
      description: 'Get user balance for a specific vault and wallet address',
      input_schema: {
        type: 'object',
        properties: {
          wallet_address: {
            type: 'string',
            description: 'User wallet address (required)',
          },
          vault_type: {
            type: 'string',
            enum: [
              'vesuEth',
              'vesuStrk',
              'vesuUsdc',
              'vesuUsdt',
              'ekuboStrkXstrk',
            ],
            description:
              'Vault type to check balance for (optional - if not provided, will show available vaults)',
          },
        },
        required: ['wallet_address'],
      },
    },
    {
      name: 'get_vault_yield',
      description: 'Get current yield information for a specific vault',
      input_schema: {
        type: 'object',
        properties: {
          vault_type: {
            type: 'string',
            enum: [
              'vesuEth',
              'vesuStrk',
              'vesuUsdc',
              'vesuUsdt',
              'ekuboStrkXstrk',
            ],
            description:
              'Vault type to get yield for (optional - if not provided, will show available vaults)',
          },
        },
        required: [],
      },
    },
    {
      name: 'get_vault_tvl',
      description: 'Get total value locked (TVL) for a specific vault',
      input_schema: {
        type: 'object',
        properties: {
          vault_type: {
            type: 'string',
            enum: [
              'vesuEth',
              'vesuStrk',
              'vesuUsdc',
              'vesuUsdt',
              'ekuboStrkXstrk',
            ],
            description:
              'Vault type to get TVL for (optional - if not provided, will show available vaults)',
          },
        },
        required: [],
      },
    },
    {
      name: 'get_vault_settings',
      description: 'Get vault settings including fees and configuration',
      input_schema: {
        type: 'object',
        properties: {
          vault_type: {
            type: 'string',
            enum: [
              'vesuEth',
              'vesuStrk',
              'vesuUsdc',
              'vesuUsdt',
              'ekuboStrkXstrk',
            ],
            description:
              'Vault type to get settings for (optional - if not provided, will show available vaults)',
          },
        },
        required: [],
      },
    },
  ];

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: config.anthropic.apiKey,
    });
    this.contractService = new ContractService();
  }

  /**
   * Process user query using intelligent tool calling
   */
  async processQuery(userQuery: string, userId?: string): Promise<AIResponse> {
    try {
      // Initialize conversation history for this user
      if (userId && !this.conversationHistory.has(userId)) {
        this.conversationHistory.set(userId, []);
      }

      const history = userId ? this.conversationHistory.get(userId) || [] : [];

      // Add user message to history
      if (userId) {
        history.push({ role: 'user', content: userQuery });

        // Keep only last 12 messages to manage memory
        if (history.length > 12) {
          history.splice(0, history.length - 12);
        }
      }

      // Build messages array with conversation history
      const messages: Array<{ role: 'user' | 'assistant'; content: string }> =
        [];

      // Add recent conversation history (last 6 messages)
      const recentHistory = history.slice(-6);
      recentHistory.forEach(msg => {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      });

      // Ensure the current user query is included
      if (
        messages.length === 0 ||
        messages[messages.length - 1].content !== userQuery
      ) {
        messages.push({
          role: 'user',
          content: userQuery,
        });
      }

      const systemPrompt = `You are an AI assistant for Troves.fi, a yield aggregator built on Starknet.

IMPORTANT GUIDELINES:
- Be brief and direct in responses
- Include relevant image URLs from the knowledge base when helpful
- If user asks for balance without providing wallet address, ask for their wallet address
- If user asks for specific vault data, use the appropriate tools
- For general questions, provide helpful information from the knowledge base

Available Vault Types:
- vesuEth: Vesu Fusion ETH (vfETH)
- vesuStrk: Vesu Fusion STRK (vfSTRK) 
- vesuUsdc: Vesu Fusion USDC (vfUSDC)
- vesuUsdt: Vesu Fusion USDT (vfUSDT)
- ekuboStrkXstrk: Ekubo CL xSTRK/STRK concentrated liquidity

Knowledge Base: ${this.getTrovesContext()}`;

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        system: systemPrompt,
        messages: messages as any,
        tools: this.TROVES_TOOLS as any,
        tool_choice: { type: 'auto' },
      } as any);

      let finalResponse = '';
      let toolResults: any[] = [];
      let imageUrls: string[] = [];

      if (response.content) {
        for (const content of response.content) {
          if (content.type === 'text') {
            finalResponse += content.text;
            // Extract image URLs from text response
            imageUrls = [...imageUrls, ...this.extractImageUrls(content.text)];
          } else if (content.type === 'tool_use') {
            const toolResult = await this.executeTrovesTool(
              (content as any).name,
              (content as any).input
            );
            toolResults.push({
              tool_name: (content as any).name,
              result: toolResult,
            });

            if (toolResult.success) {
              finalResponse += toolResult.message;
            } else {
              finalResponse += `Error: ${toolResult.message}`;
            }
          }
        }
      }

      if (!finalResponse.trim()) {
        finalResponse =
          "I understand you want to know about Troves.fi. Please provide more specific details about what you'd like to know!";
      }

      // Add response to conversation history
      if (userId) {
        history.push({ role: 'assistant', content: finalResponse });
      }

      return {
        message: finalResponse,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        toolResults: toolResults.length > 0 ? toolResults : undefined,
      };
    } catch (error) {
      console.error('Error processing AI query:', error);
      return {
        message:
          'Sorry, I encountered an error processing your query. Please try again.',
      };
    }
  }

  /**
   * Execute Troves.fi tools
   */
  async executeTrovesTool(
    toolName: string,
    parameters: any
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      switch (toolName) {
        case 'get_vault_balance':
          return await this.getVaultBalance(parameters);
        case 'get_vault_yield':
          return await this.getVaultYield(parameters);
        case 'get_vault_tvl':
          return await this.getVaultTVL(parameters);
        case 'get_vault_settings':
          return await this.getVaultSettings(parameters);
        default:
          return {
            success: false,
            message: `Unknown tool: ${toolName}`,
          };
      }
    } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error);
      return {
        success: false,
        message: `Error executing ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get vault balance for a specific wallet address
   */
  async getVaultBalance({
    wallet_address,
    vault_type,
  }: {
    wallet_address: string;
    vault_type?: string;
  }): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      if (!wallet_address) {
        return {
          success: false,
          message: 'Wallet address is required to check balance.',
        };
      }

      const availableVaults = this.contractService.getAvailableVaults();

      // If no vault type specified, show available vaults for user to choose
      if (!vault_type) {
        const vaultOptions = availableVaults
          .map(vault => {
            const vaultInfo = this.getVaultInfo(vault);
            return `• **${vault}** - ${vaultInfo.name}`;
          })
          .join('\n');

        return {
          success: false,
          message: `Please specify which vault you'd like to check the balance for:\n\n${vaultOptions}\n\nExample: "check balance for vesuEth" or "get balance for ekuboStrkXstrk"`,
        };
      }

      if (!availableVaults.includes(vault_type as any)) {
        return {
          success: false,
          message: `Invalid vault type: ${vault_type}. Available vaults: ${availableVaults.join(', ')}`,
        };
      }

      const balance = await this.contractService.getUserBalance(
        wallet_address,
        vault_type as any
      );
      const vaultInfo = this.getVaultInfo(vault_type);
      const formattedBalance = this.formatBalance(balance, vault_type);

      return {
        success: true,
        message: `💰 **Your ${vaultInfo.name} Balance:**\n\`${formattedBalance}\`\n\n📍 Address: \`${wallet_address}\``,
        data: { balance, formattedBalance, vault_type, wallet_address },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error getting balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get vault yield information
   */
  async getVaultYield({
    vault_type,
  }: {
    vault_type: string;
  }): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const availableVaults = this.contractService.getAvailableVaults();

      // If no vault type specified, show available vaults for user to choose
      if (!vault_type) {
        const vaultOptions = availableVaults
          .map(vault => {
            const vaultInfo = this.getVaultInfo(vault);
            return `• **${vault}** - ${vaultInfo.name}`;
          })
          .join('\n');

        return {
          success: false,
          message: `Please specify which vault you'd like to check the yield for:\n\n${vaultOptions}\n\nExample: "get yield for vesuEth" or "show yield for ekuboStrkXstrk"`,
        };
      }

      if (!availableVaults.includes(vault_type as any)) {
        return {
          success: false,
          message: `Invalid vault type: ${vault_type}. Available vaults: ${availableVaults.join(', ')}`,
        };
      }

      const yieldData = await this.contractService.computeYield(
        vault_type as any
      );
      const vaultInfo = this.getVaultInfo(vault_type);

      return {
        success: true,
        message: `📈 **${vaultInfo.name} Yield:**\n\n• **Before:** ${yieldData.yieldBefore}\n• **After:** ${yieldData.yieldAfter}\n\n${vaultInfo.description}`,
        data: { ...yieldData, vault_type },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error getting yield: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get vault TVL (Total Value Locked)
   */
  async getVaultTVL({
    vault_type,
  }: {
    vault_type: string;
  }): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const availableVaults = this.contractService.getAvailableVaults();

      // If no vault type specified, show available vaults for user to choose
      if (!vault_type) {
        const vaultOptions = availableVaults
          .map(vault => {
            const vaultInfo = this.getVaultInfo(vault);
            return `• **${vault}** - ${vaultInfo.name}`;
          })
          .join('\n');

        return {
          success: false,
          message: `Please specify which vault you'd like to check the TVL for:\n\n${vaultOptions}\n\nExample: "get TVL for vesuEth" or "show TVL for ekuboStrkXstrk"`,
        };
      }

      if (!availableVaults.includes(vault_type as any)) {
        return {
          success: false,
          message: `Invalid vault type: ${vault_type}. Available vaults: ${availableVaults.join(', ')}`,
        };
      }

      const totalAssets = await this.contractService.getTotalAssets(
        vault_type as any
      );
      const vaultInfo = this.getVaultInfo(vault_type);

      return {
        success: true,
        message: `🏦 **${vaultInfo.name} TVL:**\n\`${totalAssets}\`\n\n${vaultInfo.description}`,
        data: { totalAssets, vault_type },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error getting TVL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get vault settings
   */
  async getVaultSettings({
    vault_type,
  }: {
    vault_type: string;
  }): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const availableVaults = this.contractService.getAvailableVaults();

      // If no vault type specified, show available vaults for user to choose
      if (!vault_type) {
        const vaultOptions = availableVaults
          .map(vault => {
            const vaultInfo = this.getVaultInfo(vault);
            return `• **${vault}** - ${vaultInfo.name}`;
          })
          .join('\n');

        return {
          success: false,
          message: `Please specify which vault you'd like to check the settings for:\n\n${vaultOptions}\n\nExample: "get settings for vesuEth" or "show settings for ekuboStrkXstrk"`,
        };
      }

      if (!availableVaults.includes(vault_type as any)) {
        return {
          success: false,
          message: `Invalid vault type: ${vault_type}. Available vaults: ${availableVaults.join(', ')}`,
        };
      }

      const settings = await this.contractService.getSettings(
        vault_type as any
      );
      const vaultInfo = this.getVaultInfo(vault_type);

      return {
        success: true,
        message: `⚙️ **${vaultInfo.name} Settings:**\n\n• **Fee:** ${settings.feeBps / 100}%\n• **Default Pool Index:** ${settings.defaultPoolIndex}\n• **Fee Receiver:** \`${settings.feeReceiver}\``,
        data: { ...settings, vault_type },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error getting settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get simplified Troves context for system prompt
   */
  private getTrovesContext(): string {
    return `
## Troves.fi Overview
Troves is a yield aggregator on Starknet that maximizes returns through automated vault strategies.

## Available Strategies:
1. **Vesu Fusion Vaults** (vfETH, vfSTRK, vfUSDC, vfUSDT) - Rebalancing across multiple lending pools
2. **Ekubo CL** (xSTRK/STRK) - Concentrated liquidity management  
3. **Sensei Strategies** - Delta neutral lending loops

## Key Features:
- 10% fee only on rewards (no fees on principal)
- NFT levels system for early supporters
- Referral program available
- Full audit by Cairo Security Clan

## Visual Guides Available:
- Strategies overview: https://544104674-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FpPQw6sLqPpeJkiKP4Ai5%2Fuploads%2FmzkuZ3YYzpRKfCBzcerr%2Fimage.png?alt=media&token=560c6151-9d6b-4944-96c7-7bc1eebd40fd
- Deposit tutorial: https://544104674-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FpPQw6sLqPpeJkiKP4Ai5%2Fuploads%2F53QrnFYxlAqALk5pBe9V%2Fimage.png?alt=media&token=c0ce5d57-78a1-4780-8959-e5e3eafafff8
- Vesu allocation flow: https://544104674-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FpPQw6sLqPpeJkiKP4Ai5%2Fuploads%2Fs7hPWGZkA69vM9icju1k%2FSnip20250324_1.png?alt=media&token=afd1547a-ceb7-42c2-8163-2c86d09dd040
`;
  }

  /**
   * Extract image URLs from response text
   */
  private extractImageUrls(text: string): string[] {
    const imageUrlRegex =
      /https:\/\/[^\s\]]+\.(png|jpg|jpeg|gif|webp)(\?[^\s\]]*)?/gi;
    const urls = text.match(imageUrlRegex) || [];
    return [...new Set(urls)]; // Remove duplicates
  }

  /**
   * Get vault information for a specific vault type
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
   * Format balance for display based on vault type
   */
  private formatBalance(balance: string, vaultType: string): string {
    const balanceNum = BigInt(balance);

    // Define decimals for each token type
    const decimals: Record<string, number> = {
      vesuEth: 18, // ETH has 18 decimals
      vesuStrk: 18, // STRK has 18 decimals
      vesuUsdc: 6, // USDC has 6 decimals
      vesuUsdt: 6, // USDT has 6 decimals
      ekuboStrkXstrk: 18, // STRK has 18 decimals
    };

    const decimal = decimals[vaultType] || 18;

    // Convert from wei/smallest unit to human readable format
    const divisor = BigInt(10 ** decimal);
    const wholePart = balanceNum / divisor;
    const fractionalPart = balanceNum % divisor;

    // Format fractional part with leading zeros
    const fractionalStr = fractionalPart.toString().padStart(decimal, '0');

    // Remove trailing zeros from fractional part
    const trimmedFractional = fractionalStr.replace(/0+$/, '');

    if (trimmedFractional === '') {
      return wholePart.toString();
    }

    // Format with proper decimal places (up to 6 decimal places)
    const formattedFractional = trimmedFractional.slice(0, 6);

    return `${wholePart}.${formattedFractional}`;
  }

  /**
   * Get help information about available commands
   */
  async getHelpMessage(): Promise<string> {
    return `
🤖 **Troves.fi AI Assistant**

I can help you with:

📊 **Contract Data Queries:**
• Current yield and TVL for specific vaults
• Available pools and strategies  
• Fee information
• Total supply and assets
• User balances (with address)

🏦 **Available Vaults:**
• Vesu Fusion: vfETH, vfSTRK, vfUSDC, vfUSDT
• Ekubo CL: xSTRK/STRK concentrated liquidity
• Sensei: Delta neutral lending strategies

💡 **General Information:**
• What is Troves.fi?
• How yield farming works
• Starknet ecosystem info
• Getting started guide
• NFT levels system
• Referral program

🔍 **Examples:**
• "What's the yield on Vesu ETH vault?"
• "Show me TVL for vfSTRK"
• "How do I deposit to a strategy?"
• "What is the NFT levels system?"
• "What are the fees?"

Just ask me anything in natural language! 🚀
`;
  }

  /**
   * Clear conversation history for a user
   */
  clearConversation(userId: string): void {
    this.conversationHistory.delete(userId);
  }

  /**
   * Get conversation history for a user
   */
  getConversationHistory(
    userId: string
  ): Array<{ role: string; content: string }> {
    return this.conversationHistory.get(userId) || [];
  }

  /**
   * Check if user has conversation history
   */
  hasConversationHistory(userId: string): boolean {
    return (
      this.conversationHistory.has(userId) &&
      this.conversationHistory.get(userId)!.length > 0
    );
  }
}
