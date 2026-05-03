# Megamorphosis

Megamorphosis is a Next.js App Router + Supabase MVP for tracking transformation journeys, sharing proof of progress, following other users, and building momentum through social accountability.

## Getting Started

Run the development server:

```bash
npm run dev
```

Open the local URL printed by Next.js.

## Environment

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `RESEND_API_KEY` for transactional email
- `EMAIL_FROM`, for example `Megamorphosis <hello@megamorphosis.com>`

For production, set `NEXT_PUBLIC_SITE_URL` to:

```bash
https://www.megamorphosis.com
```

## Checks

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Production

See `PRODUCTION_CHECKLIST.md`.
