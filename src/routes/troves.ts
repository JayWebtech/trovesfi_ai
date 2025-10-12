/**
 * @swagger
 * tags:
 *   - name: Troves
 *     description: Troves.fi vault operations and AI queries
 */

/**
 * Troves.fi API routes
 */

import { Router, Request, Response } from 'express';
import { ContractService } from '../services/contractService';
import { AIService } from '../services/aiService';
import { StrategyService } from '../services/strategyService';

const router = Router();
const contractService = new ContractService();
const aiService = new AIService();
const strategyService = new StrategyService();

/**
 * @swagger
 * /api/troves/status:
 *   get:
 *     summary: Get vault status and contract data
 *     description: Retrieves comprehensive status information for the first available vault including total assets, yield data, and total supply
 *     tags: [Troves]
 *     responses:
 *       200:
 *         description: Successful response with vault status
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       allOf:
 *                         - $ref: '#/components/schemas/ContractData'
 *                         - type: object
 *                           properties:
 *                             yield:
 *                               $ref: '#/components/schemas/YieldData'
 *                             totalSupply:
 *                               type: string
 *                               example: "10000000000000000000000"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// GET /api/troves/status - Get contract status
router.get('/status', async (_, res: Response) => {
  try {
    const availableVaults = contractService.getAvailableVaults();
    const vaultType = availableVaults[0];
    const contractData = await contractService.getContractData(vaultType);
    const yieldData = await contractService.computeYield(vaultType);
    const totalSupply = await contractService.getTotalSupply(vaultType);

    return res.status(200).json({
      success: true,
      data: {
        ...contractData,
        yield: yieldData,
        totalSupply,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error getting status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch contract status',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/troves/balance/{address}:
 *   get:
 *     summary: Get user balance for a specific address
 *     description: Retrieves the balance of a user for the first available vault, including percentage of total supply
 *     tags: [Troves]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         description: User's wallet address
 *         schema:
 *           type: string
 *           example: "0x1234567890abcdef1234567890abcdef12345678"
 *     responses:
 *       200:
 *         description: Successful response with user balance
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/BalanceData'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// GET /api/troves/balance/:address - Get user balance
router.get('/balance/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    const availableVaults = contractService.getAvailableVaults();
    const vaultType = availableVaults[0]; // Use first available vault
    const balance = await contractService.getUserBalance(address, vaultType);
    const totalSupply = await contractService.getTotalSupply(vaultType);
    const totalAssets = await contractService.getTotalAssets(vaultType);

    // Calculate percentage of total supply
    const percentage = (BigInt(balance) * BigInt(10000)) / BigInt(totalSupply);

    return res.status(200).json({
      success: true,
      data: {
        address,
        balance,
        totalSupply,
        totalAssets,
        percentage: Number(percentage) / 100,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error getting balance:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user balance',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/troves/yield:
 *   get:
 *     summary: Get yield information for the vault
 *     description: Retrieves yield data including yield before and after calculations, along with total assets
 *     tags: [Troves]
 *     responses:
 *       200:
 *         description: Successful response with yield information
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       allOf:
 *                         - $ref: '#/components/schemas/YieldData'
 *                         - type: object
 *                           properties:
 *                             totalAssets:
 *                               type: string
 *                               example: "10000000000000000000000"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// GET /api/troves/yield - Get yield information
router.get('/yield', async (_, res: Response) => {
  try {
    const availableVaults = contractService.getAvailableVaults();
    const vaultType = availableVaults[0]; // Use first available vault
    const yieldData = await contractService.computeYield(vaultType);
    const totalAssets = await contractService.getTotalAssets(vaultType);

    return res.status(200).json({
      success: true,
      data: {
        ...yieldData,
        totalAssets,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error getting yield:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch yield information',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/troves/pools:
 *   get:
 *     summary: Get allowed pools and settings
 *     description: Retrieves information about allowed pools and vault settings for the first available vault
 *     tags: [Troves]
 *     responses:
 *       200:
 *         description: Successful response with pools information
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         pools:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               poolId:
 *                                 type: string
 *                                 example: "0x1234567890abcdef1234567890abcdef12345678"
 *                               maxWeight:
 *                                 type: number
 *                                 example: 10000
 *                               vToken:
 *                                 type: string
 *                                 example: "0x1234567890abcdef1234567890abcdef12345678"
 *                         settings:
 *                           type: object
 *                           properties:
 *                             defaultPoolIndex:
 *                               type: number
 *                               example: 0
 *                             feeBps:
 *                               type: number
 *                               example: 100
 *                             feeReceiver:
 *                               type: string
 *                               example: "0x1234567890abcdef1234567890abcdef12345678"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// GET /api/troves/pools - Get allowed pools
router.get('/pools', async (_, res: Response) => {
  try {
    const availableVaults = contractService.getAvailableVaults();
    const vaultType = availableVaults[0]; // Use first available vault
    const allowedPools = await contractService.getAllowedPools(vaultType);
    const settings = await contractService.getSettings(vaultType);

    return res.status(200).json({
      success: true,
      data: {
        pools: allowedPools,
        settings,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error getting pools:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch pools information',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/troves/query:
 *   post:
 *     summary: Process AI-powered query about Troves.fi
 *     description: Processes natural language queries about Troves.fi using AI and returns contextual responses with optional images
 *     tags: [Troves]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: Natural language question about Troves.fi
 *                 example: "What is the current yield for VESU ETH vault?"
 *     responses:
 *       200:
 *         description: Successful response with AI-generated answer
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AIResponse'
 *       400:
 *         description: Bad request - query is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// POST /api/troves/query - AI query endpoint
router.post('/query', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;

    if (!query) {
      res.status(400).json({
        success: false,
        message: 'Query is required',
      });
      return;
    }

    const userId = (req.headers['x-user-id'] as string) || 'api-user';
    const response = await aiService.processQuery(query, userId);

    return res.status(200).json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error processing query:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process query',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/troves/convert/shares:
 *   get:
 *     summary: Convert assets to shares
 *     description: Converts a specified amount of assets to shares for the first available vault
 *     tags: [Troves]
 *     parameters:
 *       - in: query
 *         name: assets
 *         required: true
 *         description: Amount of assets to convert to shares
 *         schema:
 *           type: string
 *           example: "1000000000000000000000"
 *     responses:
 *       200:
 *         description: Successful conversion result
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         assets:
 *                           type: string
 *                           example: "1000000000000000000000"
 *                         shares:
 *                           type: string
 *                           example: "1000000000000000000000"
 *       400:
 *         description: Bad request - assets amount is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// GET /api/troves/convert/shares - Convert assets to shares
router.get('/convert/shares', async (req: Request, res: Response) => {
  try {
    const { assets } = req.query;

    if (!assets || typeof assets !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Assets amount is required',
      });
      return;
    }

    const availableVaults = contractService.getAvailableVaults();
    const vaultType = availableVaults[0]; // Use first available vault
    const shares = await contractService.convertToShares(assets, vaultType);

    return res.status(200).json({
      success: true,
      data: {
        assets,
        shares,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error converting to shares:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to convert assets to shares',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/troves/convert/assets:
 *   get:
 *     summary: Convert shares to assets
 *     description: Converts a specified amount of shares to assets for the first available vault
 *     tags: [Troves]
 *     parameters:
 *       - in: query
 *         name: shares
 *         required: true
 *         description: Amount of shares to convert to assets
 *         schema:
 *           type: string
 *           example: "1000000000000000000000"
 *     responses:
 *       200:
 *         description: Successful conversion result
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         shares:
 *                           type: string
 *                           example: "1000000000000000000000"
 *                         assets:
 *                           type: string
 *                           example: "1000000000000000000000"
 *       400:
 *         description: Bad request - shares amount is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// GET /api/troves/convert/assets - Convert shares to assets
router.get('/convert/assets', async (req: Request, res: Response) => {
  try {
    const { shares } = req.query;

    if (!shares || typeof shares !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Shares amount is required',
      });
      return;
    }

    const availableVaults = contractService.getAvailableVaults();
    const vaultType = availableVaults[0];
    const assets = await contractService.convertToAssets(shares, vaultType);

    return res.status(200).json({
      success: true,
      data: {
        shares,
        assets,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error converting to assets:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to convert shares to assets',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/troves/strategies:
 *   get:
 *     summary: Get all available strategies
 *     description: Retrieves all yield strategies from Troves.fi with their APY, TVL, and other details
 *     tags: [Troves]
 *     parameters:
 *       - in: query
 *         name: refresh
 *         required: false
 *         description: Force refresh the cache
 *         schema:
 *           type: boolean
 *           example: false
 *     responses:
 *       200:
 *         description: Successful response with strategies list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     strategies:
 *                       type: array
 *                       items:
 *                         type: object
 *                     count:
 *                       type: number
 *                     lastUpdated:
 *                       type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/strategies', async (req: Request, res: Response) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const strategiesData = await strategyService.fetchStrategies(forceRefresh);

    return res.status(200).json({
      success: true,
      data: {
        strategies: strategiesData.strategies,
        count: strategiesData.strategies.length,
        lastUpdated: strategiesData.lastUpdated,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching strategies:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch strategies',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/troves/strategies/{id}:
 *   get:
 *     summary: Get a specific strategy by ID
 *     description: Fetches all strategies from Troves.fi API and filters by the specified ID (case-insensitive)
 *     tags: [Troves]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Strategy ID (e.g., "vesu_fusion_eth", "hyper_xstrk")
 *         schema:
 *           type: string
 *           example: "vesu_fusion_eth"
 *     responses:
 *       200:
 *         description: Successful response with complete strategy details including APY, methodology, etc.
 *       404:
 *         description: Strategy not found
 *       500:
 *         description: Internal server error
 */
router.get('/strategies/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Note: getStrategyById fetches all strategies and filters by ID
    // No separate endpoint exists for single strategy lookup
    const strategy = await strategyService.getStrategyById(id);

    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: `Strategy with ID '${id}' not found`,
      });
    }

    return res.status(200).json({
      success: true,
      data: strategy,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching strategy:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch strategy',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/troves/strategies/search/token:
 *   get:
 *     summary: Search strategies by token
 *     description: Find all strategies that support a specific token
 *     tags: [Troves]
 *     parameters:
 *       - in: query
 *         name: symbol
 *         required: true
 *         description: Token symbol to search for
 *         schema:
 *           type: string
 *           example: "STRK"
 *     responses:
 *       200:
 *         description: Successful response with matching strategies
 *       400:
 *         description: Token symbol is required
 *       500:
 *         description: Internal server error
 */
router.get('/strategies/search/token', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.query;

    if (!symbol || typeof symbol !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Token symbol is required',
      });
    }

    const strategies = await strategyService.searchStrategiesByToken(symbol);

    return res.status(200).json({
      success: true,
      data: {
        strategies,
        count: strategies.length,
        searchTerm: symbol,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error searching strategies:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search strategies',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/troves/strategies/top/apy:
 *   get:
 *     summary: Get top strategies by APY
 *     description: Retrieves strategies sorted by highest APY
 *     tags: [Troves]
 *     parameters:
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Number of strategies to return
 *         schema:
 *           type: number
 *           example: 10
 *     responses:
 *       200:
 *         description: Successful response with top APY strategies
 *       500:
 *         description: Internal server error
 */
router.get('/strategies/top/apy', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const strategies = await strategyService.getTopStrategiesByApy(limit);

    return res.status(200).json({
      success: true,
      data: {
        strategies,
        count: strategies.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching top APY strategies:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch top APY strategies',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @swagger
 * /api/troves/strategies/top/tvl:
 *   get:
 *     summary: Get top strategies by TVL
 *     description: Retrieves strategies sorted by highest TVL
 *     tags: [Troves]
 *     parameters:
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Number of strategies to return
 *         schema:
 *           type: number
 *           example: 10
 *     responses:
 *       200:
 *         description: Successful response with top TVL strategies
 *       500:
 *         description: Internal server error
 */
router.get('/strategies/top/tvl', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const strategies = await strategyService.getTopStrategiesByTvl(limit);

    return res.status(200).json({
      success: true,
      data: {
        strategies,
        count: strategies.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching top TVL strategies:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch top TVL strategies',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
