import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useRecipes } from '../context/RecipeContext'
import RecipeForm from '../components/RecipeForm'

export default function RecipeEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getRecipe, updateRecipe } = useRecipes()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const recipe = getRecipe(id)

  if (!recipe) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-serif text-brown-700 mb-4">
          Recipe not found
        </h2>
        <Link to="/" className="text-rust hover:underline">
          Back to recipes
        </Link>
      </div>
    )
  }

  const handleSubmit = async (recipeData) => {
    setLoading(true)
    setError(null)
    try {
      await updateRecipe(id, recipeData)
      navigate(`/recipe/${id}`)
    } catch (err) {
      setError('Failed to update recipe. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Link
        to={`/recipe/${id}`}
        className="inline-flex items-center gap-1 text-brown-600 hover:text-rust mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to recipe
      </Link>

      <h1 className="text-3xl font-serif font-bold text-brown-800 mb-8">
        Edit Recipe
      </h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <RecipeForm initialData={recipe} onSubmit={handleSubmit} loading={loading} />
    </div>
  )
}
