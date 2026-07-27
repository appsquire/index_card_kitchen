#!/usr/bin/env node
/**
 * Seed sample recipes for local testing.
 *
 *   cd server && npm run seed:recipes
 *   SEED_EMAIL=you@example.com npm run seed:recipes
 *
 * With password (via API instead of DB):
 *   SEED_EMAIL=you@example.com SEED_PASSWORD=secret npm run seed:recipes -- --api
 */

import 'dotenv/config'
import { query } from './index.js'
import { gazpachoRecipe, shortRecipe } from '../../../shared/fixtures/cardStudioRecipes.js'

const API = process.env.API_URL || 'http://localhost:4000/api'
const EMAIL = process.env.SEED_EMAIL
const PASSWORD = process.env.SEED_PASSWORD
const NAME = process.env.SEED_NAME || 'Demo Cook'
const useApi = process.argv.includes('--api')

export const SAMPLE_RECIPES = [
  {
    ...gazpachoRecipe,
    description: 'Chilled tomato soup — perfect for summer.',
  },
  {
    ...shortRecipe,
    description: 'Quick weeknight dinner in one bowl.',
  },
  {
    title: 'Summer Corn Salad',
    description: 'Sweet corn with lime, cilantro, and cotija.',
    servings: 6,
    prepTime: 15,
    cookTime: 10,
    ingredients: [
      { amount: '4', unit: 'ears', name: 'corn, kernels cut off' },
      { amount: '1/2', unit: 'cup', name: 'cotija cheese, crumbled' },
      { amount: '1/4', unit: 'cup', name: 'fresh cilantro, chopped' },
      { amount: '2', unit: 'Tbsp', name: 'lime juice' },
      { amount: '1', unit: 'Tbsp', name: 'olive oil' },
      { amount: '1/2', unit: 'tsp', name: 'salt' },
      { amount: '1/4', unit: 'tsp', name: 'black pepper' },
    ],
    instructions: [
      { step: 'Char corn in a hot skillet until lightly browned in spots.' },
      { step: 'Toss warm corn with lime juice, oil, salt, and pepper.' },
      { step: 'Fold in cotija and cilantro. Serve warm or at room temperature.' },
    ],
  },
  {
    title: 'Classic Chocolate Chip Cookies',
    description: 'Crisp edges, chewy centers — the default batch.',
    servings: 24,
    prepTime: 15,
    cookTime: 12,
    ingredients: [
      { amount: '2', unit: 'cups', name: 'all-purpose flour' },
      { amount: '1', unit: 'tsp', name: 'baking soda' },
      { amount: '1', unit: 'tsp', name: 'salt' },
      { amount: '1', unit: 'cup', name: 'butter, softened' },
      { amount: '3/4', unit: 'cup', name: 'granulated sugar' },
      { amount: '3/4', unit: 'cup', name: 'packed brown sugar' },
      { amount: '2', unit: 'large', name: 'eggs' },
      { amount: '2', unit: 'tsp', name: 'vanilla extract' },
      { amount: '2', unit: 'cups', name: 'semisweet chocolate chips' },
    ],
    instructions: [
      { step: 'Heat oven to 375°F. Whisk flour, baking soda, and salt.' },
      { step: 'Cream butter and both sugars until light. Beat in eggs and vanilla.' },
      { step: 'Stir in flour mixture, then fold in chocolate chips.' },
      { step: 'Drop rounded tablespoons onto baking sheets. Bake 9–12 minutes until golden.' },
      { step: 'Cool on the sheet 2 minutes, then transfer to a rack.' },
    ],
  },
  {
    title: 'Overnight Oats',
    description: 'Set it up at night, breakfast is waiting.',
    servings: 1,
    prepTime: 5,
    ingredients: [
      { amount: '1/2', unit: 'cup', name: 'rolled oats' },
      { amount: '1/2', unit: 'cup', name: 'milk' },
      { amount: '1', unit: 'Tbsp', name: 'maple syrup' },
      { amount: '1', unit: 'Tbsp', name: 'peanut butter' },
      { amount: '1/4', unit: 'tsp', name: 'cinnamon' },
      { amount: '1/4', unit: 'cup', name: 'berries' },
    ],
    instructions: [
      { step: 'Combine oats, milk, syrup, peanut butter, and cinnamon in a jar.' },
      { step: 'Refrigerate overnight. Top with berries before eating.' },
    ],
  },
  {
    title: 'Garlic Butter Pasta',
    description: 'Pantry pasta when you need dinner in fifteen minutes.',
    servings: 4,
    prepTime: 5,
    cookTime: 15,
    ingredients: [
      { amount: '12', unit: 'oz', name: 'spaghetti' },
      { amount: '6', unit: 'Tbsp', name: 'butter' },
      { amount: '4', unit: 'cloves', name: 'garlic, minced' },
      { amount: '1/4', unit: 'tsp', name: 'red pepper flakes' },
      { amount: '1/2', unit: 'cup', name: 'parmesan, grated' },
      { amount: '1/4', unit: 'cup', name: 'parsley, chopped' },
    ],
    instructions: [
      { step: 'Cook pasta in salted water until al dente. Reserve 1 cup pasta water.' },
      { step: 'Melt butter in a large skillet. Sauté garlic and pepper flakes 1 minute.' },
      { step: 'Toss pasta with butter, parmesan, and splashes of pasta water until glossy.' },
      { step: 'Finish with parsley and serve immediately.' },
    ],
  },
]

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${data?.message || res.statusText}`)
  }

  return data
}

async function seedViaApi() {
  const email = EMAIL || 'demo@indexcardkitchen.com'
  const password = PASSWORD || 'demo123456'

  let token
  try {
    ;({ token } = await api('/auth/login', {
      method: 'POST',
      body: { email, password },
    }))
  } catch {
    console.log(`Registering ${email}…`)
    ;({ token } = await api('/auth/register', {
      method: 'POST',
      body: { name: NAME, email, password },
    }))
  }

  const existing = await api('/recipes', { token })
  const existingTitles = new Set(existing.map((r) => r.title))
  let created = 0
  let skipped = 0

  for (const recipe of SAMPLE_RECIPES) {
    if (existingTitles.has(recipe.title)) {
      console.log(`  skip  ${recipe.title}`)
      skipped++
      continue
    }
    const saved = await api('/recipes', { method: 'POST', token, body: recipe })
    console.log(`  added ${saved.title}`)
    created++
  }

  console.log(`\nDone — ${created} created, ${skipped} skipped (${email}).`)
}

async function seedViaDb() {
  const userResult = EMAIL
    ? await query('SELECT id, email FROM users WHERE email = $1', [EMAIL])
    : await query('SELECT id, email FROM users ORDER BY created_at LIMIT 1')

  if (userResult.rows.length === 0) {
    throw new Error(EMAIL ? `No user found for ${EMAIL}` : 'No users in database')
  }

  const { id: userId, email } = userResult.rows[0]
  const existing = await query('SELECT title FROM recipes WHERE user_id = $1', [userId])
  const existingTitles = new Set(existing.rows.map((r) => r.title))

  let created = 0
  let skipped = 0

  for (const recipe of SAMPLE_RECIPES) {
    if (existingTitles.has(recipe.title)) {
      console.log(`  skip  ${recipe.title}`)
      skipped++
      continue
    }

    await query(
      `INSERT INTO recipes (
        user_id, title, description, source_url, prep_time, cook_time, servings,
        ingredients, instructions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        recipe.title,
        recipe.description || null,
        recipe.sourceUrl || null,
        recipe.prepTime || null,
        recipe.cookTime || null,
        recipe.servings || null,
        JSON.stringify(recipe.ingredients || []),
        JSON.stringify(recipe.instructions || []),
      ]
    )
    console.log(`  added ${recipe.title}`)
    created++
  }

  console.log(`\nDone — ${created} created, ${skipped} skipped (${email}).`)
  console.log('Refresh the app while signed in to sync them down.')
}

;(useApi ? seedViaApi() : seedViaDb()).catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
