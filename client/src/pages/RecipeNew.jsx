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
  Code,
} from 'lucide-react'
import { useRecipes } from '../context/RecipeContext'
import { recipeApi } from '../services/api'
import RecipeForm from '../components/RecipeForm'
import BoxDropCelebration from '../components/BoxDropCelebration'

export default function RecipeNew() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { addRecipe } = useRecipes()

  const modeParam = searchParams.get('mode')
  const mode = modeParam === 'link' ? 'link' : modeParam === 'html' ? 'html' : 'hand'

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filingTitle, setFilingTitle] = useState(null)
  const filedIdRef = useRef(null)
  const fileFailedRef = useRef(false)

  const [url, setUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importedData, setImportedData] = useState(null)

  // HTML paste state
  const [pastedHtml, setPastedHtml] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')

  useEffect(() => {
    setError(null)
    setImportedData(null)
  }, [mode])

  const setMode = (next) => {
    if (next === 'link') setSearchParams({ mode: 'link' })
    else if (next === 'html') setSearchParams({ mode: 'html' })
    else setSearchParams({})
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
          'Couldn’t pull that recipe. Try Paste HTML, another link, or write it by hand.'
      )
    } finally {
      setImporting(false)
    }
  }

  const handleHtmlImport = async (e) => {
    e.preventDefault()
    if (!pastedHtml.trim()) return

    setImporting(true)
    setError(null)
    setImportedData(null)

    try {
      const data = await recipeApi.importFromHtml(pastedHtml, sourceUrl)
      setImportedData({ ...data, sourceUrl: sourceUrl || undefined })
    } catch (err) {
      console.error('HTML import failed:', err)
      setError(
        err.response?.data?.message ||
          'Couldn\'t extract recipe from that HTML. Make sure you copied the full page source.'
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
        Write it by hand, pull from a link, or paste page HTML — either way it gets filed as a card
        you can find later.
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
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'html'}
          className={`add-mode-tabs__btn ${mode === 'html' ? 'is-active' : ''}`}
          onClick={() => setMode('html')}
        >
          <Code className="w-4 h-4" />
          Paste HTML
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p>{error}</p>
            {mode === 'link' && (
              <button
                type="button"
                className="mt-2 text-sm font-semibold text-red-800 underline hover:no-underline"
                onClick={() => setMode('html')}
              >
                Try Paste HTML instead
              </button>
            )}
          </div>
        </div>
      )}

      {mode === 'link' && !importedData && (
        <div className="card mb-6">
          <form onSubmit={handleImport} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-wicker-500" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/recipe/…"
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
          <p className="mt-3 text-sm text-wicker-600 leading-relaxed">
            If a link doesn&apos;t pull, try{' '}
            <button
              type="button"
              className="font-semibold text-gingham hover:underline"
              onClick={() => setMode('html')}
            >
              Paste HTML
            </button>{' '}
            instead.
          </p>
          <p className="mt-3 text-xs text-wicker-500 leading-relaxed">
            Import for your personal kitchen only. You&apos;re responsible for how you use imported
            content — we link to the original when we can. See our{' '}
            <Link to="/terms" className="text-gingham hover:underline">
              Terms
            </Link>
            .
          </p>
        </div>
      )}

      {mode === 'html' && !importedData && (
        <div className="card mb-6">
          <div className="mb-4 space-y-2 text-sm text-wicker-600 leading-relaxed">
            <p className="font-semibold text-wicker-800">Easiest way to copy the HTML</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Open the recipe in your browser</li>
              <li>
                Right-click the page →{' '}
                <span className="font-medium text-wicker-800">View Page Source</span>
                <span className="text-wicker-500">
                  {' '}
                  (Mac: Option+Cmd+U · Windows: Ctrl+U)
                </span>
              </li>
              <li>
                Select all (<span className="font-medium text-wicker-800">Cmd/Ctrl+A</span>), copy, then
                paste below
              </li>
            </ol>
            <p className="text-wicker-500">
              Copying the visible recipe text won&apos;t work — we need the page source.
            </p>
          </div>
          <form onSubmit={handleHtmlImport} className="space-y-4">
            <div>
              <label htmlFor="source-url" className="block text-sm font-semibold text-wicker-800 mb-1.5">
                Recipe URL <span className="font-normal text-wicker-500">(optional)</span>
              </label>
              <input
                id="source-url"
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://… (so we can link back)"
                className="input"
              />
            </div>
            <div>
              <label htmlFor="pasted-html" className="block text-sm font-semibold text-wicker-800 mb-1.5">
                Page HTML
              </label>
              <textarea
                id="pasted-html"
                value={pastedHtml}
                onChange={(e) => setPastedHtml(e.target.value)}
                placeholder="Paste the full page source here…"
                className="input min-h-[180px] font-mono text-xs leading-relaxed"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={importing || !pastedHtml.trim()}
              className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto min-w-[140px]"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Parsing…
                </>
              ) : (
                'Extract recipe'
              )}
            </button>
          </form>
          <p className="mt-3 text-xs text-wicker-500 leading-relaxed">
            You&apos;re copying content you already loaded in your browser for personal use. See our{' '}
            <Link to="/terms" className="text-gingham hover:underline">
              Terms
            </Link>
            .
          </p>
        </div>
      )}

      {(mode === 'link' || mode === 'html') && importedData && (
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
                if (mode === 'link') setUrl('')
                else {
                  setPastedHtml('')
                  setSourceUrl('')
                }
              }}
            >
              {mode === 'link' ? 'Try a different link' : 'Paste different HTML'}
            </button>
          </div>
        </div>
      )}

      {(mode === 'hand' || importedData) && (
        <RecipeForm
          key={importedData ? `imported-${mode}` : 'hand'}
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
