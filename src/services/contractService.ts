/**
 * Starknet Contract Service for Troves.fi interactions
 */
import { Provider, Contract, RpcProvider } from 'starknet';
import { config } from '../config';
import { TROVES_ABI } from '../constants/abi';
import { VaultType, TrovesContractData, YieldData } from '../types';
import { StrategyService } from './strategyService';

export class ContractService {
  private provider: Provider;
  private contracts: Map<string, Contract>;
  private strategyService: StrategyService;

  constructor() {
    this.provider = new RpcProvider({ nodeUrl: config.rpcUrl });
    this.contracts = new Map();
    this.strategyService = new StrategyService();
    
    // Initialize contracts from env if available (for backward compatibility)
    Object.entries(config.troves.contracts).forEach(([key, address]) => {
      if (address) {
        this.contracts.set(
          key as VaultType,
          new Contract(TROVES_ABI, address, this.provider)
        );
      }
    });
  }

  /**
   * Get contract for specific vault type or strategy ID
   * Now dynamically fetches from strategies API if not in cache
   */
  private async getContract(vaultTypeOrStrategyId: VaultType | string): Promise<Contract> {
    // Check if contract is already cached
    if (this.contracts.has(vaultTypeOrStrategyId)) {
      return this.contracts.get(vaultTypeOrStrategyId)!;
    }

    // Try to fetch contract address from strategies API
    try {
      const contractAddress = await this.strategyService.getContractAddressByStrategyId(vaultTypeOrStrategyId);
      
      if (!contractAddress) {
        throw new Error(`Contract address not found for strategy: ${vaultTypeOrStrategyId}`);
      }

      // Create and cache the contract
      const contract = new Contract(TROVES_ABI, contractAddress, this.provider);
      this.contracts.set(vaultTypeOrStrategyId, contract);
      
      console.log(`✅ Dynamically loaded contract for ${vaultTypeOrStrategyId}: ${contractAddress}`);
      
      return contract;
    } catch (error) {
      throw new Error(`Failed to get contract for ${vaultTypeOrStrategyId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get contract by strategy ID (public method)
   */
  async getContractByStrategyId(strategyId: string): Promise<Contract> {
    return this.getContract(strategyId);
  }

  /**
   * Get available vault types
   */
  getAvailableVaults(): string[] {
    return Array.from(this.contracts.keys());
  }

  /**
   * Get total assets in the contract
   */
  async getTotalAssets(vaultTypeOrStrategyId: VaultType | string): Promise<string> {
    try {
      const contract = await this.getContract(vaultTypeOrStrategyId);
      const result = await contract.call('total_assets');
      return result.toString();
    } catch (error) {
      console.error('Error getting total assets:', error);
      throw new Error('Failed to fetch total assets');
    }
  }

  /**
   * Get the underlying asset address
   */
  async getAsset(vaultTypeOrStrategyId: VaultType | string): Promise<string> {
    try {
      const contract = await this.getContract(vaultTypeOrStrategyId);
      const result = await contract.call('asset');
      return result.toString();
    } catch (error) {
      console.error('Error getting asset:', error);
      throw new Error('Failed to fetch asset address');
    }
  }

  /**
   * Get contract settings
   */
  async getSettings(vaultTypeOrStrategyId: VaultType | string): Promise<{
    defaultPoolIndex: number;
    feeBps: number;
    feeReceiver: string;
  }> {
    try {
      const contract = await this.getContract(vaultTypeOrStrategyId);
      const result = (await contract.call('get_settings')) as any;
      return {
        defaultPoolIndex: Number(result.default_pool_index),
        feeBps: Number(result.fee_bps),
        feeReceiver: result.fee_receiver.toString(),
      };
    } catch (error) {
      console.error('Error getting settings:', error);
      throw new Error('Failed to fetch contract settings');
    }
  }

  /**
   * Get allowed pools
   */
  async getAllowedPools(
    vaultTypeOrStrategyId: VaultType | string
  ): Promise<Array<{ poolId: string; maxWeight: number; vToken: string }>> {
    try {
      const contract = await this.getContract(vaultTypeOrStrategyId);
      const result = (await contract.call('get_allowed_pools')) as any;
      return result.map((pool: any) => ({
        poolId: pool.pool_id.toString(),
        maxWeight: Number(pool.max_weight),
        vToken: pool.v_token.toString(),
      }));
    } catch (error) {
      console.error('Error getting allowed pools:', error);
      throw new Error('Failed to fetch allowed pools');
    }
  }

  /**
   * Get previous index
   */
  async getPreviousIndex(vaultTypeOrStrategyId: VaultType | string): Promise<string> {
    try {
      const contract = await this.getContract(vaultTypeOrStrategyId);
      const result = await contract.call('get_previous_index');
      return result.toString();
    } catch (error) {
      console.error('Error getting previous index:', error);
      throw new Error('Failed to fetch previous index');
    }
  }

  /**
   * Compute yield information
   */
  async computeYield(vaultTypeOrStrategyId: VaultType | string): Promise<YieldData> {
    try {
      const contract = await this.getContract(vaultTypeOrStrategyId);
      const result = (await contract.call('compute_yield')) as any;
      return {
        yieldBefore: result[0].toString(),
        yieldAfter: result[1].toString(),
      };
    } catch (error) {
      console.error('Error computing yield:', error);
      throw new Error('Failed to compute yield');
    }
  }

  /**
   * Get user balance
   */
  async getUserBalance(
    userAddress: string,
    vaultTypeOrStrategyId: VaultType | string
  ): Promise<string> {
    try {
      const contract = await this.getContract(vaultTypeOrStrategyId);
      const result = await contract.call('balance_of', [userAddress]);
      return result.toString();
    } catch (error) {
      console.error('Error getting user balance:', error);
      throw new Error('Failed to fetch user balance');
    }
  }

  /**
   * Get total supply
   */
  async getTotalSupply(vaultTypeOrStrategyId: VaultType | string): Promise<string> {
    try {
      const contract = await this.getContract(vaultTypeOrStrategyId);
      const result = await contract.call('total_supply');
      return result.toString();
    } catch (error) {
      console.error('Error getting total supply:', error);
      throw new Error('Failed to fetch total supply');
    }
  }

  /**
   * Get comprehensive contract data
   */
  async getContractData(vaultTypeOrStrategyId: VaultType | string): Promise<TrovesContractData> {
    try {
      const [totalAssets, asset, settings, allowedPools, previousIndex] =
        await Promise.all([
          this.getTotalAssets(vaultTypeOrStrategyId),
          this.getAsset(vaultTypeOrStrategyId),
          this.getSettings(vaultTypeOrStrategyId),
          this.getAllowedPools(vaultTypeOrStrategyId),
          this.getPreviousIndex(vaultTypeOrStrategyId),
        ]);

      // Get contract address - check if it's in config first, otherwise from strategy
      let contractAddress = config.troves.contracts[vaultTypeOrStrategyId as VaultType];
      if (!contractAddress) {
        contractAddress = await this.strategyService.getContractAddressByStrategyId(vaultTypeOrStrategyId) || '';
      }

      return {
        vaultType: vaultTypeOrStrategyId as VaultType,
        contractAddress,
        totalAssets,
        asset,
        settings,
        allowedPools,
        previousIndex,
      };
    } catch (error) {
      console.error('Error getting contract data:', error);
      throw new Error('Failed to fetch contract data');
    }
  }

  /**
   * Convert assets to shares
   */
  async convertToShares(assets: string, vaultTypeOrStrategyId: VaultType | string): Promise<string> {
    try {
      const contract = await this.getContract(vaultTypeOrStrategyId);
      const result = await contract.call('convert_to_shares', [assets]);
      return result.toString();
    } catch (error) {
      console.error('Error converting to shares:', error);
      throw new Error('Failed to convert assets to shares');
    }
  }

  /**
   * Convert shares to assets
   */
  async convertToAssets(shares: string, vaultTypeOrStrategyId: VaultType | string): Promise<string> {
    try {
      const contract = await this.getContract(vaultTypeOrStrategyId);
      const result = await contract.call('convert_to_assets', [shares]);
      return result.toString();
    } catch (error) {
      console.error('Error converting to assets:', error);
      throw new Error('Failed to convert shares to assets');
    }
  }

  /**
   * Preview deposit
   */
  async previewDeposit(assets: string, vaultTypeOrStrategyId: VaultType | string): Promise<string> {
    try {
      const contract = await this.getContract(vaultTypeOrStrategyId);
      const result = await contract.call('preview_deposit', [assets]);
      return result.toString();
    } catch (error) {
      console.error('Error previewing deposit:', error);
      throw new Error('Failed to preview deposit');
    }
  }

  /**
   * Preview withdraw
   */
  async previewWithdraw(assets: string, vaultTypeOrStrategyId: VaultType | string): Promise<string> {
    try {
      const contract = await this.getContract(vaultTypeOrStrategyId);
      const result = await contract.call('preview_withdraw', [assets]);
      return result.toString();
    } catch (error) {
      console.error('Error previewing withdraw:', error);
      throw new Error('Failed to preview withdraw');
    }
  }
}
