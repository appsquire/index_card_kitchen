import { Router } from 'express'
import { query } from '../db/index.js'
import { authenticate } from '../middleware/auth.js'
import { seedDefaultCategories } from '../services/seedCategories.js'

const router = Router()

router.use(authenticate)

// Get all categories for current user (seed defaults if empty)
router.get('/', async (req, res, next) => {
  try {
    await seedDefaultCategories(req.user.id)

    const result = await query(
      'SELECT * FROM categories WHERE user_id = $1 ORDER BY name',
      [req.user.id]
    )

    const categories = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
    }))

    res.json(categories)
  } catch (error) {
    next(error)
  }
})

// Create category
router.post('/', async (req, res, next) => {
  try {
    const { id, name, color } = req.body

    if (!name) {
      return res.status(400).json({ message: 'Category name is required' })
    }

    const result = await query(
      `INSERT INTO categories (id, user_id, name, color)
       VALUES (COALESCE($1, uuid_generate_v4()), $2, $3, $4)
       RETURNING *`,
      [id || null, req.user.id, name, color || '#B08C5C']
    )

    const category = result.rows[0]
    res.status(201).json({
      id: category.id,
      name: category.name,
      color: category.color,
    })
  } catch (error) {
    next(error)
  }
})

// Update category
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, color } = req.body

    const result = await query(
      `UPDATE categories
       SET name = COALESCE($1, name),
           color = COALESCE($2, color)
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [name, color, id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' })
    }

    const category = result.rows[0]
    res.json({
      id: category.id,
      name: category.name,
      color: category.color,
    })
  } catch (error) {
    next(error)
  }
})

// Delete category
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' })
    }

    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

export default router
