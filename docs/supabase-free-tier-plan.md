# Supabase Free Tier Plan

Plan for running Index Card Kitchen on **Supabase Free**, without a dedicated Express + Puppeteer server.

**Status:** Planning only — do not implement until ready.

## Goal

Use Supabase Free for backend (Auth + Postgres + optional Edge Functions / Storage). Keep the React app offline-first. Host the static frontend elsewhere (Vercel, Netlify, or Cloudflare Pages).

```
React (static host)
  ├─ IndexedDB (primary, offline)
  ├─ @supabase/supabase-js (sync when online)
  └─ Edge Function: import-recipe (static HTML / JSON-LD only)
Supabase Free
  ├─ Auth
  ├─ Postgres + RLS
  └─ (optional) Storage later
```

## Why Free is enough to start

| Free limit | Fit for this app |
| --- | --- |
| 500 MB database | Plenty for text recipes + JSONB ingredients/instructions |
| 50,000 MAU | Fine for early users |
| Unlimited API requests | OK for CRUD sync |
| 5 GB egress | Fine if we store URLs / placeholders, not many large images |
| 1 GB file storage | Optional; not required for v1 |
| Community support | Acceptable for hobby / early launch |

We store `image_url` strings (and often use category placeholders), not heavy blobs — DB and egress stay small.

## What stays the same

- Offline-first IndexedDB via `localDb.js` / `RecipeContext`
- Card Studio client PDF (`html2canvas` + `jsPDF`) — already the studio path
- Recipe / category product model (title, times, servings, ingredients, instructions)
- Manual recipe entry when URL import fails

## What changes

| Today | On Supabase |
| --- | --- |
| Express + JWT/bcrypt | Supabase Auth |
| Express routes + `DATABASE_URL` Postgres | Supabase Postgres + RLS; client CRUD |
| `POST /api/recipes/import` (Cheerio + Puppeteer) | Edge Function: fetch + JSON-LD/HTML parse only |
| `POST /api/recipes/:id/export` (Puppeteer PDF) | Remove; use Card Studio PDF only |
| Docker Compose `db` + `server` for cloud | Supabase project; static host for client |

## Scraping impact (important)

Today’s scraper:

1. Plain HTTP fetch → parse Schema.org JSON-LD / HTML  
2. If that fails → **Puppeteer** browser fallback  

On Supabase Free we keep **step 1 only**. Parsing logic can be ported from `server/src/services/scraper.js`.

**Usually still works:** Allrecipes, Food Network, and other major SEO-oriented sites that embed full recipe JSON-LD in the initial HTML.

**More likely to fail:** Sites that bot-block simple fetches, or only inject the recipe after client-side JavaScript. Users fall back to manual entry.

“Less reliable” means we lose the Puppeteer backup — not that major sites stop working.

### Later escape hatches (if needed)

- Small separate Node worker only for Puppeteer  
- Third-party scrape API  
- Better “paste recipe” / manual import UX  

## Target data model

Map existing tables into Supabase (UUIDs, similar columns):

- `profiles` (or use `auth.users` + profile row) — replace custom `users`
- `recipes` — `user_id`, title, description, source_url, image_url, times, servings, ingredients JSONB, instructions JSONB
- `categories` — per-user
- `recipe_categories` — junction

Enable RLS so each user only reads/writes their own rows.

## Phased migration

### Phase 0 — Prep (no cutover)

- Create Supabase Free project  
- Copy schema / run SQL migrations in Supabase SQL editor  
- Document env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`  
- Keep current Express path working until Phase 3  

### Phase 1 — Auth

- Replace register/login with Supabase Auth (email/password; Google later if desired)  
- Wire `AuthContext` to Supabase session  
- Remove local JWT storage tied to Express  

### Phase 2 — Data sync

- Replace `api.js` recipe/category calls with Supabase client queries  
- Keep IndexedDB as primary; sync up/down when authenticated (same offline-first rules as today)  
- Add RLS policies; test multi-user isolation  

### Phase 3 — Import Edge Function

- Port Cheerio/JSON-LD scrape into a Supabase Edge Function (Deno)  
- No Puppeteer  
- Point “Import from URL” at the function  
- Clear error when extract fails → prompt manual entry  

### Phase 4 — Remove Express cloud path

- Delete or archive server PDF export route  
- Stop requiring Docker Postgres for “online” mode  
- Update `README.md` / `AGENTS.md` for Supabase + static host  
- Optional: keep Express only for local Puppeteer experiments  

### Phase 5 — Ship static frontend

- Build client with Vite  
- Deploy to Vercel / Netlify / Cloudflare Pages  
- Set Supabase URL allow-list / redirect URLs for Auth  

## Env / config sketch

```bash
# client (.env)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Edge Function secrets (Supabase dashboard)
# no DATABASE_URL in the browser — use anon key + RLS only
```

## Out of scope for Free v1

- Puppeteer on Supabase  
- Server-side PDF generation  
- Heavy image hosting in Storage (can add later under 1 GB)  
- Replacing IndexedDB (offline stays)  

## Success criteria

- [ ] Sign up / login via Supabase Auth  
- [ ] Create, edit, delete recipes while online; data persists in Supabase  
- [ ] App still works offline via IndexedDB  
- [ ] URL import works for at least one major site (e.g. Allrecipes) via Edge Function  
- [ ] Card Studio print/PDF works without Express  
- [ ] No Express process required for production  

## Open decisions (decide at implement time)

1. Keep custom password users migration vs fresh Supabase Auth only  
2. Sync strategy details (last-write-wins vs timestamps you already have)  
3. Whether Google OAuth is in v1 or later  
4. Whether to retain a optional “power scrape” worker outside Supabase  

## References

- Current schema: `server/src/db/migrate.js`  
- Scraper: `server/src/services/scraper.js`  
- Client PDF: `client/src/components/CardStudio.jsx`  
- Offline store: `client/src/services/localDb.js`  
- Architecture notes: `AGENTS.md`  
