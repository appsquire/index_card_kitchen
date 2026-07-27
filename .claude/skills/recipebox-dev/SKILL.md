---
name: recipebox-dev
description: Develop and maintain Index Card Kitchen, a recipe box web app. Use when working on features, fixing bugs, understanding the codebase architecture, or asking how the app works. Covers React frontend, Express backend, PostgreSQL database, PDF generation, and recipe scraping.
---

# Index Card Kitchen Development

Help build and maintain this recipe box application. Full instructions are in `AGENTS.md` at the
repo root — read it for complete architecture details.

## Quick orientation

**What is this?** A recipe app where users save recipes and print them as vintage index cards.
Offline-first (IndexedDB) with optional cloud sync (PostgreSQL).

**Stack:** React + Vite | Express | PostgreSQL | Puppeteer for PDFs | Cheerio for scraping

## Where to find things

| Task | Look here |
| --- | --- |
| React components | `client/src/components/` |
| Page routes | `client/src/pages/` + `client/src/App.jsx` |
| State management | `client/src/context/` (RecipeContext, AuthContext) |
| API calls from frontend | `client/src/services/api.js` |
| Offline storage | `client/src/services/localDb.js` |
| API routes | `server/src/routes/` |
| Business logic | `server/src/services/` |
| Database schema | `server/src/db/migrate.js` |
| PDF card rendering | `server/src/services/pdfGenerator.js` |
| Recipe URL scraping | `server/src/services/scraper.js` |

## Key patterns

1. **Offline-first**: IndexedDB is primary storage. Server sync is optional. Never break the
   offline path.

2. **Context not Redux**: State lives in React Context. `useRecipes()` and `useAuth()` hooks
   provide access.

3. **Thin routes, fat services**: Route handlers validate and delegate. Business logic goes in
   `server/src/services/`.

4. **Scraper fallback**: HTTP + Cheerio first (fast), Puppeteer second (JS sites).

## Common development tasks

**Adding a feature:**
1. Read `AGENTS.md` for architecture context
2. Check if similar patterns exist in the codebase
3. Frontend state goes through Context; backend logic goes in services
4. Test both online and offline paths

**Debugging the scraper:**
- `server/src/services/scraper.js` handles URL imports
- Looks for Schema.org JSON-LD first, falls back to HTML parsing
- Check browser.js for Puppeteer instance management

**Modifying PDF output:**
- `server/src/services/pdfGenerator.js` renders cards
- Styles are inline in the HTML template
- Supports multiple sizes (4x6, 5x7, letter) and styles (enamel, butter, lined)

**Database changes:**
1. Update `server/src/db/migrate.js`
2. Run `cd server && npm run migrate`
3. Update affected services and routes

## Before making changes

- Read the relevant existing code first
- Check `AGENTS.md` for architectural constraints
- Consider offline functionality — will this work without auth?
- Keep dependencies minimal

## Running the app

```bash
# Database
docker-compose up -d db

# Backend (port 4000)
cd server && npm run dev

# Frontend (port 5173)
cd client && npm run dev
```
