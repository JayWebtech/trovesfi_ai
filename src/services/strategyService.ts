/**
 * Strategy Service for fetching and managing Troves.fi strategies
 */
import axios from 'axios';

export interface DepositToken {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
}

export interface ContractInfo {
  name: string;
  address: string;
}

export interface Strategy {
  name: string;
  id: string;
  apy: number | null;
  apySplit: {
    baseApy: number | null;
    rewardsApy: number;
  };
  apyMethodology: string;
  depositToken: DepositToken[];
  leverage: number;
  contract: ContractInfo[];
  tvlUsd: number;
  status: {
    number: number;
    value: string;
  };
  riskFactor: number;
  logos: string[];
  isAudited: boolean;
  auditUrl?: string;
  actions: any[];
  investmentFlows: any[];
  curator?: {
    name: string;
    logo: string;
  };
}

export interface StrategiesResponse {
  status: boolean;
  strategies: Strategy[];
  lastUpdated: string;
}

export class StrategyService {
  private readonly STRATEGIES_API_URL = 'https://app.troves.fi/api/strategies';
  private cachedStrategies: StrategiesResponse | null = null;
  private lastFetchTime: number = 0;
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 5 minutes cache

  /**
   * Fetch all available strategies from Troves.fi API
   */
  async fetchStrategies(forceRefresh: boolean = false): Promise<StrategiesResponse> {
    const now = Date.now();

    // Return cached data if still valid
    if (
      !forceRefresh &&
      this.cachedStrategies &&
      now - this.lastFetchTime < this.CACHE_DURATION
    ) {
      return this.cachedStrategies;
    }

    try {
      const response = await axios.get<StrategiesResponse>(this.STRATEGIES_API_URL);
      
      if (!response.data || !response.data.strategies) {
        throw new Error('Invalid response from strategies API');
      }

      this.cachedStrategies = response.data;
      this.lastFetchTime = now;

      console.log(`✅ Fetched ${response.data.strategies.length} strategies from Troves.fi API`);
      
      return response.data;
    } catch (error) {
      console.error('Error fetching strategies:', error);
      
      // Return cached data if available, even if expired
      if (this.cachedStrategies) {
        console.warn('Returning stale cached strategies due to fetch error');
        return this.cachedStrategies;
      }
      
      throw new Error(`Failed to fetch strategies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a specific strategy by ID
   * Fetches all strategies and filters by ID (no separate endpoint exists)
   */
  async getStrategyById(strategyId: string): Promise<Strategy | null> {
    const strategiesData = await this.fetchStrategies();
    return strategiesData.strategies.find(s => s.id.toLowerCase() === strategyId.toLowerCase()) || null;
  }

  /**
   * Get a strategy by contract address
   */
  async getStrategyByContractAddress(contractAddress: string): Promise<Strategy | null> {
    const strategiesData = await this.fetchStrategies();
    const normalizedAddress = contractAddress.toLowerCase();
    
    return strategiesData.strategies.find(strategy =>
      strategy.contract.some(c => c.address.toLowerCase() === normalizedAddress)
    ) || null;
  }

  /**
   * Get contract address for a strategy by ID
   */
  async getContractAddressByStrategyId(strategyId: string): Promise<string | null> {
    const strategy = await this.getStrategyById(strategyId);
    return strategy?.contract[0]?.address || null;
  }

  /**
   * Search strategies by token symbol
   */
  async searchStrategiesByToken(tokenSymbol: string): Promise<Strategy[]> {
    const strategiesData = await this.fetchStrategies();
    const upperToken = tokenSymbol.toUpperCase();
    
    return strategiesData.strategies.filter(strategy =>
      strategy.depositToken.some(token => 
        token.symbol.toUpperCase().includes(upperToken)
      )
    );
  }

  /**
   * Get strategies sorted by APY (highest first)
   */
  async getTopStrategiesByApy(limit: number = 10): Promise<Strategy[]> {
    const strategiesData = await this.fetchStrategies();
    
    return strategiesData.strategies
      .filter(s => s.apy !== null && !isNaN(s.apy))
      .sort((a, b) => (b.apy || 0) - (a.apy || 0))
      .slice(0, limit);
  }

  /**
   * Get strategies sorted by TVL (highest first)
   */
  async getTopStrategiesByTvl(limit: number = 10): Promise<Strategy[]> {
    const strategiesData = await this.fetchStrategies();
    
    return strategiesData.strategies
      .sort((a, b) => b.tvlUsd - a.tvlUsd)
      .slice(0, limit);
  }

  /**
   * Get audited strategies only
   */
  async getAuditedStrategies(): Promise<Strategy[]> {
    const strategiesData = await this.fetchStrategies();
    return strategiesData.strategies.filter(s => s.isAudited);
  }

  /**
   * Get strategies by status (Hot & New, Active, etc.)
   */
  async getStrategiesByStatus(statusValue: string): Promise<Strategy[]> {
    const strategiesData = await this.fetchStrategies();
    return strategiesData.strategies.filter(
      s => s.status.value.toLowerCase().includes(statusValue.toLowerCase())
    );
  }

  /**
   * Format strategy information for display
   */
  formatStrategyInfo(strategy: Strategy, includeMethodology: boolean = true): string {
    const apyDisplay = strategy.apy !== null 
      ? `${(strategy.apy * 100).toFixed(2)}%` 
      : 'N/A';
    
    const tvlDisplay = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(strategy.tvlUsd);

    const tokens = strategy.depositToken.map(t => t.symbol).join(', ');
    const auditStatus = strategy.isAudited ? '[Audited]' : '[Not Audited]';
    
    // Build base info
    let info = `**${strategy.name}** (${strategy.id})
APY: ${apyDisplay}`;

    // Add APY breakdown if available
    if (strategy.apySplit.baseApy !== null || strategy.apySplit.rewardsApy > 0) {
      info += `\n   - Base APY: ${this.formatApy(strategy.apySplit.baseApy)}`;
      if (strategy.apySplit.rewardsApy > 0) {
        info += `\n   - Rewards APY: ${this.formatApy(strategy.apySplit.rewardsApy)}`;
      }
    }

    info += `
TVL: ${tvlDisplay}
Tokens: ${tokens}
Leverage: ${strategy.leverage}x
Risk Factor: ${strategy.riskFactor}
${auditStatus}`;

    if (strategy.auditUrl) {
      info += `\nAudit Report: ${strategy.auditUrl}`;
    }

    info += `\nStatus: ${strategy.status.value}`;

    // Add methodology if requested
    if (includeMethodology && strategy.apyMethodology) {
      info += `\n\n**Methodology:**\n${strategy.apyMethodology}`;
    }

    // Add curator info if available
    if (strategy.curator) {
      info += `\n\n**Curated by:** ${strategy.curator.name}`;
    }

    return info;
  }

  /**
   * Format strategy information in short form
   */
  formatStrategyInfoShort(strategy: Strategy): string {
    const apyDisplay = strategy.apy !== null 
      ? `${(strategy.apy * 100).toFixed(2)}%` 
      : 'N/A';
    
    const tvlDisplay = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(strategy.tvlUsd);

    const tokens = strategy.depositToken.map(t => t.symbol).join('/');
    const auditStatus = strategy.isAudited ? '[Audited]' : '[Not Audited]';
    
    return `**${strategy.name}** | APY: ${apyDisplay} | TVL: ${tvlDisplay} | ${tokens} ${auditStatus}`;
  }

  /**
   * Format APY percentage
   */
  formatApy(apy: number | null): string {
    if (apy === null || isNaN(apy)) return 'N/A';
    return `${(apy * 100).toFixed(2)}%`;
  }

  /**
   * Format TVL in USD
   */
  formatTvl(tvlUsd: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(tvlUsd);
  }

  /**
   * Clear cache (useful for testing or forcing refresh)
   */
  clearCache(): void {
    this.cachedStrategies = null;
    this.lastFetchTime = 0;
  }
}

