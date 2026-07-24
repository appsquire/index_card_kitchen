import { query } from '../db/index.js'
import { DEFAULT_CATEGORIES } from '../data/defaultCategories.js'

/** Seed the kitchen defaults once per user when they have no categories yet. */
export async function seedDefaultCategories(userId) {
  const existing = await query(
    'SELECT COUNT(*)::int AS count FROM categories WHERE user_id = $1',
    [userId]
  )
  if (existing.rows[0].count > 0) return

  for (const cat of DEFAULT_CATEGORIES) {
    await query(
      `INSERT INTO categories (user_id, name, color)
       VALUES ($1, $2, $3)`,
      [userId, cat.name, cat.color]
    )
  }
}
