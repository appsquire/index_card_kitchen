# AGENTS.md

Instructions for any AI coding agent working in this repository.

## What this repository is

**Index Card Kitchen** — a recipe box web application that lets users save, manage, and print
recipes as vintage-style index cards. Local-first with optional cloud sync.

This is a full-stack application with real product code. Your job is to help build, debug,
and improve the software.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18 + Vite, Tailwind CSS, React Router |
| State | React Context API (RecipeContext, AuthContext) |
| Local storage | IndexedDB via `idb` library |
| Backend | Express 4 (Node.js, ES Modules) |
| Database | PostgreSQL 16 |
| Auth | JWT + bcrypt |
| PDF generation | Puppeteer with Chromium |
| Web scraping | Cheerio (static) + Puppeteer fallback (JS-heavy sites) |
| Containerization | Docker + Docker Compose |

## Project structure

```
recipebox/
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/         # Reusable UI (CardStudio, RecipeCard, SearchBar, etc.)
│   │   ├── pages/              # Route pages (Home, RecipeNew, RecipeEdit, etc.)
│   │   ├── context/            # State management (RecipeContext, AuthContext)
│   │   ├── services/           # API client, auth, IndexedDB wrapper
│   │   └── data/               # Static data (default categories)
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Express backend
│   ├── src/
│   │   ├── index.js            # App entry, route mounting
│   │   ├── db/                 # PostgreSQL connection, migrations
│   │   ├── routes/             # API endpoints (auth, recipes, categories)
│   │   ├── middleware/         # JWT auth, error handling
│   │   └── services/           # Business logic (scraper, pdfGenerator, browser)
│   └── package.json
│
├── Dockerfile                  # Multi-stage build
├── docker-compose.yml          # Dev/prod services
└── .env.example                # Environment template
```

## Key services and what they do

| File | Purpose |
| --- | --- |
| `client/src/services/api.js` | Axios client with JWT interceptors |
| `client/src/services/localDb.js` | IndexedDB wrapper for offline storage |
| `client/src/context/RecipeContext.jsx` | Global recipe state, CRUD, search |
| `server/src/services/scraper.js` | Extract recipes from URLs (Schema.org JSON-LD) |
| `server/src/services/pdfGenerator.js` | Render recipes as printable index cards |
| `server/src/services/browser.js` | Shared Puppeteer browser instance |

## Database schema

Four tables: `users`, `recipes`, `categories`, `recipe_categories` (junction).

- Recipes store `ingredients` and `instructions` as JSONB arrays
- All tables use UUID primary keys
- `user_id` foreign keys enforce data isolation

## API endpoints

**Auth** (public)
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/profile`

**Recipes** (protected, except import)
- `POST /api/recipes/import` — scrape recipe from URL (public)
- `GET /api/recipes` — list user's recipes
- `POST /api/recipes` — create recipe
- `PUT /api/recipes/:id` — update recipe
- `DELETE /api/recipes/:id` — delete recipe
- `POST /api/recipes/:id/export` — generate PDF

**Categories** (protected)
- `GET /api/categories`, `POST`, `PUT /:id`, `DELETE /:id`

## Running locally

```bash
# Start database
docker-compose up -d db

# Run migrations
cd server && npm run migrate

# Start backend (port 4000)
cd server && npm run dev

# Start frontend (port 5173)
cd client && npm run dev
```

Or run everything in Docker:
```bash
docker-compose up --build
```

## Architecture patterns to follow

**Offline-first**: The app works without a server. IndexedDB is the primary store; PostgreSQL
syncs when the user is authenticated. Respect this — features should degrade gracefully.

**Context for state**: Use React Context, not Redux. Keep contexts focused (recipes vs auth).

**Service layer**: Business logic lives in `server/src/services/`, not in route handlers.
Route files should be thin — validate input, call service, return response.

**Scraper fallback**: Try lightweight HTTP fetch first (Cheerio), fall back to Puppeteer only
for JS-rendered pages. This keeps scraping fast for most sites.

## Code style

- ES Modules (`import`/`export`), not CommonJS
- Functional React components with hooks
- Tailwind for styling — avoid custom CSS unless necessary
- Error handling: try/catch in async functions, return appropriate HTTP status codes
- No TypeScript currently — keep it JavaScript unless migrating the whole project

## Testing

No test suite exists yet. If adding tests:
- Jest for backend unit tests
- React Testing Library for frontend
- Keep tests next to the code they test (`*.test.js`)

## Common tasks

**Add a new API endpoint:**
1. Create or update route file in `server/src/routes/`
2. Add business logic to a service in `server/src/services/`
3. Mount route in `server/src/index.js` if new file
4. Update `client/src/services/api.js` with the new call

**Add a new React page:**
1. Create page component in `client/src/pages/`
2. Add route in `client/src/App.jsx`
3. Use `useRecipes()` or `useAuth()` hooks for state

**Modify the database schema:**
1. Update `server/src/db/migrate.js`
2. Run migrations: `cd server && npm run migrate`
3. Update relevant services and routes

## Do not

- Break offline functionality — always consider the no-auth, IndexedDB-only path
- Add heavy dependencies without good reason
- Store secrets in code — use `.env` files
- Commit `.env` files — only `.env.example`
