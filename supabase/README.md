# Supabase

The MVP database contract lives in `migrations/20260427173000_mvp_schema_and_rls.sql`.

It creates and secures:

- `profiles`
- `follows`
- `posts`
- `journeys`
- `journey_updates`

Apply it with the Supabase CLI after linking the project:

```sh
supabase link --project-ref <project-ref>
supabase db push
```

The migration intentionally keeps email in Supabase Auth instead of `public.profiles`, because profile rows are publicly readable by username.
