import { Router } from 'express'
import { query } from '../db/index.js'
import { authenticate } from '../middleware/auth.js'
import { scrapeRecipe } from '../services/scraper.js'
import { generateRecipePdf } from '../services/pdfGenerator.js'

const router = Router()

// Import from URL - no auth required (just scrapes, doesn't save)
router.post('/import', async (req, res, next) => {
  try {
    const { url } = req.body

    if (!url) {
      return res.status(400).json({ message: 'URL is required' })
    }

    const recipeData = await scrapeRecipe(url)

    if (!recipeData) {
      return res.status(400).json({
        message: 'Could not extract recipe data from this URL',
      })
    }

    res.json(recipeData)
  } catch (error) {
    console.error('Import error:', error)
    if (
      error.message?.includes('access the URL') ||
      error.message?.includes('timeout') ||
      error.message?.includes('net::')
    ) {
      return res.status(400).json({
        message: 'Could not access the URL. Please check the link and try again.',
      })
    }
    return res.status(400).json({
      message: error.message || 'Failed to import recipe',
    })
  }
})

// All other recipe routes require authentication
router.use(authenticate)

// Get all recipes for current user
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT r.*,
        COALESCE(
          (SELECT json_agg(rc.category_id)
           FROM recipe_categories rc
           WHERE rc.recipe_id = r.id),
          '[]'
        ) as category_ids
       FROM recipes r
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    )

    const recipes = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      sourceUrl: row.source_url,
      imageUrl: row.image_url,
      prepTime: row.prep_time,
      cookTime: row.cook_time,
      servings: row.servings,
      ingredients: row.ingredients,
      instructions: row.instructions,
      categoryIds: row.category_ids.filter(Boolean),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    res.json(recipes)
  } catch (error) {
    next(error)
  }
})

// Get single recipe
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT r.*,
        COALESCE(
          (SELECT json_agg(rc.category_id)
           FROM recipe_categories rc
           WHERE rc.recipe_id = r.id),
          '[]'
        ) as category_ids
       FROM recipes r
       WHERE r.id = $1 AND r.user_id = $2`,
      [req.params.id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Recipe not found' })
    }

    const row = result.rows[0]
    const recipe = {
      id: row.id,
      title: row.title,
      description: row.description,
      sourceUrl: row.source_url,
      imageUrl: row.image_url,
      prepTime: row.prep_time,
      cookTime: row.cook_time,
      servings: row.servings,
      ingredients: row.ingredients,
      instructions: row.instructions,
      categoryIds: row.category_ids.filter(Boolean),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }

    res.json(recipe)
  } catch (error) {
    next(error)
  }
})

// Create recipe
router.post('/', async (req, res, next) => {
  try {
    const {
      id,
      title,
      description,
      sourceUrl,
      imageUrl,
      prepTime,
      cookTime,
      servings,
      ingredients,
      instructions,
      categoryIds,
    } = req.body

    if (!title) {
      return res.status(400).json({ message: 'Title is required' })
    }

    const result = await query(
      `INSERT INTO recipes (id, user_id, title, description, source_url, image_url, prep_time, cook_time, servings, ingredients, instructions)
       VALUES (COALESCE($1, uuid_generate_v4()), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        id || null,
        req.user.id,
        title,
        description || null,
        sourceUrl || null,
        imageUrl || null,
        prepTime || null,
        cookTime || null,
        servings || null,
        JSON.stringify(ingredients || []),
        JSON.stringify(instructions || []),
      ]
    )

    const recipe = result.rows[0]

    // Add category associations
    if (categoryIds && categoryIds.length > 0) {
      for (const categoryId of categoryIds) {
        await query(
          'INSERT INTO recipe_categories (recipe_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [recipe.id, categoryId]
        )
      }
    }

    res.status(201).json({
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      sourceUrl: recipe.source_url,
      imageUrl: recipe.image_url,
      prepTime: recipe.prep_time,
      cookTime: recipe.cook_time,
      servings: recipe.servings,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      categoryIds: categoryIds || [],
      createdAt: recipe.created_at,
      updatedAt: recipe.updated_at,
    })
  } catch (error) {
    next(error)
  }
})

// Update recipe
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const {
      title,
      description,
      sourceUrl,
      imageUrl,
      prepTime,
      cookTime,
      servings,
      ingredients,
      instructions,
      categoryIds,
    } = req.body

    // Check ownership
    const existing = await query(
      'SELECT id FROM recipes WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    )

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Recipe not found' })
    }

    const result = await query(
      `UPDATE recipes
       SET title = COALESCE($1, title),
           description = $2,
           source_url = $3,
           image_url = $4,
           prep_time = $5,
           cook_time = $6,
           servings = $7,
           ingredients = $8,
           instructions = $9,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND user_id = $11
       RETURNING *`,
      [
        title,
        description,
        sourceUrl,
        imageUrl,
        prepTime,
        cookTime,
        servings,
        JSON.stringify(ingredients || []),
        JSON.stringify(instructions || []),
        id,
        req.user.id,
      ]
    )

    // Update category associations
    await query('DELETE FROM recipe_categories WHERE recipe_id = $1', [id])
    if (categoryIds && categoryIds.length > 0) {
      for (const categoryId of categoryIds) {
        await query(
          'INSERT INTO recipe_categories (recipe_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, categoryId]
        )
      }
    }

    const recipe = result.rows[0]
    res.json({
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      sourceUrl: recipe.source_url,
      imageUrl: recipe.image_url,
      prepTime: recipe.prep_time,
      cookTime: recipe.cook_time,
      servings: recipe.servings,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      categoryIds: categoryIds || [],
      createdAt: recipe.created_at,
      updatedAt: recipe.updated_at,
    })
  } catch (error) {
    next(error)
  }
})

// Delete recipe
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM recipes WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Recipe not found' })
    }

    res.status(204).send()
  } catch (error) {
    next(error)
  }
})


// Export recipe as PDF
router.post('/:id/export', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM recipes WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Recipe not found' })
    }

    const row = result.rows[0]
    const recipe = {
      id: row.id,
      title: row.title,
      description: row.description,
      sourceUrl: row.source_url,
      imageUrl: row.image_url,
      prepTime: row.prep_time,
      cookTime: row.cook_time,
      servings: row.servings,
      ingredients: row.ingredients,
      instructions: row.instructions,
    }

    const pdfBuffer = await generateRecipePdf(recipe)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${recipe.title.replace(/[^a-z0-9]/gi, '_')}.pdf"`
    )
    res.send(pdfBuffer)
  } catch (error) {
    next(error)
  }
})

export default router
