import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Link as LinkIcon, Loader2, Check, AlertCircle } from 'lucide-react'
import { useRecipes } from '../context/RecipeContext'
import { recipeApi } from '../services/api'
import RecipeForm from '../components/RecipeForm'

export default function ImportRecipe() {
  const navigate = useNavigate()
  const { addRecipe } = useRecipes()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [importedData, setImportedData] = useState(null)
  const [saving, setSaving] = useState(false)

  const handleImport = async (e) => {
    e.preventDefault()
    if (!url.trim()) return

    setLoading(true)
    setError(null)
    setImportedData(null)

    try {
      const data = await recipeApi.importFromUrl(url)
      setImportedData({
        ...data,
        sourceUrl: url,
      })
    } catch (err) {
      console.error('Import failed:', err)
      setError(
        err.response?.data?.message ||
        'Failed to import recipe. The website may not support recipe extraction.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (recipeData) => {
    setSaving(true)
    try {
      const recipe = await addRecipe(recipeData)
      navigate(`/recipe/${recipe.id}`)
    } catch (err) {
      setError('Failed to save recipe. Please try again.')
      console.error(err)
    } finally {
      setSaving(false)
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

      <h1 className="text-3xl font-serif font-bold text-brown-800 mb-2">
        Import Recipe from URL
      </h1>
      <p className="text-brown-600 mb-8">
        Paste a link to a recipe and we'll try to extract the details automatically.
      </p>

      {/* URL Input Form */}
      <div className="card mb-8">
        <form onSubmit={handleImport} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brown-400" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/recipe/..."
              className="input pl-10"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="btn-primary flex items-center justify-center gap-2 min-w-[140px]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              'Import Recipe'
            )}
          </button>
        </form>

        <div className="mt-4 text-sm text-brown-500">
          <p className="font-medium mb-2">Supported sites include:</p>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-brown-400">
            <li>• AllRecipes</li>
            <li>• Food Network</li>
            <li>• Bon Appétit</li>
            <li>• Serious Eats</li>
            <li>• NYT Cooking</li>
            <li>• And many more...</li>
          </ul>
          <p className="mt-2 text-xs">
            Any site using Schema.org Recipe structured data should work.
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700">{error}</p>
            <p className="text-sm text-red-600 mt-1">
              You can still add the recipe manually below.
            </p>
          </div>
        </div>
      )}

      {/* Success message & form */}
      {importedData && (
        <div className="space-y-6">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-700 font-medium">
                Recipe imported successfully!
              </p>
              <p className="text-sm text-green-600">
                Review the details below and make any edits before saving.
              </p>
            </div>
          </div>

          <RecipeForm
            initialData={importedData}
            onSubmit={handleSave}
            loading={saving}
          />
        </div>
      )}

      {/* Manual entry option when no import yet */}
      {!importedData && !loading && (
        <div className="text-center py-8 border-t border-brown-200">
          <p className="text-brown-500 mb-4">
            Or add a recipe manually
          </p>
          <Link to="/recipe/new" className="btn-secondary">
            Create Recipe Manually
          </Link>
        </div>
      )}
    </div>
  )
}
