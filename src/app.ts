import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import { specs } from './config/swagger';
import trovesRoutes from './routes/troves';
import { WhatsAppBotService } from './services/whatsappBot';

const app = express();
app.use(helmet());

// Initialize WhatsApp bot service
const whatsappBot = new WhatsAppBotService();

app.use(
  cors({
    origin:
      config.nodeEnv === 'production'
        ? ['https://yourdomain.com']
        : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  })
);

app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/health', (_, res) => {
  return res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
  });
});

// Swagger documentation
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Troves.fi AI API Documentation',
  })
);

app.use('/api/troves', trovesRoutes);

// WhatsApp Webhook endpoints
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('🔍 Webhook verification attempt:', {
    mode,
    token,
    expectedToken: config.whatsapp.webhookVerifyToken,
    tokenMatch: token === config.whatsapp.webhookVerifyToken,
    modeMatch: mode === 'subscribe',
  });

  if (mode === 'subscribe' && token === config.whatsapp.webhookVerifyToken) {
    console.log('✅ WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    console.log('❌ WhatsApp webhook verification failed');
    res.status(403).send('Forbidden');
  }
});

app.post('/webhook/whatsapp', async (req, res) => {
  try {
    const body = req.body;
    console.log('📨 Received webhook:', JSON.stringify(body, null, 2));

    // Check if it's a WhatsApp webhook
    if (body.object === 'whatsapp_business_account') {
      console.log('✅ Processing WhatsApp webhook message');
      await whatsappBot.processWebhookMessage(body);
      res.status(200).send('OK');
    } else {
      console.log('❌ Not a WhatsApp webhook:', body.object);
      res.status(404).send('Not Found');
    }
  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.use('*', (_, res) => {
  return res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('Error:', err);

    res.status(500).json({
      success: false,
      message:
        config.nodeEnv === 'production' ? 'Internal server error' : err.message,
    });
  }
);

export default app;
