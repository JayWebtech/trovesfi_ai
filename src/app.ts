import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import { specs } from './config/swagger';
import trovesRoutes from './routes/troves';

const app = express();
app.use(helmet());

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
