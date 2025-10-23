# LeadGenLite Web App

Minimal Next.js application with authentication flows and dashboard.

## Quick Start

### Development

```bash
# Install dependencies
npm ci

# Start development server
npm run dev
```

Visit http://localhost:3000

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Deployment

This app is configured for Vercel deployment via ORK automation.

### Vercel Integration

The app automatically reads Vercel environment variables:

- `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` - Git commit SHA (shown in footer)
- `NEXT_PUBLIC_BUILD_TIME` - Build timestamp (auto-generated if not set)

To link this project to Vercel:

```bash
vercel link
```

To deploy manually:

```bash
vercel deploy --prod
```

### Environment Variables

No environment variables are required for basic functionality. The footer will show:
- **Build time**: Auto-generated during `npm run build`
- **Commit SHA**: Automatically provided by Vercel, or "local" in development

## Routes

- `/` - Home page with navigation
- `/signup` - User registration form
- `/login` - User login form
- `/dashboard` - Protected dashboard (after login)

## Features

- TypeScript throughout
- Tailwind CSS for styling
- Top navigation bar
- Build info footer (commit SHA + build time)
- Responsive design

## Development Notes

The app uses Next.js Pages Router (not App Router). All routes are in `pages/`.

Build info is injected via `next.config.js` and displayed in the footer component.
