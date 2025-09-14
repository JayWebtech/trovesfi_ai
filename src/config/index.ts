/**
 * Application configuration
 */

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  rpcUrl: process.env.MAINNET_RPC,
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || '',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },
  troves: {
    contracts: {
      vesuEth: process.env.TROVES_CONTRACT_ADDRESS_VESU_ETH || '',
      vesuStrk: process.env.TROVES_CONTRACT_ADDRESS_VESU_STRK || '',
      vesuUsdc: process.env.TROVES_CONTRACT_ADDRESS_VESU_USDC || '',
      vesuUsdt: process.env.TROVES_CONTRACT_ADDRESS_VESU_USDT || '',
      ekuboStrkXstrk:
        process.env.TROVES_CONTRACT_ADDRESS_EKUBO_STRK_XSTRK || '',
    },
  },
};
