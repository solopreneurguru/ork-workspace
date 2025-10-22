# {{APP_NAME}}

{{DESCRIPTION}}

## Template Variables

This template uses Handlebars/Mustache syntax for variable substitution:

- `{{APP_NAME}}` - Application name from BuildSpec
- `{{DESCRIPTION}}` - Project description
- `{{AUTH_PROVIDER}}` - Authentication provider (email, google, github, etc.)
- `{{HAS_AUTH}}` - Boolean flag for auth presence
- `{{HAS_MONETIZATION}}` - Boolean flag for monetization
- `{{MONETIZATION_TYPE}}` - Type of monetization
- `{{PRICE_USD}}` - Price in USD

## Stack

- **Framework:** Next.js 15.1.3
- **Auth:** {{AUTH_PROVIDER}}
- **Deploy:** {{DEPLOY_WEB}}

## Features

{{#FEATURES}}
- {{.}}
{{/FEATURES}}

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm start
```

## Deploy

Configured for: {{DEPLOY_WEB}}
