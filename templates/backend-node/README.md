# {{APP_NAME}} - Backend API

{{DESCRIPTION}}

## Template Variables

- `{{APP_NAME}}` - Application name
- `{{APP_NAME_LOWER}}` - Lowercase name for packages
- `{{DESCRIPTION}}` - API description
- `{{AUTH_PROVIDER}}` - Authentication provider
- `{{HAS_AUTH}}` - Auth flag
- `{{HAS_MONETIZATION}}` - Monetization flag
- `{{MONETIZATION_TYPE}}` - Monetization type
- `{{PRICE_USD}}` - Price
- `{{DATABASE}}` - Database type

## Stack

- **Runtime:** Node.js
- **Framework:** Express 4.x
- **Language:** TypeScript
- **Database:** {{DATABASE}}
- **Auth:** {{AUTH_PROVIDER}}
- **Deploy:** {{DEPLOY_BACKEND}}

## Endpoints

- `GET /health` - Health check
- `GET /` - API info
- `GET /api` - API root
{{#HAS_AUTH}}
- `POST /api/auth/signup` - User signup
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
{{/HAS_AUTH}}
{{#HAS_MONETIZATION}}
- `GET /api/subscription` - Get subscription info
- `POST /api/subscription/create` - Create subscription
{{/HAS_MONETIZATION}}

## Development

```bash
npm install
cp .env.example .env
npm run dev
```

## Build & Deploy

```bash
npm run build
npm start
```

Deploy to: {{DEPLOY_BACKEND}}

## Features

- Health check endpoint
- CORS enabled
- Helmet security headers
{{#HAS_AUTH}}
- {{AUTH_PROVIDER}} authentication (stub)
{{/HAS_AUTH}}
{{#HAS_MONETIZATION}}
- {{MONETIZATION_TYPE}} monetization (stub)
{{/HAS_MONETIZATION}}
