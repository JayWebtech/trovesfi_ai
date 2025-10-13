# Troves.fi AI Assistant 🤖

An intelligent AI-powered assistant for Troves.fi, a yield aggregator built on Starknet. This service provides natural language querying capabilities for DeFi strategies, vault data, and blockchain interactions through multiple messaging platforms.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Project](#running-the-project)
- [API Documentation](#api-documentation)
- [Messaging Platforms](#messaging-platforms)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Production Deployment](#production-deployment)

## ✨ Features

- **AI-Powered Query Processing**: Uses Anthropic Claude to understand and respond to natural language queries about Troves.fi strategies
- **Multi-Platform Support**: Telegram and WhatsApp bot integration for seamless user interaction
- **Real-time Strategy Data**: Fetches live data from Troves.fi API including APY, TVL, and strategy details
- **Smart Contract Integration**: Direct interaction with Starknet smart contracts for vault operations
- **Investment Calculator**: Calculate potential returns with performance fee considerations
- **RESTful API**: Comprehensive API for vault status, balances, yields, and strategy information
- **Swagger Documentation**: Auto-generated API documentation available at `/api-docs`
- **Conversation History**: Maintains context across user interactions

## 🛠 Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Blockchain**: Starknet (via starknet.js)
- **AI**: Anthropic Claude (claude-3-5-sonnet)
- **Messaging**: 
  - Telegram Bot API
  - WhatsApp Cloud API
- **Documentation**: Swagger/OpenAPI
- **Testing/Development**: ts-node, nodemon

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager
- **Git** (optional, for cloning)

You'll also need API keys/credentials for:
- Anthropic API (for AI capabilities)
- Telegram Bot Token (for Telegram integration)
- WhatsApp Cloud API credentials (for WhatsApp integration)
- Starknet RPC endpoint URLs

## 🚀 Installation

1. **Clone the repository** (or navigate to your project directory):

```bash
git clone <your-repository-url>
cd trovesfi_ai
```

2. **Install dependencies**:

```bash
npm install
```

3. **Set up environment variables**:

```bash
cp env.example .env
```

Then edit `.env` with your actual credentials (see [Configuration](#configuration) section).

## ⚙️ Configuration

Create a `.env` file in the root directory with the following variables:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Starknet Configuration
SEPOLIA_RPC=https://starknet-sepolia.public.blastapi.io
MAINNET_RPC=https://starknet-mainnet.public.blastapi.io

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your-telegram-bot-token-here
TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhook

# WhatsApp Cloud API Configuration
WHATSAPP_ACCESS_TOKEN=your-whatsapp-access-token-here
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id-here
WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-account-id-here
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-webhook-verify-token-here
WHATSAPP_API_VERSION=v17.0

# Anthropic Configuration
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

### Getting API Keys

#### Anthropic API Key
1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Generate a new API key

#### Telegram Bot Token
1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow the instructions to create your bot
4. Copy the bot token provided

#### WhatsApp Cloud API
1. Visit [Meta for Developers](https://developers.facebook.com/)
2. Create a new app or select existing one
3. Add WhatsApp product
4. Get your access token and phone number ID from the dashboard

## 🏃 Running the Project

### Development Mode

Run the development server with hot reload:

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or your specified PORT).

### Production Mode

1. **Build the project**:

```bash
npm run build
```

2. **Start the production server**:

```bash
npm start
```

Or use the combined command:

```bash
npm run prod
```

### Watch Mode

For continuous compilation during development:

```bash
npm run watch
```

## 📚 API Documentation

Once the server is running, access the interactive API documentation at:

```
http://localhost:3000/api-docs
```

### Main Endpoints

#### Health Check
```
GET /health
```
Returns server health status.

#### Vault Status
```
GET /api/troves/status
```
Get comprehensive vault status including total assets, yield data, and total supply.

#### User Balance
```
GET /api/troves/balance/:address
```
Get user balance for a specific wallet address.

#### Yield Information
```
GET /api/troves/yield
```
Get current yield information for the vault.

#### Strategy Operations
```
GET /api/troves/strategies          # Get all strategies
GET /api/troves/strategies/:id      # Get specific strategy
GET /api/troves/strategies/search/token?symbol=STRK  # Search by token
GET /api/troves/strategies/top/apy?limit=10         # Top strategies by APY
GET /api/troves/strategies/top/tvl?limit=10         # Top strategies by TVL
```

#### AI Query
```
POST /api/troves/query
Content-Type: application/json

{
  "query": "What is the current yield for VESU ETH vault?"
}
```

#### Conversion Operations
```
GET /api/troves/convert/shares?assets=1000000000000000000000
GET /api/troves/convert/assets?shares=1000000000000000000000
```

#### Allowed Pools
```
GET /api/troves/pools
```

## 💬 Messaging Platforms

### Telegram Bot

The Telegram bot automatically starts when you run the server with a valid `TELEGRAM_BOT_TOKEN`.

**Available Commands**:
- `/start` - Start conversation with the bot
- `/help` - Get help information
- `/status` - Check server and bot status
- Send any message to query about Troves.fi strategies

### WhatsApp Bot

The WhatsApp bot uses webhook integration with Meta's Cloud API.

**Setup Webhook**:
1. Set up your webhook URL in Meta Developer Console
2. Use verification token from your `.env` file
3. Subscribe to message events

**Webhook Endpoints**:
- `GET /webhook/whatsapp` - Webhook verification
- `POST /webhook/whatsapp` - Receive messages

## 📁 Project Structure

```
trovesfi_ai/
├── src/
│   ├── app.ts                 # Express app setup
│   ├── index.ts              # Entry point
│   ├── config/
│   │   ├── index.ts          # Configuration management
│   │   └── swagger.ts        # Swagger/OpenAPI setup
│   ├── constants/
│   │   └── abi.ts           # Smart contract ABIs
│   ├── routes/
│   │   └── troves.ts        # API routes
│   ├── services/
│   │   ├── aiService.ts         # Anthropic AI integration
│   │   ├── contractService.ts   # Starknet contract interactions
│   │   ├── messagingService.ts  # Platform orchestration
│   │   ├── strategyService.ts   # Strategy data management
│   │   ├── telegramBot.ts       # Telegram bot service
│   │   └── whatsappBot.ts       # WhatsApp bot service
│   ├── types/
│   │   ├── index.ts            # Type definitions
│   │   └── messaging.ts        # Messaging interfaces
│   └── utils/                  # Utility functions
├── public/
│   └── privacy-policy.html    # Privacy policy (required for WhatsApp)
├── dist/                      # Compiled JavaScript (generated)
├── node_modules/             # Dependencies
├── package.json              # Project metadata
├── tsconfig.json            # TypeScript configuration
├── env.example              # Environment variables template
└── README.md               # This file
```

## 📜 Available Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm run watch        # Watch mode for TypeScript compilation

# Building
npm run build        # Compile TypeScript to JavaScript

# Production
npm start            # Run compiled production code
npm run prod         # Build and run production

# Code Formatting
npm run fmt          # Format code with Prettier
npm run fmt:check    # Check code formatting

# Maintenance
npm run clean        # Remove dist folder
```

## 🔐 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 3000 |
| `NODE_ENV` | Environment mode | No | development |
| `SEPOLIA_RPC` | Starknet Sepolia RPC URL | Yes | - |
| `MAINNET_RPC` | Starknet Mainnet RPC URL | Yes | - |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | No | - |
| `TELEGRAM_WEBHOOK_URL` | Telegram webhook URL | No | - |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp access token | No | - |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp phone number ID | No | - |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | WhatsApp business account ID | No | - |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | WhatsApp webhook verify token | No | - |
| `WHATSAPP_API_VERSION` | WhatsApp API version | No | v17.0 |
| `ANTHROPIC_API_KEY` | Anthropic API key | Yes | - |

## 🔧 Development

### TypeScript Configuration

The project uses TypeScript with strict mode enabled. Configuration in `tsconfig.json`:

- Target: ES2020
- Module: CommonJS
- Strict type checking enabled
- Source maps generated for debugging

### Code Formatting

This project uses Prettier for code formatting:

```bash
npm run fmt        # Format all files
npm run fmt:check  # Check formatting without changes
```

### Adding New Features

1. Create new service files in `src/services/`
2. Define types in `src/types/`
3. Add routes in `src/routes/`
4. Update Swagger documentation with JSDoc comments

## 🚀 Production Deployment

### Build Process

1. **Install dependencies**:
```bash
npm ci
```

2. **Build the project**:
```bash
npm run build
```

3. **Set environment variables** for production

4. **Start the server**:
```bash
npm start
```

### Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure production RPC endpoints
- [ ] Set up SSL/TLS certificates
- [ ] Configure reverse proxy (nginx/Apache)
- [ ] Set up process manager (PM2, systemd)
- [ ] Enable logging and monitoring
- [ ] Configure firewall rules
- [ ] Set up automatic restarts
- [ ] Configure CORS for production domains

### Using PM2 (Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start dist/index.js --name trovesfi-ai

# Monitor
pm2 monit

# View logs
pm2 logs trovesfi-ai

# Restart
pm2 restart trovesfi-ai

# Stop
pm2 stop trovesfi-ai
```

### Docker Deployment (Optional)

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t trovesfi-ai .
docker run -p 3000:3000 --env-file .env trovesfi-ai
```

## 🔒 Security Considerations

- Keep your `.env` file secure and never commit it to version control
- Rotate API keys regularly
- Use HTTPS in production
- Implement rate limiting for API endpoints
- Validate and sanitize all user inputs
- Keep dependencies updated with `npm audit`
- Use environment-specific configurations

## 🐛 Troubleshooting

### Common Issues

**Port already in use**:
```bash
# Change PORT in .env file or kill the process
lsof -ti:3000 | xargs kill
```

**Module not found errors**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**TypeScript compilation errors**:
```bash
# Clean and rebuild
npm run clean
npm run build
```

**Bot not responding**:
- Verify API tokens are correct
- Check network connectivity
- Review server logs for errors
- Ensure webhook URLs are accessible

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check the API documentation at `/api-docs`
- Review the code documentation

## 🙏 Acknowledgments

- [Troves.fi](https://troves.fi) - Yield aggregator platform
- [Starknet](https://starknet.io) - Layer 2 scaling solution
- [Anthropic](https://anthropic.com) - Claude AI
- [Telegram](https://telegram.org) - Messaging platform
- [Meta](https://developers.facebook.com) - WhatsApp Cloud API

---

Built with ❤️ for the Starknet DeFi ecosystem

