import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Troves.fi AI API',
      version: '1.0.0',
      description:
        'API for Troves.fi Telegram Bot with Starknet contract interactions and AI-powered queries',
      contact: {
        name: 'Troves.fi',
        url: 'https://troves.fi',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
      {
        url: 'https://your-domain.com',
        description: 'Production server',
      },
    ],
    components: {
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Operation successful',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
            error: {
              type: 'string',
              example: 'Detailed error information',
            },
          },
        },
        VaultType: {
          type: 'string',
          enum: [
            'vesuEth',
            'vesuStrk',
            'vesuUsdc',
            'vesuUsdt',
            'ekuboStrkXstrk',
          ],
          example: 'vesuEth',
        },
        ContractData: {
          type: 'object',
          properties: {
            vaultType: {
              $ref: '#/components/schemas/VaultType',
            },
            contractAddress: {
              type: 'string',
              example:
                '0x05eaf5ee75231cecf79921ff8ded4b5ffe96be718bcb3daf206690ad1a9ad0ca',
            },
            totalAssets: {
              type: 'string',
              example: '1000000000000000000000',
            },
            asset: {
              type: 'string',
              example:
                '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c7b7b7b7b7b7b7b7b7b7b',
            },
            settings: {
              type: 'object',
              properties: {
                defaultPoolIndex: {
                  type: 'number',
                  example: 0,
                },
                feeBps: {
                  type: 'number',
                  example: 100,
                },
                feeReceiver: {
                  type: 'string',
                  example: '0x1234567890abcdef1234567890abcdef12345678',
                },
              },
            },
            allowedPools: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  poolId: {
                    type: 'string',
                    example: '0x1234567890abcdef1234567890abcdef12345678',
                  },
                  maxWeight: {
                    type: 'number',
                    example: 10000,
                  },
                  vToken: {
                    type: 'string',
                    example: '0x1234567890abcdef1234567890abcdef12345678',
                  },
                },
              },
            },
            previousIndex: {
              type: 'string',
              example: '1000000000000000000',
            },
          },
        },
        YieldData: {
          type: 'object',
          properties: {
            yieldBefore: {
              type: 'string',
              example: '1000000000000000000',
            },
            yieldAfter: {
              type: 'string',
              example: '1050000000000000000',
            },
          },
        },
        BalanceData: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              example: '0x1234567890abcdef1234567890abcdef12345678',
            },
            balance: {
              type: 'string',
              example: '100000000000000000000',
            },
            totalSupply: {
              type: 'string',
              example: '10000000000000000000000',
            },
            totalAssets: {
              type: 'string',
              example: '10000000000000000000000',
            },
            percentage: {
              type: 'number',
              example: 1.0,
            },
          },
        },
        AIResponse: {
          type: 'object',
          properties: {
            response: {
              type: 'string',
              example: 'Based on the current Troves.fi data...',
            },
            vaultType: {
              $ref: '#/components/schemas/VaultType',
            },
            contractQuery: {
              type: 'string',
              example: 'total_assets',
            },
            imageUrls: {
              type: 'array',
              items: {
                type: 'string',
                format: 'uri',
              },
              example: ['https://troves.fi/image1.png'],
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const specs = swaggerJsdoc(options);
