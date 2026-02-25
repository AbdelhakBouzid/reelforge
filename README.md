# ReelForge

ReelForge is a full-stack SaaS to generate AI images and short reels from customer prompts.

- Frontend: Vite + React + TypeScript + Tailwind
- Backend: Vercel Serverless Functions (`/api`)
- Database: PostgreSQL + Prisma
- Auth: Email/password + JWT access/refresh
- Billing: PayPal subscriptions + one-time credit packs
- AI: `mock` mode (default) or live `replicate` mode

## Structure

```text
/
  web/
  api/
  packages/shared/
  prisma/
  scripts/
```

## Scripts

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run prisma:migrate`
- `npm run prisma:seed`

## Required Environment Variables (Vercel)

Add these in **Project Settings -> Environment Variables** for **All Environments**:

Core:
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `VITE_API_URL` = `/api`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

PayPal:
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_ENV` = `sandbox` or `live`
- `PAYPAL_WEBHOOK_ID`
- `PAYPAL_RETURN_URL` (example: `https://YOUR_DOMAIN/billing?paypal=success`)
- `PAYPAL_CANCEL_URL` (example: `https://YOUR_DOMAIN/billing?paypal=cancel`)
- `PAYPAL_PLAN_ID_STARTER`
- `PAYPAL_PLAN_ID_PRO`
- `PAYPAL_PLAN_ID_SCALE`

AI Provider:
- `AI_PROVIDER` = `mock` or `replicate`
- `REPLICATE_API_TOKEN`
- `REPLICATE_IMAGE_MODEL` (format `owner/model`)
- `REPLICATE_VIDEO_MODEL` (format `owner/model`)
- `REPLICATE_POLL_INTERVAL_MS`
- `REPLICATE_TIMEOUT_MS`

## Local Setup

1. Install dependencies
```bash
npm install
```

2. Copy env files
```bash
cp .env.example .env
cp web/.env.example web/.env.local
```

3. For local split-port mode set in `web/.env.local`
```bash
VITE_API_URL="http://localhost:3000/api"
```

4. DB migrate + seed
```bash
npm run prisma:migrate
npm run prisma:seed
```

5. Start
```bash
npm run dev
```

## Vercel Deployment (No Output Errors)

Use exactly:
- Root Directory: `./`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

Why `dist`:
- web builds to `web/dist`
- build script copies `web/dist` -> root `dist` automatically

## PayPal Setup (Subscriptions + Packs)

### A) Subscriptions

1. In PayPal dashboard, create 3 subscription plans:
- Starter
- Pro
- Scale

2. Put their Plan IDs in env vars:
- `PAYPAL_PLAN_ID_STARTER`
- `PAYPAL_PLAN_ID_PRO`
- `PAYPAL_PLAN_ID_SCALE`

3. Run seed so local plans link to PayPal IDs:
```bash
npm run prisma:seed
```

### B) One-time credit packs

- Packs are charged by amount directly through PayPal Orders (no fixed PayPal plan ID required).

### C) Webhooks

Create webhook URL:
- `https://YOUR_DOMAIN/api/paypal/webhook`

Enable events:
- `BILLING.SUBSCRIPTION.ACTIVATED`
- `BILLING.SUBSCRIPTION.CANCELLED`
- `BILLING.SUBSCRIPTION.PAYMENT.COMPLETED`
- `PAYMENT.CAPTURE.COMPLETED`

Then copy webhook ID to `PAYPAL_WEBHOOK_ID`.

## API Endpoints (Billing)

- `POST /api/paypal/create-checkout-session`
- `POST /api/paypal/capture-order`
- `POST /api/paypal/activate-subscription`
- `POST /api/paypal/webhook`

Backward compatibility alias kept:
- `POST /api/stripe/create-checkout-session` -> PayPal handler
- `POST /api/stripe/webhook` -> PayPal webhook handler

## AI Reel Generation Modes

### Demo mode (works immediately)
- Set `AI_PROVIDER=mock`
- Generation works with placeholder media

### Live mode (real AI)
- Set `AI_PROVIDER=replicate`
- Add Replicate token and models
- Deploy again

Then users can enter prompt descriptions and generate real reels from the dashboard.

## Notes

- Credits are deducted before generation and refunded on failures.
- Password reset token flow is DB-backed.
- Admin panel supports plans/packs/users/payments/generations.