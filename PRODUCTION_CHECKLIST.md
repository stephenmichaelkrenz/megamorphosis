# Megamorphosis Production Checklist

Production domain: `https://www.megamorphosis.com`

## Vercel

- Create the Vercel project from this repository.
- Add `NEXT_PUBLIC_SITE_URL=https://www.megamorphosis.com`.
- Add `NEXT_PUBLIC_SUPABASE_URL` from the production Supabase project.
- Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the production Supabase project.
- Run the Vercel production build and confirm `npm run build` passes.
- Add `www.megamorphosis.com` to the Vercel project domains.
- Decide whether `megamorphosis.com` redirects to `www.megamorphosis.com`.

## Supabase

- Confirm all migrations in `supabase/migrations` are applied.
- Confirm Auth site URL is `https://www.megamorphosis.com`.
- Add redirect URLs:
  - `https://www.megamorphosis.com/auth/callback`
  - `https://www.megamorphosis.com/auth/callback?next=/onboarding`
  - `https://www.megamorphosis.com/auth/callback?next=/auth/update-password`
  - `https://www.megamorphosis.com/auth/login`
  - `https://www.megamorphosis.com/onboarding`
  - `https://www.megamorphosis.com/dashboard`
- Confirm storage bucket policies for journey update images.
- Confirm RLS policies cover profiles, follows, posts, journeys, updates, comments, reports, blocks, respects, and notifications.
- Confirm `platform_moderators` contains the production admin user after first admin onboarding.
- Confirm `/moderation` is gated by the `is_platform_moderator()` database role check.

## Domain

- Point DNS for `www.megamorphosis.com` to Vercel.
- Add the apex domain if desired and configure redirect behavior.
- Confirm HTTPS is active.
- Confirm `/robots.txt` and `/sitemap.xml` resolve on the production domain.

## Launch Hygiene

- Visit `/launch` for the in-app readiness snapshot.
- Replace MVP Privacy and Terms pages with reviewed production language.
- Confirm all protected routes redirect correctly when logged out.
- Confirm signup, email confirmation, onboarding, login, logout, and password recovery assumptions.
- Confirm public profile and journey URLs are shareable.
- Confirm Open Graph preview uses the generated Megamorphosis card.
- Decide whether search engines should index public user and journey pages in the first launch wave.
- Run `npx tsc --noEmit`, `npm run lint`, and `npm run build` before every production deploy.
