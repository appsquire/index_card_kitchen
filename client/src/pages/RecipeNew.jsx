import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Archive,
  Link as LinkIcon,
  Loader2,
  Check,
  AlertCircle,
  PenLine,
} from 'lucide-react'
import { useRecipes } from '../context/RecipeContext'
import { recipeApi } from '../services/api'
import RecipeForm from '../components/RecipeForm'
import BoxDropCelebration from '../components/BoxDropCelebration'

export default function RecipeNew() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { addRecipe } = useRecipes()

  const mode = searchParams.get('mode') === 'link' ? 'link' : 'hand'

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filingTitle, setFilingTitle] = useState(null)
  const filedIdRef = useRef(null)
  const fileFailedRef = useRef(false)

  const [url, setUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importedData, setImportedData] = useState(null)

  useEffect(() => {
    setError(null)
  }, [mode])

  const setMode = (next) => {
    setSearchParams(next === 'link' ? { mode: 'link' } : {})
  }

  const handleImport = async (e) => {
    e.preventDefault()
    if (!url.trim()) return

    setImporting(true)
    setError(null)
    setImportedData(null)

    try {
      const data = await recipeApi.importFromUrl(url)
      setImportedData({ ...data, sourceUrl: url })
    } catch (err) {
      console.error('Import failed:', err)
      setError(
        err.response?.data?.message ||
          'Couldn’t pull that recipe. Try another link, or write it by hand.'
      )
    } finally {
      setImporting(false)
    }
  }

  const fileRecipe = async (recipeData) => {
    setLoading(true)
    setError(null)
    filedIdRef.current = null
    fileFailedRef.current = false
    // Start the box animation immediately so it never gets skipped
    setFilingTitle(recipeData.title || 'Recipe')

    try {
      const recipe = await addRecipe(recipeData)
      filedIdRef.current = recipe.id
      setFilingTitle(recipe.title || recipeData.title || 'Recipe')
    } catch (err) {
      fileFailedRef.current = true
      setFilingTitle(null)
      setError('Failed to save recipe. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFiled = useCallback(() => {
    const finish = () => {
      if (fileFailedRef.current) {
        setFilingTitle(null)
        return
      }
      const id = filedIdRef.current
      if (id) {
        setFilingTitle(null)
        navigate(`/recipe/${id}`)
        return
      }
      // Save still finishing — wait for the id
      window.setTimeout(finish, 80)
    }
    finish()
  }, [navigate])

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-wicker-600 hover:text-gingham mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to the box
      </Link>

      <h1 className="text-3xl sm:text-4xl font-hand text-wicker-900 mb-2 leading-none">
        Add to the recipe box
      </h1>
      <p className="text-wicker-600 mb-6 leading-relaxed">
        Write it by hand, or paste a link — either way it gets filed as a card you can find later.
      </p>

      <div className="add-mode-tabs mb-8" role="tablist" aria-label="How to add">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'hand'}
          className={`add-mode-tabs__btn ${mode === 'hand' ? 'is-active' : ''}`}
          onClick={() => setMode('hand')}
        >
          <PenLine className="w-4 h-4" />
          Write by hand
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'link'}
          className={`add-mode-tabs__btn ${mode === 'link' ? 'is-active' : ''}`}
          onClick={() => setMode('link')}
        >
          <LinkIcon className="w-4 h-4" />
          From a link
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {mode === 'link' && !importedData && (
        <div className="card mb-6">
          <form onSubmit={handleImport} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-wicker-400" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://allrecipes.com/…"
                className="input pl-10"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={importing || !url.trim()}
              className="btn-primary flex items-center justify-center gap-2 min-w-[140px]"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Pulling…
                </>
              ) : (
                'Pull recipe'
              )}
            </button>
          </form>
          <p className="mt-3 text-sm text-wicker-500">
            Works with AllRecipes, Food Network, Serious Eats, and most sites that mark up recipes.
          </p>
        </div>
      )}

      {mode === 'link' && importedData && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-green-800 font-semibold">Got it — review & file</p>
            <p className="text-sm text-green-700">
              Fix anything that looks off, then add it to the box.
            </p>
            <button
              type="button"
              className="mt-2 text-sm font-semibold text-gingham hover:underline"
              onClick={() => {
                setImportedData(null)
                setUrl('')
              }}
            >
              Try a different link
            </button>
          </div>
        </div>
      )}

      {(mode === 'hand' || importedData) && (
        <RecipeForm
          key={importedData ? 'imported' : 'hand'}
          initialData={importedData || undefined}
          onSubmit={fileRecipe}
          loading={loading || Boolean(filingTitle)}
          submitLabel={
            <>
              <Archive className="w-4 h-4" />
              Add to recipe box
            </>
          }
          loadingLabel="Filing…"
        />
      )}

      {filingTitle &&
        createPortal(
          <BoxDropCelebration recipeTitle={filingTitle} onDone={handleFiled} />,
          document.body
        )}
    </div>
  )
}
