import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: '{{APP_NAME}} API',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: '{{APP_NAME}} API',
    description: '{{DESCRIPTION}}',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      {{#HAS_AUTH}}
      auth: {
        login: '/api/auth/login',
        signup: '/api/auth/signup',
        logout: '/api/auth/logout'
      },
      {{/HAS_AUTH}}
      api: '/api'
    }
  });
});

{{#HAS_AUTH}}
// Auth endpoints ({{AUTH_PROVIDER}} provider)
app.post('/api/auth/signup', (req: Request, res: Response) => {
  // TODO: Implement {{AUTH_PROVIDER}} signup
  res.json({ message: 'Signup endpoint - implement {{AUTH_PROVIDER}} auth' });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  // TODO: Implement {{AUTH_PROVIDER}} login
  res.json({ message: 'Login endpoint - implement {{AUTH_PROVIDER}} auth' });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  // TODO: Implement logout
  res.json({ message: 'Logout endpoint' });
});
{{/HAS_AUTH}}

{{#HAS_MONETIZATION}}
// Subscription endpoints ({{MONETIZATION_TYPE}})
app.get('/api/subscription', (req: Request, res: Response) => {
  res.json({
    type: '{{MONETIZATION_TYPE}}',
    price: {{PRICE_USD}},
    currency: 'USD',
    interval: 'month'
  });
});

app.post('/api/subscription/create', (req: Request, res: Response) => {
  // TODO: Implement subscription creation
  res.json({ message: 'Create subscription - implement payment provider' });
});
{{/HAS_MONETIZATION}}

// API routes placeholder
app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: '{{APP_NAME}} API',
    version: '1.0.0'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`[OK] {{APP_NAME}} API listening on port ${PORT}`);
  console.log(`[INFO] Health check: http://localhost:${PORT}/health`);
  {{#HAS_AUTH}}
  console.log(`[INFO] Auth provider: {{AUTH_PROVIDER}}`);
  {{/HAS_AUTH}}
  {{#HAS_MONETIZATION}}
  console.log(`[INFO] Monetization: {{MONETIZATION_TYPE}} - ${{PRICE_USD}}/month`);
  {{/HAS_MONETIZATION}}
});
