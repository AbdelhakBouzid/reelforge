# ReelForge

ReelForge is a production-minded full-stack SaaS for AI image and short reel generation with credit-based usage, monthly subscriptions, and Stripe checkout.

- Frontend: Vite + React + TypeScript + TailwindCSS
- Backend: Vercel Serverless Functions (`/api`)
- Database: PostgreSQL + Prisma
- Auth: Email/password + JWT access/refresh token rotation
- Payments: Stripe subscriptions + one-time credit packs
- AI: Provider interface + `MockProvider` (works without AI keys)

## Monorepo Structure

```text
/
  web/                 # Vite React app
  api/                 # Vercel serverless functions
  packages/shared/     # shared zod schemas/constants/types
  prisma/              # Prisma schema + seed
  package.json         # workspaces + scripts
```

## Core Features

- Auth endpoints: register, login, refresh, logout, me
- Password reset token flow (DB-backed; dev responses include reset token fallback until email is integrated)
- Credits ledger with debit/refund and balance endpoint
- Generation lifecycle: queued -> processing -> succeeded/failed
- Billing:
  - subscription checkout
  - credit pack checkout
  - webhook processing with signature verification
- Admin APIs for users, generations, payments, plans, packs
- Responsive SaaS UI (public, protected, admin)
- Light/dark theme, toasts, modals, skeleton/empty/error states

## Environment Variables

Copy `.env.example` to `.env` at repository root.

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reelforge"
JWT_SECRET="replace-with-strong-access-secret"
JWT_REFRESH_SECRET="replace-with-strong-refresh-secret"
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
STRIPE_SUCCESS_URL="http://localhost:5173/billing?success=1"
STRIPE_CANCEL_URL="http://localhost:5173/billing?canceled=1"
VITE_API_URL="/api"
ADMIN_EMAIL="admin@reelforge.app"
ADMIN_PASSWORD="ChangeThisPassword123!"
```

Copy `web/.env.example` to `web/.env.local` for local frontend dev.

For local split-port mode (`web` on `5173`, API on `3000`) set:

```bash
VITE_API_URL="http://localhost:3000/api"
```

For Vercel same-project deployment set:

```bash
VITE_API_URL="/api"
```

## Scripts (root)

- `npm install` -> installs dependencies and runs Prisma generate
- `npm run dev` -> runs Vite frontend + `vercel dev` API
- `npm run build` -> builds shared package + web app
- `npm run prisma:migrate` -> runs Prisma dev migration
- `npm run prisma:seed` -> seeds plans/packs and admin user

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env
cp web/.env.example web/.env.local
```

3. Set `web/.env.local` value:

```bash
VITE_API_URL="http://localhost:3000/api"
```

4. Run migrations:

```bash
npm run prisma:migrate
```

5. Seed defaults and admin user:

```bash
npm run prisma:seed
```

6. Start app:

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Local API: `http://localhost:3000/api`

## Stripe Notes

If Stripe keys are missing, checkout endpoints return clear `503 STRIPE_NOT_CONFIGURED` responses (the app still works with mock generation).

### Webhook Verification (Vercel)

`/api/stripe/webhook` verifies signatures using raw request body (`stripe.webhooks.constructEvent(...)`) and `STRIPE_WEBHOOK_SECRET`.

Set webhook URL in Stripe Dashboard:

```text
https://<your-domain>/api/stripe/webhook
```

Recommended events:

- `checkout.session.completed`
- `invoice.paid`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Vercel Deployment (Single Project)

This repo is designed for one Vercel project (frontend + `/api` serverless functions in the same deployment).

1. Push this repo to GitHub.
2. In Vercel, click **Add New Project** and import the GitHub repo.
3. Keep root directory as repository root.
4. Vercel will use `vercel.json`:
   - `buildCommand`: `npm run build`
   - `outputDirectory`: `web/dist`
5. Add environment variables in Vercel Project Settings:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_SUCCESS_URL`
   - `STRIPE_CANCEL_URL`
   - `VITE_API_URL` (set to `/api`)
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
6. Deploy.

After first deploy, run database tasks against production DB:

```bash
npx prisma migrate deploy
npm run prisma:seed
```

(Use your production `DATABASE_URL` and env values while running these commands.)

## Seed Behavior

`prisma/seed.ts` creates:

- Default plans: Starter, Pro, Scale
- Default packs: Boost 50, Boost 250, Boost 1000
- Admin user from `ADMIN_EMAIL`/`ADMIN_PASSWORD`

## API Surface

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/me`

### Credits

- `GET /api/credits/balance`

### Generations

- `POST /api/generations/image`
- `POST /api/generations/video`
- `GET /api/generations?type=&status=&page=`
- `GET /api/generations/:id`

### Stripe

- `POST /api/stripe/create-checkout-session`
- `POST /api/stripe/webhook`

### Admin

- `GET /api/admin/users`
- `GET /api/admin/generations`
- `GET /api/admin/payments`
- `PATCH /api/admin/plans/:id`
- `PATCH /api/admin/packs/:id`

Additional utility endpoints:

- `GET /api/catalog`
- `GET /api/admin/plans`
- `GET /api/admin/packs`
- `PATCH /api/me/profile`
- `PATCH /api/me/password`

## Production Notes

- Auth endpoints include basic in-memory rate limiting per IP.
- All key inputs are validated with Zod on client and server.
- Credits are deducted before generation and refunded on failures.
- Webhook events are deduplicated via `ProcessedWebhookEvent`.
- `MockProvider` enables operation without external AI provider keys.