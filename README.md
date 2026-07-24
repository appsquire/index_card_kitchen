# Index Card Kitchen

A clean, distraction-free web app for saving recipes and generating beautiful printable recipe cards with a classic/vintage index-card visual style.

## Features

- **Save Recipes** - Import from URL (auto-extracts from Schema.org data) or manual entry
- **Categories** - Organize recipes by custom categories
- **Search** - Find recipes by title or ingredients
- **Recipe Card Export** - Generate printable PDF cards with vintage styling
- **Local-First** - Works without an account using browser storage
- **Optional Sync** - Create an account to sync recipes across devices

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Auth**: JWT + Google OAuth (optional)
- **PDF Generation**: Puppeteer

## Quick Start

### Using Docker (Recommended)

1. Copy the environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and set your secrets (especially `JWT_SECRET`)

3. Start the services:
   ```bash
   docker-compose up -d
   ```

4. Run migrations:
   ```bash
   docker-compose run migrate
   ```

5. Access the app at http://localhost:4000

### Development Setup

1. **Start PostgreSQL:**
   ```bash
   docker-compose up -d postgres
   ```

2. **Set up the server:**
   ```bash
   cd server
   cp .env.example .env
   npm install
   npm run migrate
   npm run dev
   ```

3. **Set up the client:**
   ```bash
   cd client
   npm install
   npm run dev
   ```

4. Access the app at http://localhost:3000

## Project Structure

```
index-card-kitchen/
├── client/                   # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── context/         # React context (auth, recipes)
│   │   ├── services/        # API and local storage services
│   │   └── styles/          # Global styles
│   └── ...
├── server/                   # Express backend
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Auth and error handling
│   │   ├── services/        # Scraper and PDF generator
│   │   └── db/              # Database connection and migrations
│   └── ...
├── docker-compose.yml
├── Dockerfile
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/google` - Login with Google OAuth
- `GET /api/auth/profile` - Get current user profile

### Recipes
- `GET /api/recipes` - Get all recipes
- `GET /api/recipes/:id` - Get single recipe
- `POST /api/recipes` - Create recipe
- `PUT /api/recipes/:id` - Update recipe
- `DELETE /api/recipes/:id` - Delete recipe
- `POST /api/recipes/import` - Import from URL
- `POST /api/recipes/:id/export` - Export as PDF

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret for JWT tokens | Yes |
| `PORT` | Server port (default: 4000) | No |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | No |

## Recipe Import

The app can automatically extract recipe data from URLs that use Schema.org structured data (JSON-LD). This includes most major recipe sites:

- AllRecipes
- Food Network
- Bon Appétit
- Serious Eats
- NYT Cooking
- And many more...

## License

MIT
