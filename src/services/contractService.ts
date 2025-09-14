/**
 * Starknet Contract Service for Troves.fi interactions
 */
import { Provider, Contract, RpcProvider } from 'starknet';
import { config } from '../config';
import { TROVES_ABI } from '../constants/abi';
import { VaultType, TrovesContractData, YieldData } from '../types';

export class ContractService {
  private provider: Provider;
  private contracts: Map<VaultType, Contract>;

  constructor() {
    this.provider = new RpcProvider({ nodeUrl: config.rpcUrl });
    this.contracts = new Map();
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
   * Get contract for specific vault type
   */
  private getContract(vaultType: VaultType): Contract {
    const contract = this.contracts.get(vaultType);
    if (!contract) {
      throw new Error(`Contract not found for vault type: ${vaultType}`);
    }
    return contract;
  }

  /**
   * Get available vault types
   */
  getAvailableVaults(): VaultType[] {
    return Array.from(this.contracts.keys());
  }

  /**
   * Get total assets in the contract
   */
  async getTotalAssets(vaultType: VaultType): Promise<string> {
    try {
      const contract = this.getContract(vaultType);
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
  async getAsset(vaultType: VaultType): Promise<string> {
    try {
      const contract = this.getContract(vaultType);
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
  async getSettings(vaultType: VaultType): Promise<{
    defaultPoolIndex: number;
    feeBps: number;
    feeReceiver: string;
  }> {
    try {
      const contract = this.getContract(vaultType);
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
    vaultType: VaultType
  ): Promise<Array<{ poolId: string; maxWeight: number; vToken: string }>> {
    try {
      const contract = this.getContract(vaultType);
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
  async getPreviousIndex(vaultType: VaultType): Promise<string> {
    try {
      const contract = this.getContract(vaultType);
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
  async computeYield(vaultType: VaultType): Promise<YieldData> {
    try {
      const contract = this.getContract(vaultType);
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
    vaultType: VaultType
  ): Promise<string> {
    try {
      const contract = this.getContract(vaultType);
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
  async getTotalSupply(vaultType: VaultType): Promise<string> {
    try {
      const contract = this.getContract(vaultType);
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
  async getContractData(vaultType: VaultType): Promise<TrovesContractData> {
    try {
      const [totalAssets, asset, settings, allowedPools, previousIndex] =
        await Promise.all([
          this.getTotalAssets(vaultType),
          this.getAsset(vaultType),
          this.getSettings(vaultType),
          this.getAllowedPools(vaultType),
          this.getPreviousIndex(vaultType),
        ]);

      return {
        vaultType,
        contractAddress: config.troves.contracts[vaultType],
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
  async convertToShares(assets: string, vaultType: VaultType): Promise<string> {
    try {
      const contract = this.getContract(vaultType);
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
  async convertToAssets(shares: string, vaultType: VaultType): Promise<string> {
    try {
      const contract = this.getContract(vaultType);
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
  async previewDeposit(assets: string, vaultType: VaultType): Promise<string> {
    try {
      const contract = this.getContract(vaultType);
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
  async previewWithdraw(assets: string, vaultType: VaultType): Promise<string> {
    try {
      const contract = this.getContract(vaultType);
      const result = await contract.call('preview_withdraw', [assets]);
      return result.toString();
    } catch (error) {
      console.error('Error previewing withdraw:', error);
      throw new Error('Failed to preview withdraw');
    }
  }
}
