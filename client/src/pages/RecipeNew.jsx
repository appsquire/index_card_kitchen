import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useRecipes } from '../context/RecipeContext'
import RecipeForm from '../components/RecipeForm'

export default function RecipeNew() {
  const navigate = useNavigate()
  const { addRecipe } = useRecipes()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (recipeData) => {
    setLoading(true)
    setError(null)
    try {
      const recipe = await addRecipe(recipeData)
      navigate(`/recipe/${recipe.id}`)
    } catch (err) {
      setError('Failed to save recipe. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-brown-600 hover:text-rust mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to recipes
      </Link>

      <h1 className="text-3xl font-serif font-bold text-brown-800 mb-8">
        Add New Recipe
      </h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <RecipeForm onSubmit={handleSubmit} loading={loading} />
    </div>
  )
}
