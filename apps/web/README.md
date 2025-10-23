# LeadGenLite Web App

Minimal Next.js application with lead capture, storage, and CSV export.

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

## Features

- **Lead Capture Form** (`/lead-capture`) - Collect leads with validation
- **Dashboard** (`/dashboard`) - View leads table with CSV export
- **API** (`/api/leads`) - GET/POST endpoints for lead management
- **Automatic Storage** - File-backed in dev, console fallback in production
- **Email Notifications** - Optional Resend integration
- **TypeScript** - Full type safety
- **Tailwind CSS** - Modern, responsive styling

## Environment Variables

### Storage Driver
```bash
LEADS_DRIVER=file|console  # Default: auto (file in dev, console in prod)
```

### Email Notifications (Optional)
```bash
RESEND_API_KEY=your_resend_api_key
NOTIFY_EMAIL=admin@example.com  # Where to send notifications
```

### Build Info (Auto-generated)
```bash
NEXT_PUBLIC_BUILD_TIME=2025-10-22T...  # Auto-set during build
NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA=abc123  # Auto-set by Vercel
```

## API Endpoints

### POST /api/leads
Create a new lead.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "company": "Acme Inc",
  "phone": "+1234567890",
  "message": "Interested in your product",
  "source": "Landing"
}
```

**Response (201/202):**
```json
{
  "ok": true,
  "id": "uuid-here",
  "note": "stored via console driver"  // Only in production with console driver
}
```

### GET /api/leads
List all leads.

**Response (200):**
```json
{
  "ok": true,
  "items": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "company": "Acme Inc",
      "phone": "+1234567890",
      "message": "...",
      "source": "Landing",
      "createdAt": "2025-10-22T..."
    }
  ]
}
```

## Routes

- `/` - Home page with navigation
- `/lead-capture` - Lead capture form
- `/dashboard` - Leads dashboard with CSV export
- `/signup` - User registration
- `/login` - User login

## Data Storage

### Development
Leads are stored in `apps/web/data/leads.db.json` (file-backed).

### Production
By default, uses console logging. To enable persistent storage in production:
- Set `LEADS_DRIVER=file` (requires writable filesystem)
- Or integrate a database adapter

## CSV Export

The Dashboard includes an "Export CSV" button that generates a downloadable file with all lead data.

## Deployment

### Vercel

The app is configured for Vercel deployment via ORK automation.

```bash
# Link to Vercel
vercel link

# Deploy
vercel deploy --prod
```

### Required Secrets (Optional)
- `RESEND_API_KEY` - For email notifications
- `NOTIFY_EMAIL` - Email address to receive notifications

## Development Notes

- Uses Next.js Pages Router
- File-backed storage only writes in non-production environments
- Email notifications gracefully fall back to console logs
- All forms include client-side validation
- Build info displayed in footer
