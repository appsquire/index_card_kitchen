import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Edit2, Trash2, Check, X } from 'lucide-react'
import { useRecipes } from '../context/RecipeContext'

const PRESET_COLORS = [
  '#B45309', // rust
  '#6B7F59', // sage
  '#8B6914', // brown
  '#DC2626', // red
  '#059669', // green
  '#2563EB', // blue
  '#7C3AED', // purple
  '#DB2777', // pink
]

export default function Categories() {
  const { categories, recipes, addCategory, updateCategory, deleteCategory } = useRecipes()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({ name: '', color: PRESET_COLORS[0] })
  const [error, setError] = useState(null)

  const getRecipeCount = (categoryId) => {
    return recipes.filter(r => r.categoryIds?.includes(categoryId)).length
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!formData.name.trim()) {
      setError('Category name is required')
      return
    }

    try {
      if (editingId) {
        await updateCategory(editingId, formData)
        setEditingId(null)
      } else {
        await addCategory(formData)
      }
      setFormData({ name: '', color: PRESET_COLORS[0] })
      setShowForm(false)
    } catch (err) {
      setError('Failed to save category')
      console.error(err)
    }
  }

  const handleEdit = (category) => {
    setEditingId(category.id)
    setFormData({ name: category.name, color: category.color || PRESET_COLORS[0] })
    setShowForm(true)
  }

  const handleDelete = async (categoryId) => {
    const count = getRecipeCount(categoryId)
    if (count > 0) {
      const confirmed = window.confirm(
        `This category is used by ${count} recipe${count > 1 ? 's' : ''}. Are you sure you want to delete it?`
      )
      if (!confirmed) return
    }

    try {
      await deleteCategory(categoryId)
    } catch (err) {
      console.error('Failed to delete category:', err)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({ name: '', color: PRESET_COLORS[0] })
    setError(null)
  }

  return (
    <div>
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-wicker-600 hover:text-gingham mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to recipes
      </Link>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-serif font-bold text-wicker-800">
          Categories
        </h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card mb-8">
          <h2 className="font-serif font-semibold text-wicker-800 mb-4">
            {editingId ? 'Edit Category' : 'New Category'}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-wicker-700 mb-1">
                Category Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder="e.g., Desserts, Quick Meals, Vegetarian"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-wicker-700 mb-2">
                Color
              </label>
              <div className="flex gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      formData.color === color
                        ? 'ring-2 ring-offset-2 ring-brown-400 scale-110'
                        : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" className="btn-primary flex items-center gap-1">
                <Check className="w-4 h-4" />
                {editingId ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="btn-secondary flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Categories List */}
      {categories.length === 0 ? (
        <div className="text-center py-16 card">
          <p className="text-wicker-600 mb-4">
            No categories yet. Create one to organize your recipes.
          </p>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary"
            >
              Create First Category
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((category) => {
            const count = getRecipeCount(category.id)
            return (
              <div
                key={category.id}
                className="card flex items-center justify-between py-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color || PRESET_COLORS[0] }}
                  />
                  <span className="font-medium text-wicker-800">{category.name}</span>
                  <span className="text-sm text-wicker-600">
                    {count} recipe{count !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(category)}
                    className="p-2 text-wicker-500 hover:text-gingham transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="p-2 text-wicker-500 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
