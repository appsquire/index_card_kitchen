import { useEffect, useMemo, useState } from 'react'
import { Printer, Download, X, RotateCcw, Check } from 'lucide-react'
import RecipeCardPrint from './RecipeCardPrint'
import { recipeApi } from '../services/api'
import { useAuth } from '../context/AuthContext'

const SIZES = [
  { id: '4x6', label: '4×6 box card', hint: 'Fits a classic recipe box' },
  { id: '5x7', label: '5×7 keepsake', hint: 'Roomier, still giftable' },
  { id: 'letter', label: 'Full page', hint: 'Letter sheet for binders' },
]

const STYLES = [
  { id: 'lined', label: 'School card', hint: 'Blue lines & pink margin' },
  { id: 'butter', label: 'Manila', hint: 'Warm kitchen scrap paper' },
  { id: 'enamel', label: 'Cherry enamel', hint: 'Clean white with a red band' },
]

const LAYOUTS = [
  { id: 'split', label: 'Side by side' },
  { id: 'stacked', label: 'Stacked' },
]

export default function CardStudio({ recipe, onClose }) {
  const { isAuthenticated } = useAuth()
  const [size, setSize] = useState('4x6')
  const [style, setStyle] = useState('lined')
  const [layout, setLayout] = useState('split')
  const [side, setSide] = useState('front')
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const previewScale = size === 'letter' ? 0.55 : size === '5x7' ? 0.78 : 0.92

  // Probe whether back side is needed by counting content
  const needsBack = useMemo(() => {
    if (size === 'letter' || layout === 'stacked') return false
    const ing = recipe.ingredients?.filter((i) => i?.name?.trim()).length || 0
    const steps = recipe.instructions?.filter((i) => i?.step?.trim()).length || 0
    const ingLimit = size === '4x6' ? 10 : 14
    const stepLimit = size === '4x6' ? 6 : 8
    return ing > ingLimit || steps > stepLimit
  }, [recipe, size, layout])

  useEffect(() => {
    if (!needsBack && side === 'back') setSide('front')
  }, [needsBack, side])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'f' || e.key === 'F') setSide('front')
      if ((e.key === 'b' || e.key === 'B') && needsBack) setSide('back')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, needsBack])

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(null), 2200)
  }

  const handlePrint = () => {
    document.body.classList.add('printing-card')
    const cleanup = () => {
      document.body.classList.remove('printing-card')
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
    setTimeout(() => window.print(), 50)
  }

  const handleExportPdf = async () => {
    if (!isAuthenticated) {
      showToast('Sign in to download a PDF, or print from here.')
      return
    }
    if (!recipe.id || String(recipe.id).startsWith('local_')) {
      showToast('Save this recipe to your account first, then export PDF.')
      return
    }

    setExporting(true)
    try {
      const blob = await recipeApi.exportPdf(recipe.id, { size, style, layout })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${recipe.title.replace(/[^a-z0-9]+/gi, '_')}_card.pdf`
      a.click()
      URL.revokeObjectURL(url)
      showToast('PDF saved — ready for the recipe box.')
    } catch (error) {
      console.error(error)
      showToast('PDF export failed. Try print instead.')
    } finally {
      setExporting(false)
    }
  }

  const onPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: py * -6, y: px * 8 })
  }

  const resetTilt = () => setTilt({ x: 0, y: 0 })

  return (
    <div className="card-studio no-print-hide-parent">
      <div className="card-studio__chrome no-print">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="font-hand text-gingham text-lg mb-1">Card studio</p>
            <h2 className="text-3xl sm:text-4xl text-wicker-900 leading-none">
              Make it look like Nana wrote it
            </h2>
            <p className="mt-2 text-wicker-600 max-w-xl">
              Tweak the size and paper, flip the card if it runs long, then print or save when it feels right.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary !px-3"
            aria-label="Close card studio"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid lg:grid-cols-[240px_1fr] gap-6 items-start">
          <aside className="space-y-5">
            <ControlGroup label="Card size">
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
                {LAYOUTS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLayout(opt.id)}
                    className={`flex-1 px-3 py-2 text-sm font-semibold rounded-sm border-2 transition-colors ${
                      layout === opt.id
                        ? 'border-gingham bg-gingham text-white'
                        : 'border-wicker-200 bg-enamel text-wicker-700 hover:border-wicker-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </ControlGroup>

            {needsBack && (
              <ControlGroup label="Side">
                <div className="flex gap-2">
                  {['front', 'back'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSide(s)}
                      className={`flex-1 px-3 py-2 text-sm font-semibold rounded-sm border-2 capitalize transition-colors ${
                        side === s
                          ? 'border-gingham bg-gingham text-white'
                          : 'border-wicker-200 bg-enamel text-wicker-700 hover:border-wicker-400'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-wicker-500 mt-2">
                  Shortcut: F front · B back
                </p>
              </ControlGroup>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handlePrint}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print this card
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={exporting}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                {exporting ? 'Making PDF…' : 'Download PDF'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSize('4x6')
                  setStyle('lined')
                  setLayout('split')
                  setSide('front')
                }}
                className="w-full flex items-center justify-center gap-2 text-sm text-wicker-500 hover:text-wicker-800 py-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset defaults
              </button>
            </div>
          </aside>

          <div
            className="card-studio__stage"
            onMouseMove={onPointerMove}
            onMouseLeave={resetTilt}
          >
            <div
              className="card-studio__stage-inner"
              style={{
                transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              }}
            >
              <div
                className={`card-studio__flip ${side === 'back' ? 'is-flipped' : ''}`}
                style={{ ['--preview-scale']: previewScale }}
              >
                <div className="card-studio__face card-studio__face--front">
                  <RecipeCardPrint
                    recipe={recipe}
                    size={size}
                    style={style}
                    layout={layout}
                    side="front"
                  />
                </div>
                <div className="card-studio__face card-studio__face--back">
                  <RecipeCardPrint
                    recipe={recipe}
                    size={size}
                    style={style}
                    layout={layout}
                    side="back"
                  />
                </div>
              </div>
            </div>
            <p className="card-studio__hint no-print">
              Move your mouse over the card · click Front/Back if it overflows
            </p>
          </div>
        </div>
      </div>

      {/* Print-only surface */}
      <div className="card-studio__print-sheet">
        <RecipeCardPrint
          recipe={recipe}
          size={size}
          style={style}
          layout={layout}
          side={side}
        />
        {needsBack && side === 'front' && (
          <div className="mt-6 break-before-page">
            <RecipeCardPrint
              recipe={recipe}
              size={size}
              style={style}
              layout={layout}
              side="back"
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
}

function ControlGroup({ label, children }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-wicker-500 mb-2">
        {label}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function OptionButton({ active, title, hint, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-sm border-2 transition-all ${
        active
          ? 'border-gingham bg-gingham/5 shadow-paper'
          : 'border-wicker-200 bg-enamel hover:border-wicker-400'
      }`}
    >
      <div className="font-semibold text-wicker-900 text-sm">{title}</div>
      <div className="text-xs text-wicker-500 mt-0.5">{hint}</div>
    </button>
  )
}
