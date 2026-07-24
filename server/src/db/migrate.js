import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const migrations = [
  // Enable UUID extension
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,

  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Recipes table
  `CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    source_url VARCHAR(500),
    image_url VARCHAR(500),
    prep_time INTEGER,
    cook_time INTEGER,
    servings INTEGER,
    ingredients JSONB DEFAULT '[]',
    instructions JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // Categories table
  `CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#B08C5C'
  )`,

  // Recipe-Categories junction table
  `CREATE TABLE IF NOT EXISTS recipe_categories (
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (recipe_id, category_id)
  )`,

  // Indexes for better performance
  `CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id)`,
]

async function migrate() {
  console.log('Running migrations...')

  for (const migration of migrations) {
    try {
      await pool.query(migration)
      console.log('✓ Migration successful')
    } catch (error) {
      console.error('✗ Migration failed:', error.message)
      console.error('SQL:', migration.slice(0, 100) + '...')
    }
  }

  console.log('Migrations complete')
  await pool.end()
}

migrate().catch(console.error)
