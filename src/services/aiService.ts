/**
 * Anthropic AI Service for natural language processing
 */

import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { ContractService } from './contractService';
import { StrategyService } from './strategyService';

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
  private strategyService: StrategyService;
  private conversationHistory: Map<
    string,
    Array<{ role: string; content: string }>
  > = new Map();

  private TROVES_TOOLS = [
    {
      name: 'get_all_strategies',
      description: 'Get all available yield strategies from Troves.fi with their APY, TVL, and details',
      input_schema: {
        type: 'object',
        properties: {
          sort_by: {
            type: 'string',
            enum: ['apy', 'tvl', 'name'],
            description: 'Sort strategies by APY, TVL, or name (optional)',
          },
          limit: {
            type: 'number',
            description: 'Limit number of strategies returned (default 10)',
          },
        },
        required: [],
      },
    },
    {
      name: 'get_strategy_by_id',
      description: 'Get detailed information about a specific strategy by its ID',
      input_schema: {
        type: 'object',
        properties: {
          strategy_id: {
            type: 'string',
            description: 'Strategy ID (e.g., "vesu_fusion_eth", "hyper_xstrk")',
          },
        },
        required: ['strategy_id'],
      },
    },
    {
      name: 'search_strategies_by_token',
      description: 'Search for strategies that support a specific token symbol',
      input_schema: {
        type: 'object',
        properties: {
          token_symbol: {
            type: 'string',
            description: 'Token symbol to search for (e.g., "STRK", "ETH", "USDC")',
          },
        },
        required: ['token_symbol'],
      },
    },
    {
      name: 'get_top_strategies_by_apy',
      description: 'Get strategies with the highest APY',
      input_schema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Number of top strategies to return (default 5)',
          },
        },
        required: [],
      },
    },
    {
      name: 'get_vault_balance',
      description: 'Get user balance for a specific vault/strategy and wallet address',
      input_schema: {
        type: 'object',
        properties: {
          wallet_address: {
            type: 'string',
            description: 'User wallet address (required)',
          },
          strategy_id: {
            type: 'string',
            description:
              'Strategy ID to check balance for (e.g., "vesu_fusion_eth", "hyper_xstrk")',
          },
        },
        required: ['wallet_address', 'strategy_id'],
      },
    },
    {
      name: 'get_vault_yield',
      description: 'Get current yield information for a specific strategy',
      input_schema: {
        type: 'object',
        properties: {
          strategy_id: {
            type: 'string',
            description:
              'Strategy ID to get yield for (e.g., "vesu_fusion_eth", "hyper_xstrk")',
          },
        },
        required: ['strategy_id'],
      },
    },
    {
      name: 'get_vault_tvl',
      description: 'Get total value locked (TVL) for a specific strategy',
      input_schema: {
        type: 'object',
        properties: {
          strategy_id: {
            type: 'string',
            description:
              'Strategy ID to get TVL for (e.g., "vesu_fusion_eth", "hyper_xstrk")',
          },
        },
        required: ['strategy_id'],
      },
    },
    {
      name: 'get_vault_settings',
      description: 'Get strategy settings including fees and configuration',
      input_schema: {
        type: 'object',
        properties: {
          strategy_id: {
            type: 'string',
            description:
              'Strategy ID to get settings for (e.g., "vesu_fusion_eth", "hyper_xstrk")',
          },
        },
        required: ['strategy_id'],
      },
    },
  ];

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: config.anthropic.apiKey,
    });
    this.contractService = new ContractService();
    this.strategyService = new StrategyService();
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
- When users ask about strategies, use the strategy tools to fetch live data from the API
- All strategy information (APY, TVL, contract addresses) is fetched dynamically
- If user asks for balance, they need to provide both wallet address AND strategy ID
- For general questions, provide helpful information from the knowledge base

AVAILABLE TOOLS:
- get_all_strategies: List all available strategies with APY and TVL
- get_strategy_by_id: Get detailed info about a specific strategy
- search_strategies_by_token: Find strategies for a specific token (ETH, STRK, USDC, etc.)
- get_top_strategies_by_apy: Show strategies with highest yields
- get_vault_balance: Check user balance (requires wallet address + strategy ID)
- get_vault_yield: Get yield data for a strategy
- get_vault_tvl: Get TVL for a strategy
- get_vault_settings: Get settings and fees for a strategy

EXAMPLE STRATEGY IDs:
- vesu_fusion_eth, vesu_fusion_strk, vesu_fusion_usdc, vesu_fusion_usdt
- hyper_xstrk, hyper_xtbtc, hyper_xwbtc
- ekubo_cl_ethusdc, ekubo_cl_strkusdc, ekubo_cl_wbtceth
- xstrk_sensei, evergreen_strk, evergreen_eth

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
        case 'get_all_strategies':
          return await this.getAllStrategies(parameters);
        case 'get_strategy_by_id':
          return await this.getStrategyById(parameters);
        case 'search_strategies_by_token':
          return await this.searchStrategiesByToken(parameters);
        case 'get_top_strategies_by_apy':
          return await this.getTopStrategiesByApy(parameters);
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
   * Get all strategies
   */
  async getAllStrategies({
    sort_by,
    limit = 10,
  }: {
    sort_by?: string;
    limit?: number;
  }): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      let strategies;

      if (sort_by === 'apy') {
        strategies = await this.strategyService.getTopStrategiesByApy(limit);
      } else if (sort_by === 'tvl') {
        strategies = await this.strategyService.getTopStrategiesByTvl(limit);
      } else {
        const allStrategies = await this.strategyService.fetchStrategies();
        strategies = allStrategies.strategies.slice(0, limit);
      }

      const formattedStrategies = strategies
        .map(
          (s, idx) =>
            `${idx + 1}. ${this.strategyService.formatStrategyInfoShort(s)}`
        )
        .join('\n');

      return {
        success: true,
        message: `**Available Strategies** (${strategies.length}):\n\n${formattedStrategies}\n\nUse strategy ID to get more details (e.g., "Tell me about ${strategies[0]?.id}")`,
        data: { strategies, count: strategies.length },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching strategies: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get strategy by ID
   */
  async getStrategyById({
    strategy_id,
  }: {
    strategy_id: string;
  }): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const strategy = await this.strategyService.getStrategyById(strategy_id);

      if (!strategy) {
        return {
          success: false,
          message: `Strategy with ID '${strategy_id}' not found. Use "show all strategies" to see available options.`,
        };
      }

      // Format with full details including methodology
      const formattedInfo = this.strategyService.formatStrategyInfo(strategy, true);

      // Add contract address info
      const contractInfo = strategy.contract.length > 0 
        ? `\n\n**Contract Address:** \`${strategy.contract[0].address}\``
        : '';

      return {
        success: true,
        message: formattedInfo + contractInfo,
        data: strategy,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching strategy: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Search strategies by token
   */
  async searchStrategiesByToken({
    token_symbol,
  }: {
    token_symbol: string;
  }): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const strategies =
        await this.strategyService.searchStrategiesByToken(token_symbol);

      if (strategies.length === 0) {
        return {
          success: false,
          message: `No strategies found for token '${token_symbol.toUpperCase()}'. Try tokens like STRK, ETH, USDC, USDT, or WBTC.`,
        };
      }

      const formattedStrategies = strategies
        .map(
          (s, idx) =>
            `${idx + 1}. ${this.strategyService.formatStrategyInfoShort(s)}\n   ID: \`${s.id}\``
        )
        .join('\n\n');

      return {
        success: true,
        message: `**${strategies.length} Strategies with ${token_symbol.toUpperCase()}**:\n\n${formattedStrategies}\n\nAsk "Tell me about [strategy_id]" for full details including APY methodology.`,
        data: { strategies, count: strategies.length, token: token_symbol.toUpperCase() },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error searching strategies: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get top strategies by APY
   */
  async getTopStrategiesByApy({
    limit = 5,
  }: {
    limit?: number;
  }): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const strategies = await this.strategyService.getTopStrategiesByApy(limit);

      if (strategies.length === 0) {
        return {
          success: false,
          message: 'No strategies with valid APY data found.',
        };
      }

      const formattedStrategies = strategies
        .map(
          (s, idx) =>
            `${idx + 1}. ${this.strategyService.formatStrategyInfoShort(s)}\n   ID: \`${s.id}\``
        )
        .join('\n\n');

      return {
        success: true,
        message: `**Top ${strategies.length} Strategies by APY**:\n\n${formattedStrategies}\n\nAsk "Tell me about [strategy_id]" for full details including APY methodology.`,
        data: { strategies, count: strategies.length },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error fetching top APY strategies: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get vault balance for a specific wallet address
   */
  async getVaultBalance({
    wallet_address,
    strategy_id,
  }: {
    wallet_address: string;
    strategy_id: string;
  }): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      if (!wallet_address) {
        return {
          success: false,
          message: 'Wallet address is required to check balance.',
        };
      }

      if (!strategy_id) {
        return {
          success: false,
          message: 'Strategy ID is required to check balance.',
        };
      }

      // Fetch strategy details
      const strategy = await this.strategyService.getStrategyById(strategy_id);
      
      if (!strategy) {
        return {
          success: false,
          message: `Strategy '${strategy_id}' not found.`,
        };
      }

      const balance = await this.contractService.getUserBalance(
        wallet_address,
        strategy_id
      );
      
      const decimals = strategy.depositToken[0]?.decimals || 18;
      const formattedBalance = this.formatBalanceWithDecimals(balance, decimals);

      return {
        success: true,
        message: `**Your ${strategy.name} Balance:**\n${formattedBalance}\n\nAddress: ${wallet_address}`,
        data: { balance, formattedBalance, strategy_id, wallet_address, strategy },
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
    strategy_id,
  }: {
    strategy_id: string;
  }): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      if (!strategy_id) {
        return {
          success: false,
          message: 'Strategy ID is required to check yield.',
        };
      }

      // Fetch strategy details
      const strategy = await this.strategyService.getStrategyById(strategy_id);
      
      if (!strategy) {
        return {
          success: false,
          message: `Strategy '${strategy_id}' not found.`,
        };
      }

      const yieldData = await this.contractService.computeYield(strategy_id);

      let message = `**${strategy.name} Yield Information:**\n\n`;
      message += `- Current APY: ${this.strategyService.formatApy(strategy.apy)}\n`;
      
      if (strategy.apySplit.baseApy !== null) {
        message += `- Base APY: ${this.strategyService.formatApy(strategy.apySplit.baseApy)}\n`;
      }
      if (strategy.apySplit.rewardsApy > 0) {
        message += `- Rewards APY: ${this.strategyService.formatApy(strategy.apySplit.rewardsApy)}\n`;
      }
      
      message += `- Yield Before: ${yieldData.yieldBefore}\n`;
      message += `- Yield After: ${yieldData.yieldAfter}\n`;
      message += `\n**APY Methodology:**\n${strategy.apyMethodology}`;

      return {
        success: true,
        message,
        data: { ...yieldData, strategy_id, strategy },
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
    strategy_id,
  }: {
    strategy_id: string;
  }): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      if (!strategy_id) {
        return {
          success: false,
          message: 'Strategy ID is required to check TVL.',
        };
      }

      // Fetch strategy details
      const strategy = await this.strategyService.getStrategyById(strategy_id);
      
      if (!strategy) {
        return {
          success: false,
          message: `Strategy '${strategy_id}' not found.`,
        };
      }

      const totalAssets = await this.contractService.getTotalAssets(strategy_id);

      let message = `**${strategy.name} TVL Information:**\n\n`;
      message += `- USD Value: ${this.strategyService.formatTvl(strategy.tvlUsd)}\n`;
      message += `- On-chain Total Assets: ${totalAssets}\n`;
      message += `- Tokens: ${strategy.depositToken.map(t => t.symbol).join(', ')}\n`;
      message += `- APY: ${this.strategyService.formatApy(strategy.apy)}\n`;
      message += `- Status: ${strategy.status.value}`;

      return {
        success: true,
        message,
        data: { totalAssets, tvlUsd: strategy.tvlUsd, strategy_id, strategy },
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
    strategy_id,
  }: {
    strategy_id: string;
  }): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      if (!strategy_id) {
        return {
          success: false,
          message: 'Strategy ID is required to check settings.',
        };
      }

      // Fetch strategy details
      const strategy = await this.strategyService.getStrategyById(strategy_id);
      
      if (!strategy) {
        return {
          success: false,
          message: `Strategy '${strategy_id}' not found.`,
        };
      }

      const settings = await this.contractService.getSettings(strategy_id);

      let message = `**${strategy.name} Settings:**\n\n`;
      message += `- Performance Fee: ${settings.feeBps / 100}%\n`;
      message += `- Default Pool Index: ${settings.defaultPoolIndex}\n`;
      message += `- Fee Receiver: ${settings.feeReceiver}\n`;
      message += `- Leverage: ${strategy.leverage}x\n`;
      message += `- Risk Factor: ${strategy.riskFactor}\n`;
      message += `- Audit Status: ${strategy.isAudited ? 'Audited' : 'Not Audited'}\n`;
      
      if (strategy.auditUrl) {
        message += `- Audit Report: ${strategy.auditUrl}\n`;
      }
      
      message += `- Status: ${strategy.status.value}\n`;
      message += `- Contract: ${strategy.contract[0]?.address || 'N/A'}`;

      if (strategy.curator) {
        message += `\n\n**Curated by:** ${strategy.curator.name}`;
      }

      return {
        success: true,
        message,
        data: { ...settings, strategy_id, strategy },
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
   * Format balance for display with specific decimals
   */
  private formatBalanceWithDecimals(balance: string, decimals: number): string {
    const balanceNum = BigInt(balance);
    const divisor = BigInt(10 ** decimals);
    const wholePart = balanceNum / divisor;
    const fractionalPart = balanceNum % divisor;

    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    const trimmedFractional = fractionalStr.replace(/0+$/, '');

    if (trimmedFractional === '') {
      return wholePart.toString();
    }

    const formattedFractional = trimmedFractional.slice(0, 6);

    return `${wholePart}.${formattedFractional}`;
  }

  /**
   * Get help information about available commands
   */
  async getHelpMessage(): Promise<string> {
    return `
**Troves.fi AI Assistant**

I can help you with:

**Contract Data Queries:**
- Current yield and TVL for specific vaults
- Available pools and strategies  
- Fee information
- Total supply and assets
- User balances (with address)

**Available Vaults:**
- Vesu Fusion: vfETH, vfSTRK, vfUSDC, vfUSDT
- Ekubo CL: xSTRK/STRK concentrated liquidity
- Sensei: Delta neutral lending strategies

**General Information:**
- What is Troves.fi?
- How yield farming works
- Starknet ecosystem info
- Getting started guide
- NFT levels system
- Referral program

**Examples:**
- "What's the yield on Vesu ETH vault?"
- "Show me TVL for vfSTRK"
- "How do I deposit to a strategy?"
- "What is the NFT levels system?"
- "What are the fees?"

Just ask me anything in natural language!
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
