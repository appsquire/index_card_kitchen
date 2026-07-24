import { useState, useEffect } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { useRecipes } from '../context/RecipeContext'

const emptyIngredient = { amount: '', unit: '', name: '' }
const emptyInstruction = { step: '' }

export default function RecipeForm({
  initialData,
  onSubmit,
  loading,
  submitLabel = 'Save Recipe',
  loadingLabel = 'Saving…',
}) {
  const { categories } = useRecipes()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sourceUrl: '',
    imageUrl: '',
    prepTime: '',
    cookTime: '',
    servings: '',
    ingredients: [{ ...emptyIngredient }],
    instructions: [{ ...emptyInstruction }],
    categoryIds: [],
    ...initialData,
  })

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }))
    }
  }, [initialData])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleIngredientChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) =>
        i === index ? { ...ing, [field]: value } : ing
      ),
    }))
  }

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { ...emptyIngredient }],
    }))
  }

  const removeIngredient = (index) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }))
  }

  const handleInstructionChange = (index, value) => {
    setFormData(prev => ({
      ...prev,
      instructions: prev.instructions.map((inst, i) =>
        i === index ? { step: value } : inst
      ),
    }))
  }

  const addInstruction = () => {
    setFormData(prev => ({
      ...prev,
      instructions: [...prev.instructions, { ...emptyInstruction }],
    }))
  }

  const removeInstruction = (index) => {
    setFormData(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index),
    }))
  }

  const handleCategoryToggle = (categoryId) => {
    setFormData(prev => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter(id => id !== categoryId)
        : [...prev.categoryIds, categoryId],
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const cleanedData = {
      ...formData,
      prepTime: formData.prepTime ? parseInt(formData.prepTime, 10) : null,
      cookTime: formData.cookTime ? parseInt(formData.cookTime, 10) : null,
      servings: formData.servings ? parseInt(formData.servings, 10) : null,
      ingredients: formData.ingredients.filter(ing => ing.name.trim()),
      instructions: formData.instructions.filter(inst => inst.step.trim()),
    }
    onSubmit(cleanedData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Info */}
      <section className="card">
        <h2 className="text-lg font-serif font-semibold text-wicker-800 mb-4">
          Basic Information
        </h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-wicker-700 mb-1">
              Recipe Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="input"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-wicker-700 mb-1">
              Description <span className="text-wicker-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="input"
              placeholder="A brief description of this recipe..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sourceUrl" className="block text-sm font-medium text-wicker-700 mb-1">
                Source URL <span className="text-wicker-400 font-normal">(optional)</span>
              </label>
              <input
                type="url"
                id="sourceUrl"
                name="sourceUrl"
                value={formData.sourceUrl}
                onChange={handleChange}
                className="input"
                placeholder="https://..."
              />
              <p className="mt-1 text-xs text-wicker-500">Link to the original recipe for attribution</p>
            </div>

            <div>
              <label htmlFor="imageUrl" className="block text-sm font-medium text-wicker-700 mb-1">
                Image URL <span className="text-wicker-400 font-normal">(optional)</span>
              </label>
              <input
                type="url"
                id="imageUrl"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleChange}
                className="input"
                placeholder="https://..."
              />
              <p className="mt-1 text-xs text-wicker-500">Right-click an image online → Copy image address</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="prepTime" className="block text-sm font-medium text-wicker-700 mb-1">
                Prep Time <span className="text-wicker-400 font-normal">(min)</span>
              </label>
              <input
                type="number"
                id="prepTime"
                name="prepTime"
                value={formData.prepTime}
                onChange={handleChange}
                className="input"
                min="0"
              />
            </div>

            <div>
              <label htmlFor="cookTime" className="block text-sm font-medium text-wicker-700 mb-1">
                Cook Time <span className="text-wicker-400 font-normal">(min)</span>
              </label>
              <input
                type="number"
                id="cookTime"
                name="cookTime"
                value={formData.cookTime}
                onChange={handleChange}
                className="input"
                min="0"
              />
            </div>

            <div>
              <label htmlFor="servings" className="block text-sm font-medium text-wicker-700 mb-1">
                Servings <span className="text-wicker-400 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                id="servings"
                name="servings"
                value={formData.servings}
                onChange={handleChange}
                className="input"
                min="1"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Ingredients */}
      <section className="card">
        <h2 className="text-lg font-serif font-semibold text-wicker-800 mb-4">
          Ingredients
        </h2>

        <div className="space-y-2">
          {formData.ingredients.map((ingredient, index) => (
            <div key={index} className="flex gap-2 items-start">
              <GripVertical className="w-5 h-5 text-wicker-300 mt-2.5 cursor-move" />
              <input
                type="text"
                value={ingredient.amount}
                onChange={(e) => handleIngredientChange(index, 'amount', e.target.value)}
                className="input w-20"
                placeholder="Amt"
              />
              <input
                type="text"
                value={ingredient.unit}
                onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                className="input w-24"
                placeholder="Unit"
              />
              <input
                type="text"
                value={ingredient.name}
                onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                className="input flex-1"
                placeholder="Ingredient name"
              />
              <button
                type="button"
                onClick={() => removeIngredient(index)}
                className="p-2 text-wicker-400 hover:text-red-600 transition-colors"
                disabled={formData.ingredients.length === 1}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addIngredient}
          className="mt-4 flex items-center gap-1 text-gingham hover:text-orange-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Ingredient
        </button>
      </section>

      {/* Instructions */}
      <section className="card">
        <h2 className="text-lg font-serif font-semibold text-wicker-800 mb-4">
          Instructions
        </h2>

        <div className="space-y-3">
          {formData.instructions.map((instruction, index) => (
            <div key={index} className="flex gap-2 items-start">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gingham text-white flex items-center justify-center text-sm font-medium mt-1">
                {index + 1}
              </span>
              <textarea
                value={instruction.step}
                onChange={(e) => handleInstructionChange(index, e.target.value)}
                className="input flex-1"
                rows={2}
                placeholder="Describe this step..."
              />
              <button
                type="button"
                onClick={() => removeInstruction(index)}
                className="p-2 text-wicker-400 hover:text-red-600 transition-colors"
                disabled={formData.instructions.length === 1}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addInstruction}
          className="mt-4 flex items-center gap-1 text-gingham hover:text-orange-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Step
        </button>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="card">
          <h2 className="text-lg font-serif font-semibold text-wicker-800 mb-4">
            Categories
          </h2>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => handleCategoryToggle(category.id)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  formData.categoryIds.includes(category.id)
                    ? 'bg-gingham text-white'
                    : 'bg-wicker-100 text-wicker-600 hover:bg-wicker-200'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <button type="submit" className="btn-primary px-8 flex items-center gap-2" disabled={loading}>
          {loading ? loadingLabel : submitLabel}
        </button>
      </div>
    </form>
  )
}
