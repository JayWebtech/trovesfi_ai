# Troves.fi AI Telegram Bot

A Telegram bot that provides AI-powered assistance for Troves.fi, the yield aggregator on Starknet. Users can ask questions in natural language and get real-time contract data and information.

## Features

🤖 **AI-Powered Chat**
- Natural language processing using Anthropic's Claude
- Intelligent query analysis to determine if contract data is needed
- Contextual responses about Troves.fi and Starknet

📊 **Real-Time Contract Data**
- Current yield information
- Total assets and TVL
- Available pools and strategies
- Fee information
- User balance queries
- Asset/shares conversion

🔍 **Smart Query Processing**
- Automatically detects when contract data is needed
- Provides comprehensive responses with real-time data
- Fallback to general information when appropriate

## Commands

- `/start` - Welcome message and introduction
- `/help` - Detailed help information
- `/status` - Get current contract status and metrics
- `/balance <address>` - Get balance for a specific Starknet address

## Setup

### 1. Environment Variables

Copy `env.example` to `.env` and fill in the required values:

```bash
cp env.example .env
```

Required environment variables:
- `TELEGRAM_BOT_TOKEN` - Your Telegram bot token from @BotFather
- `ANTHROPIC_API_KEY` - Your Anthropic API key
- `TROVES_CONTRACT_ADDRESS` - Troves.fi contract address
- `SEPOLIA_RPC` or `MAINNET_RPC` - Starknet RPC endpoints

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Application

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run prod
```

## API Endpoints

The bot also exposes REST API endpoints:

- `GET /api/troves/status` - Contract status and metrics
- `GET /api/troves/balance/:address` - User balance
- `GET /api/troves/yield` - Yield information
- `GET /api/troves/pools` - Available pools
- `POST /api/troves/query` - AI query processing
- `GET /api/troves/convert/shares?assets=<amount>` - Convert assets to shares
- `GET /api/troves/convert/assets?shares=<amount>` - Convert shares to assets

## Usage Examples

### Telegram Bot

Users can ask questions like:
- "What's the current yield on Troves.fi?"
- "How much are the fees?"
- "What pools are available?"
- "What is Troves.fi?"
- "How do I get started with yield farming?"

### API Usage

```bash
# Get contract status
curl http://localhost:3000/api/troves/status

# Get user balance
curl http://localhost:3000/api/troves/balance/0x123...

# Query AI
curl -X POST http://localhost:3000/api/troves/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the current yield?"}'
```

## Architecture

```
src/
├── services/
│   ├── telegramBot.ts      # Telegram bot logic
│   ├── aiService.ts        # Anthropic AI integration
│   └── contractService.ts  # Starknet contract interactions
├── routes/
│   └── troves.ts          # REST API endpoints
├── constants/
│   └── abi.ts            # Troves.fi contract ABI
├── config/
│   └── index.ts          # Configuration management
└── types/
    └── index.ts          # TypeScript type definitions
```

## Technologies Used

- **Node.js** with **TypeScript**
- **Express.js** for REST API
- **Starknet.js** for blockchain interactions
- **Anthropic Claude** for AI processing
- **Telegram Bot API** for chat interface

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License
