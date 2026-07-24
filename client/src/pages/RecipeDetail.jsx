import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Clock,
  Users,
  ExternalLink,
  Edit,
  Trash2,
  Printer,
  Download,
  ArrowLeft,
} from 'lucide-react'
import { useRecipes } from '../context/RecipeContext'
import { recipeApi } from '../services/api'
import RecipeCardPrint from '../components/RecipeCardPrint'

export default function RecipeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getRecipe, deleteRecipe, categories } = useRecipes()
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const recipe = getRecipe(id)

  if (!recipe) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-serif text-wicker-700 mb-4">
          Recipe not found
        </h2>
        <Link to="/" className="text-gingham hover:underline">
          Back to recipes
        </Link>
      </div>
    )
  }

  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0)
  const recipeCategories = recipe.categoryIds
    ?.map(id => categories.find(c => c.id === id))
    .filter(Boolean) || []

  const formatIngredient = (ing) => {
    const parts = [ing.amount, ing.unit, ing.name].filter(Boolean)
    return parts.join(' ')
  }

  const handleDelete = async () => {
    await deleteRecipe(id)
    navigate('/')
  }

  const handlePrint = () => {
    setShowPrintPreview(true)
    setTimeout(() => {
      window.print()
    }, 100)
  }

  const handleExportPdf = async () => {
    setExporting(true)
    try {
      const blob = await recipeApi.exportPdf(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${recipe.title.replace(/[^a-z0-9]/gi, '_')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export PDF. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  // Print preview mode
  if (showPrintPreview) {
    return (
      <div className="print:block">
        <div className="no-print mb-4">
          <button
            onClick={() => setShowPrintPreview(false)}
            className="btn-secondary"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Recipe
          </button>
        </div>
        <RecipeCardPrint recipe={recipe} size="full" />
      </div>
    )
  }

  return (
    <div>
      {/* Back button */}
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-wicker-600 hover:text-gingham mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to recipes
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div>
            {recipe.imageUrl && (
              <div className="aspect-video rounded-lg overflow-hidden mb-6 bg-wicker-100">
                <img
                  src={recipe.imageUrl}
                  alt={recipe.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <h1 className="text-3xl md:text-4xl font-serif font-bold text-wicker-800">
              {recipe.title}
            </h1>

            {recipe.description && (
              <p className="mt-4 text-lg text-wicker-600">
                {recipe.description}
              </p>
            )}

            {/* Categories */}
            {recipeCategories.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {recipeCategories.map((cat) => (
                  <span
                    key={cat.id}
                    className="px-3 py-1 text-sm bg-wicker-100 text-wicker-600 rounded-full"
                    style={{ borderLeft: `3px solid ${cat.color || '#B08C5C'}` }}
                  >
                    {cat.name}
                  </span>
                ))}
              </div>
            )}

            {/* Meta info */}
            <div className="mt-6 flex flex-wrap gap-6 text-wicker-600">
              {recipe.prepTime > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <div>
                    <div className="text-sm text-wicker-500">Prep Time</div>
                    <div className="font-medium">{recipe.prepTime} min</div>
                  </div>
                </div>
              )}
              {recipe.cookTime > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <div>
                    <div className="text-sm text-wicker-500">Cook Time</div>
                    <div className="font-medium">{recipe.cookTime} min</div>
                  </div>
                </div>
              )}
              {totalTime > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <div>
                    <div className="text-sm text-wicker-500">Total Time</div>
                    <div className="font-medium">{totalTime} min</div>
                  </div>
                </div>
              )}
              {recipe.servings && (
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <div>
                    <div className="text-sm text-wicker-500">Servings</div>
                    <div className="font-medium">{recipe.servings}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Source */}
            {recipe.sourceUrl && (
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1 text-gingham hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                View original recipe
              </a>
            )}
          </div>

          {/* Ingredients */}
          <section className="card">
            <h2 className="text-xl font-serif font-semibold text-wicker-800 mb-4">
              Ingredients
            </h2>
            <ul className="space-y-2">
              {recipe.ingredients?.map((ing, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 text-wicker-700 py-1"
                >
                  <input
                    type="checkbox"
                    className="mt-1 rounded border-wicker-300 text-gingham focus:ring-gingham"
                  />
                  <span>{formatIngredient(ing)}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Instructions */}
          <section className="card">
            <h2 className="text-xl font-serif font-semibold text-wicker-800 mb-4">
              Instructions
            </h2>
            <ol className="space-y-6">
              {recipe.instructions?.map((inst, idx) => (
                <li key={idx} className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gingham text-white flex items-center justify-center text-sm font-medium">
                    {idx + 1}
                  </span>
                  <p className="text-wicker-700 pt-1">{inst.step}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="card sticky top-24 space-y-4">
            <h3 className="font-serif font-semibold text-wicker-800">Actions</h3>

            <Link
              to={`/recipe/${id}/edit`}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Recipe
            </Link>

            <button
              onClick={handlePrint}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print Recipe Card
            </button>

            <button
              onClick={handleExportPdf}
              disabled={exporting}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exporting...' : 'Export as PDF'}
            </button>

            <hr className="border-wicker-200" />

            {showDeleteConfirm ? (
              <div className="space-y-2">
                <p className="text-sm text-wicker-600">
                  Are you sure you want to delete this recipe?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-center gap-2 text-red-600 hover:text-red-700 py-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Recipe
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
