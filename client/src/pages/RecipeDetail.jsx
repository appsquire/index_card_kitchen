import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Clock,
  Users,
  ExternalLink,
  Edit,
  Trash2,
  ArrowLeft,
  Smartphone,
  Printer,
  Type,
} from 'lucide-react'
import { useRecipes } from '../context/RecipeContext'
import CardStudio from '../components/CardStudio'

export default function RecipeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getRecipe, deleteRecipe, categories } = useRecipes()
  const [showCardStudio, setShowCardStudio] = useState(false)
  const [cardStudioMode, setCardStudioMode] = useState('view')
  const [largeText, setLargeText] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const recipe = getRecipe(id)

  if (!recipe) {
    return (
      <div className="text-center py-16">
        <h2 className="text-3xl text-wicker-800 mb-4">Recipe not found</h2>
        <Link to="/" className="text-gingham hover:underline font-semibold">
          Back to recipes
        </Link>
      </div>
    )
  }

  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0)
  const recipeCategories = recipe.categoryIds
    ?.map((cid) => categories.find((c) => c.id === cid))
    .filter(Boolean) || []

  const formatIngredient = (ing) => {
    const parts = [ing.amount, ing.unit, ing.name].filter(Boolean)
    return parts.join(' ')
  }

  const handleDelete = async () => {
    await deleteRecipe(id)
    navigate('/')
  }

  const openCardView = () => {
    setCardStudioMode('view')
    setShowCardStudio(true)
  }

  const openCardStudio = () => {
    setCardStudioMode('studio')
    setShowCardStudio(true)
  }

  if (showCardStudio) {
    return (
      <CardStudio
        recipe={recipe}
        variant={cardStudioMode}
        largeText={largeText}
        initialPhotoOpen={cardStudioMode === 'view'}
        onClose={() => setShowCardStudio(false)}
      />
    )
  }

  return (
    <div>
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-wicker-600 hover:text-gingham mb-6 font-semibold"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to recipes
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div>
            {recipe.imageUrl && (
              <div className="aspect-video rounded-md overflow-hidden mb-6 bg-wicker-100 border-2 border-wicker-200">
                <img
                  src={recipe.imageUrl}
                  alt={recipe.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <h1 className="text-4xl md:text-5xl text-wicker-900 leading-tight">
              {recipe.title}
            </h1>

            {recipe.description && (
              <p className="mt-4 text-lg text-wicker-600 leading-relaxed">
                {recipe.description}
              </p>
            )}

            {recipeCategories.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {recipeCategories.map((cat) => (
                  <span
                    key={cat.id}
                    className="px-3 py-1 text-sm font-semibold bg-herb-light text-herb-dark border border-herb/20 rounded-sm"
                    style={{ borderLeft: `3px solid ${cat.color || '#C23B3B'}` }}
                  >
                    {cat.name}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-6 text-wicker-600">
              {recipe.prepTime > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <div>
                    <div className="text-sm text-wicker-600">Prep</div>
                    <div className="font-semibold">{recipe.prepTime} min</div>
                  </div>
                </div>
              )}
              {recipe.cookTime > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <div>
                    <div className="text-sm text-wicker-600">Cook</div>
                    <div className="font-semibold">{recipe.cookTime} min</div>
                  </div>
                </div>
              )}
              {totalTime > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <div>
                    <div className="text-sm text-wicker-600">Total</div>
                    <div className="font-semibold">{totalTime} min</div>
                  </div>
                </div>
              )}
              {recipe.servings && (
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <div>
                    <div className="text-sm text-wicker-600">Servings</div>
                    <div className="font-semibold">{recipe.servings}</div>
                  </div>
                </div>
              )}
            </div>

            {recipe.sourceUrl && (
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1 text-gingham hover:underline font-semibold"
              >
                <ExternalLink className="w-4 h-4" />
                View original recipe
              </a>
            )}
          </div>

          <section className="card">
            <h2 className="text-2xl text-wicker-900 mb-4">Ingredients</h2>
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

          <section className="card">
            <h2 className="text-2xl text-wicker-900 mb-4">Instructions</h2>
            <ol className="space-y-6">
              {recipe.instructions?.map((inst, idx) => (
                <li key={idx} className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gingham text-white flex items-center justify-center text-sm font-bold">
                    {idx + 1}
                  </span>
                  <p className="text-wicker-700 pt-1 leading-relaxed">{inst.step}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="lg:col-span-1">
          <div className="card sticky top-24 space-y-4">
            <button
              onClick={openCardView}
              className="group w-full cursor-pointer"
              aria-label="View recipe card on your phone"
            >
              <div
                className="relative overflow-hidden rounded-lg shadow-sm group-hover:shadow-md transition-all"
                style={{
                  aspectRatio: '6 / 4',
                  backgroundImage: 'url(/recipe-card-bg.png)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <div className="bg-white/80 backdrop-blur-sm rounded px-3 py-2 text-center">
                    <p className="text-[10px] text-gingham uppercase tracking-wide font-semibold">Recipe Card</p>
                    <p className="text-sm font-hand text-wicker-800 leading-tight line-clamp-2">
                      {recipe.title}
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-center">
                <span className="text-sm font-semibold text-wicker-700 group-hover:text-gingham transition-colors inline-flex items-center justify-center gap-1.5">
                  <Smartphone className="w-4 h-4" aria-hidden />
                  View recipe card
                </span>
                <span className="block text-xs text-wicker-500 mt-0.5">Full-screen view, save as image, or print</span>
              </p>
            </button>

            <label className="recipe-detail__large-text flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={largeText}
                onChange={(e) => setLargeText(e.target.checked)}
                className="mt-1 rounded border-wicker-300 text-gingham focus:ring-gingham"
              />
              <span>
                <span className="flex items-center gap-1.5 font-semibold text-wicker-800 text-sm">
                  <Type className="w-4 h-4 text-gingham" aria-hidden />
                  Large text
                </span>
                <span className="block text-xs text-wicker-500 mt-0.5">
                  Bigger type on the card — easier to read from across the counter
                </span>
              </span>
            </label>

            <button
              type="button"
              onClick={openCardStudio}
              className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
            >
              <Printer className="w-4 h-4" />
              Print or download PDF
            </button>

            <hr className="border-wicker-200" />

            <Link
              to={`/recipe/${id}/edit`}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Recipe
            </Link>

            <hr className="border-wicker-200" />

            {showDeleteConfirm ? (
              <div className="space-y-2">
                <p className="text-sm text-wicker-600">
                  Delete this recipe from the box?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-semibold"
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
                className="w-full flex items-center justify-center gap-2 text-red-600 hover:text-red-700 py-2 font-semibold"
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
