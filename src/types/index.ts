/**
 * Type definitions for the application
 */
export type VaultType =
  | 'vesuEth'
  | 'vesuStrk'
  | 'vesuUsdc'
  | 'vesuUsdt'
  | 'ekuboStrkXstrk';

export interface TrovesContractData {
  vaultType: VaultType;
  contractAddress: string;
  totalAssets: string;
  asset: string;
  settings: {
    defaultPoolIndex: number;
    feeBps: number;
    feeReceiver: string;
  };
  allowedPools: Array<{
    poolId: string;
    maxWeight: number;
    vToken: string;
  }>;
  previousIndex: string;
}

export interface YieldData {
  yieldBefore: string;
  yieldAfter: string;
}
