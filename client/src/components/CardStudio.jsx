import { useEffect, useMemo, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Printer, Download, X, RotateCcw, Check } from 'lucide-react'
import RecipeCardPrint, { planRecipeCard } from './RecipeCardPrint'
import { recipeApi } from '../services/api'
import { useAuth } from '../context/AuthContext'

const SIZES = [
  { id: '4x6', label: '4×6 recipe card', hint: 'Landscape — fits a classic recipe box', printLabel: 'Prints at 6 × 4 inches (landscape)' },
  { id: '5x7', label: '5×7 keepsake', hint: 'A little more room to write', printLabel: 'Prints at 7 × 5 inches (landscape)' },
  { id: 'letter', label: 'Full page', hint: 'Binder / fridge printout', printLabel: 'Prints at 8.5 × 11 inches' },
]

const SIZE_PREVIEW_CLASS = {
  '4x6': 'card-studio__preview--4x6',
  '5x7': 'card-studio__preview--5x7',
  letter: 'card-studio__preview--letter',
}

const STYLES = [
  { id: 'lined', label: 'Ruled', hint: 'White card with writing lines' },
  { id: 'butter', label: 'Manila', hint: 'Warm scrap-paper yellow' },
  { id: 'enamel', label: 'Kitchen white', hint: 'Clean white, cherry script' },
]

export default function CardStudio({ recipe, onClose }) {
  const { isAuthenticated } = useAuth()
  const [size, setSize] = useState('4x6')
  const [style, setStyle] = useState('enamel')
  const [layout, setLayout] = useState('split')
  const [side, setSide] = useState('front')
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState(null)

  const plan = useMemo(
    () => planRecipeCard(recipe, { size, layout }),
    [recipe, size, layout]
  )
  const needsBack = plan.needsBack

  useEffect(() => {
    if (!needsBack && side === 'back') setSide('front')
  }, [needsBack, side])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const showToast = (message) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2200)
  }

  const runPrint = useCallback(() => {
    document.body.classList.add('printing-card')
    const cleanup = () => {
      document.body.classList.remove('printing-card')
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
    window.setTimeout(() => window.print(), 80)
  }, [])

  const runPdf = useCallback(async () => {
    setExporting(true)
    try {
      const blob = await recipeApi.exportPdf(recipe.id, { size, style, layout })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${recipe.title.replace(/[^a-z0-9]+/gi, '_')}_card.pdf`
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      showToast(needsBack ? 'PDF ready — front & back included.' : 'PDF ready for the recipe box.')
    } catch (error) {
      console.error(error)
      const msg = error?.message
      showToast(
        msg && msg !== 'Network Error'
          ? msg
          : 'PDF export failed — try Print instead.'
      )
    } finally {
      setExporting(false)
    }
  }, [recipe.id, recipe.title, size, style, layout, needsBack])

  const handleExportPdf = () => {
    if (!isAuthenticated) {
      showToast('Sign in to download a PDF, or just print from here.')
      return
    }
    if (!recipe.id || String(recipe.id).startsWith('local_')) {
      showToast('Cloud-save this recipe first, then export PDF.')
      return
    }
    // Export immediately — delaying behind the box animation loses the
    // user gesture and browsers often block the download.
    runPdf()
  }

  const handlePrint = () => {
    runPrint()
  }

  const studio = (
    <div className="card-studio" role="dialog" aria-modal="true" aria-label="Recipe card studio">
      <div className="card-studio__chrome no-print">
        <header className="card-studio__top">
          <div>
            <p className="font-hand text-gingham text-lg leading-none mb-1">Card studio</p>
            <h2 className="font-hand text-3xl sm:text-4xl text-wicker-900 leading-tight">
              Make your recipe card
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary !px-3"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="card-studio__layout">
          <aside className="card-studio__controls">
            <ControlGroup label="Size">
              {SIZES.map((opt) => (
                <OptionButton
                  key={opt.id}
                  active={size === opt.id}
                  title={opt.label}
                  hint={opt.hint}
                  onClick={() => setSize(opt.id)}
                />
              ))}
            </ControlGroup>

            <ControlGroup label="Paper">
              {STYLES.map((opt) => (
                <OptionButton
                  key={opt.id}
                  active={style === opt.id}
                  title={opt.label}
                  hint={opt.hint}
                  onClick={() => setStyle(opt.id)}
                />
              ))}
            </ControlGroup>

            <ControlGroup label="Layout">
              <div className="flex gap-2">
                {[
                  { id: 'split', label: 'Two columns' },
                  { id: 'stacked', label: 'Stacked' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLayout(opt.id)}
                    className={`flex-1 px-3 py-2.5 text-sm font-semibold rounded-md border-2 transition-colors ${
                      layout === opt.id
                        ? 'border-gingham bg-gingham text-white'
                        : 'border-wicker-200 bg-white text-wicker-700 hover:border-wicker-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </ControlGroup>

            {needsBack && (
              <ControlGroup label="Card side">
                <p className="text-xs text-wicker-600 mb-2 leading-snug">
                  This recipe needs both sides — nothing gets cut off.
                </p>
                <div className="flex gap-2">
                  {[
                    { id: 'front', label: 'Front' },
                    { id: 'back', label: 'Back' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSide(s.id)}
                      className={`flex-1 px-3 py-2.5 text-sm font-semibold rounded-md border-2 transition-colors ${
                        side === s.id
                          ? 'border-gingham bg-gingham text-white'
                          : 'border-wicker-200 bg-white text-wicker-700 hover:border-wicker-400'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </ControlGroup>
            )}

            <div className="card-studio__actions">
              <button
                type="button"
                onClick={handlePrint}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                {needsBack ? 'Print both sides' : 'Print card'}
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={exporting}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                {exporting ? 'Making PDF…' : needsBack ? 'Download PDF (2 sides)' : 'Download PDF'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary w-full"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => {
                  setSize('4x6')
                  setStyle('enamel')
                  setLayout('split')
                  setSide('front')
                }}
                className="w-full flex items-center justify-center gap-2 text-sm text-wicker-500 hover:text-wicker-800 py-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>
          </aside>

          <div
            className={[
              'card-studio__stage',
              size === 'letter' ? 'card-studio__stage--letter' : '',
            ].join(' ')}
          >
            <div
              className={[
                'card-studio__preview',
                SIZE_PREVIEW_CLASS[size] || SIZE_PREVIEW_CLASS['4x6'],
              ].join(' ')}
            >
              <RecipeCardPrint
                recipe={recipe}
                size={size}
                style={style}
                layout={layout}
                side={side}
                plan={plan}
              />
            </div>

            {needsBack && (
              <div className="card-studio__sides no-print">
                <button
                  type="button"
                  className={`card-studio__side-chip ${side === 'front' ? 'is-active' : ''}`}
                  onClick={() => setSide('front')}
                >
                  Front
                </button>
                <button
                  type="button"
                  className={`card-studio__side-chip ${side === 'back' ? 'is-active' : ''}`}
                  onClick={() => setSide('back')}
                >
                  Back
                </button>
              </div>
            )}

            <p className="card-studio__hint">
              {needsBack
                ? side === 'back'
                  ? 'Back of the card — prints as page 2'
                  : 'Front of the card — flip for the rest'
                : 'Preview — this is what prints'}
              <span className="card-studio__hint-size">
                {SIZES.find((s) => s.id === size)?.printLabel}
                {needsBack ? ' · 2-sided' : ''}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="card-studio__print-sheet">
        <RecipeCardPrint
          recipe={recipe}
          size={size}
          style={style}
          layout={layout}
          side="front"
          plan={plan}
        />
        {needsBack && (
          <div className="card-studio__print-page">
            <RecipeCardPrint
              recipe={recipe}
              size={size}
              style={style}
              layout={layout}
              side="back"
              plan={plan}
            />
          </div>
        )}
      </div>

      {toast && (
        <div className="card-studio__toast no-print">
          <Check className="w-4 h-4" />
          {toast}
        </div>
      )}
    </div>
  )

  return createPortal(studio, document.body)
}

function ControlGroup({ label, children }) {
  return (
    <div className="card-studio__group">
      <h3>{label}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function OptionButton({ active, title, hint, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-md border-2 transition-all ${
        active
          ? 'border-gingham bg-white shadow-sm'
          : 'border-wicker-200 bg-white/70 hover:border-wicker-400'
      }`}
    >
      <div className="font-semibold text-wicker-900 text-sm">{title}</div>
      <div className="text-xs text-wicker-500 mt-0.5">{hint}</div>
    </button>
  )
}
