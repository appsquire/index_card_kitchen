import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Printer, Download, X, RotateCcw, Check } from 'lucide-react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import RecipeCardPrint, {
  planRecipeCard,
  packPageIndexes,
  facesPerLetterSheet,
  getPageChipLabel,
  SIZE_STYLES,
} from './RecipeCardPrint'
import { measureAndPackPlan } from '../utils/measureCardPlan'

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

function waitForPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  })
}

async function waitForFaceRefs(refs, count) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    let ready = true
    for (let i = 0; i < count; i += 1) {
      if (!refs.current[i]?.querySelector('.recipe-index-card')) {
        ready = false
        break
      }
    }
    if (ready) return true
    await waitForPaint()
  }
  return false
}

const STYLES = [
  { id: 'lined', label: 'Ruled', hint: 'White card with writing lines' },
  { id: 'butter', label: 'Manila', hint: 'Warm scrap-paper yellow' },
  { id: 'enamel', label: 'Kitchen white', hint: 'Clean white, cherry script' },
]

export default function CardStudio({ recipe, onClose }) {
  const [size, setSize] = useState('4x6')
  const [style, setStyle] = useState('enamel')
  const [pageIndex, setPageIndex] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [printSheetOpen, setPrintSheetOpen] = useState(false)
  const [pdfCapturing, setPdfCapturing] = useState(false)
  const [toast, setToast] = useState(null)
  const faceRefs = useRef([])

  const recipeContentKey = useMemo(
    () =>
      JSON.stringify({
        id: recipe?.id,
        title: recipe?.title,
        ings: recipe?.ingredients,
        steps: recipe?.instructions,
      }),
    [recipe]
  )

  const [plan, setPlan] = useState(() => planRecipeCard(recipe, { size: '4x6' }))
  const [refining, setRefining] = useState(true)

  useEffect(() => {
    let cancelled = false
    const draft = planRecipeCard(recipe, { size })
    setPlan(draft)
    setPageIndex(0)
    setRefining(true)

    measureAndPackPlan(recipe, { size, style })
      .then((measured) => {
        if (cancelled) return
        setPlan(measured)
        setRefining(false)
      })
      .catch((err) => {
        console.warn('Card measure failed', err)
        if (!cancelled) setRefining(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeContentKey, size, style])

  const pageCount = plan?.pages?.length || 1
  const isMulti = pageCount > 1
  const ready = Boolean(plan?.pages?.length)

  useEffect(() => {
    if (ready && pageIndex > pageCount - 1) setPageIndex(Math.max(0, pageCount - 1))
  }, [pageCount, pageIndex, ready])

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

  const runPrint = useCallback(async () => {
    if (refining || !ready || printSheetOpen) return

    setPrintSheetOpen(true)
    await waitForPaint()

    document.body.classList.add('printing-card')

    const cleanup = () => {
      document.body.classList.remove('printing-card')
      setPrintSheetOpen(false)
      faceRefs.current = []
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
    window.setTimeout(() => window.print(), 120)
  }, [refining, ready, printSheetOpen])

  const runPdf = useCallback(async () => {
    if (!ready || refining || !plan || printSheetOpen) return
    setExporting(true)
    setPrintSheetOpen(true)
    setPdfCapturing(true)
    try {
      const refsReady = await waitForFaceRefs(faceRefs, pageCount)
      if (!refsReady) {
        showToast('PDF export failed — try again.')
        return
      }
      await waitForPaint()

      const dims = SIZE_STYLES[size] || SIZE_STYLES['4x6']
      const widthIn = parseFloat(dims.width)
      const heightIn = parseFloat(dims.height)

      const pageWidth = 8.5 * 72
      const pageHeight = 11 * 72
      const cardWidth = widthIn * 72
      const cardHeight = heightIn * 72
      const marginX = (pageWidth - cardWidth) / 2
      const marginY = 0.4 * 72
      const gap = 0.15 * 72
      const perSheet = facesPerLetterSheet(size)

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'letter',
      })

      const isCutCard = size === '4x6' || size === '5x7'
      let faceOnSheet = 0
      let yOffset = isCutCard
        ? perSheet === 1
          ? (pageHeight - cardHeight) / 2
          : marginY
        : 0
      const xOffset = isCutCard ? marginX : 0

      for (let i = 0; i < pageCount; i++) {
        const face = faceRefs.current[i]
        const el = face?.querySelector('.recipe-index-card')
        if (!el) continue

        if (faceOnSheet >= perSheet) {
          pdf.addPage('letter', 'portrait')
          faceOnSheet = 0
          yOffset = isCutCard
            ? perSheet === 1
              ? (pageHeight - cardHeight) / 2
              : marginY
            : 0
        }

        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          onclone: (_doc, node) => {
            node.style.visibility = 'visible'
            node.style.opacity = '1'
            let parent = node.parentElement
            while (parent) {
              parent.style.visibility = 'visible'
              parent.style.opacity = '1'
              parent.style.overflow = 'visible'
              parent = parent.parentElement
            }
          },
        })
        const imgData = canvas.toDataURL('image/png')

        if (isCutCard) {
          pdf.setDrawColor(150)
          pdf.setLineDashPattern([4, 2], 0)
          pdf.rect(xOffset - 2, yOffset - 2, cardWidth + 4, cardHeight + 4)
        }
        pdf.addImage(imgData, 'PNG', xOffset, yOffset, cardWidth, cardHeight)

        faceOnSheet += 1
        yOffset += cardHeight + gap
      }

      pdf.save(`${recipe.title.replace(/[^a-z0-9]+/gi, '_')}_card.pdf`)
      showToast('PDF ready.')
    } catch (error) {
      console.error(error)
      showToast('PDF export failed — try Print instead.')
    } finally {
      setExporting(false)
      setPdfCapturing(false)
      setPrintSheetOpen(false)
      faceRefs.current = []
    }
  }, [recipe.title, size, pageCount, ready, refining, plan, printSheetOpen])

  const sheets = ready ? packPageIndexes(pageCount, size) : []

  const previewHint = (() => {
    if (!isMulti) return 'Preview — this is what prints'
    if (pageCount === 2) {
      return pageIndex === 0 ? 'Front of the card' : 'Back of the card'
    }
    return `Page ${pageIndex + 1} of ${pageCount}`
  })()

  const studio = (
    <div
      className="card-studio"
      role="dialog"
      aria-modal="true"
      aria-label="Recipe card studio"
    >
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

            <div className="card-studio__actions">
              <button
                type="button"
                onClick={runPrint}
                disabled={!ready || refining || printSheetOpen}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                {refining ? 'Preparing…' : printSheetOpen ? 'Opening print…' : 'Print'}
              </button>
              <button
                type="button"
                onClick={runPdf}
                disabled={exporting || !ready || refining || printSheetOpen}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                {exporting ? 'Making PDF…' : refining ? 'Preparing…' : 'Download PDF'}
              </button>
              <button type="button" onClick={onClose} className="btn-secondary w-full">
                Done
              </button>
              <button
                type="button"
                onClick={() => {
                  setSize('4x6')
                  setStyle('enamel')
                  setPageIndex(0)
                }}
                className="w-full flex items-center justify-center gap-2 text-sm text-wicker-600 hover:text-wicker-800 py-2"
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
                refining ? 'card-studio__preview--refining' : '',
              ].join(' ')}
            >
              <RecipeCardPrint
                recipe={recipe}
                size={size}
                style={style}
                pageIndex={pageIndex}
                plan={plan}
              />
              {refining && (
                <div className="card-studio__loader" aria-live="polite" aria-busy="true">
                  <div className="card-studio__loader-ring" aria-hidden />
                  <div className="card-studio__loader-card" aria-hidden>
                    Recipe
                  </div>
                  <p className="card-studio__loader-text">Fitting your card…</p>
                </div>
              )}
            </div>

            {ready && isMulti && (
              <div className="card-studio__sides no-print">
                {plan.pages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`card-studio__side-chip ${pageIndex === i ? 'is-active' : ''}`}
                    onClick={() => setPageIndex(i)}
                  >
                    {getPageChipLabel(i, pageCount)}
                  </button>
                ))}
              </div>
            )}

            <p className="card-studio__hint">
              {refining ? 'Checking pagination…' : previewHint}
              <span className="card-studio__hint-size">
                {SIZES.find((s) => s.id === size)?.printLabel}
              </span>
            </p>
          </div>
        </div>
      </div>

      {printSheetOpen && ready && !refining && (
        <div
          className={[
            'card-studio__print-sheet',
            pdfCapturing ? 'card-studio__print-sheet--capture' : '',
            size === 'letter' ? 'card-studio__print-sheet--letter' : 'card-studio__print-sheet--cut',
          ].join(' ')}
          aria-hidden="true"
        >
          {sheets.map((faceIndexes, sheetIdx) => (
            <div
              key={sheetIdx}
              className={[
                'card-studio__print-pack',
                sheetIdx > 0 ? 'card-studio__print-pack--break' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {faceIndexes.map((i) => (
                <div
                  key={i}
                  className="card-studio__print-face"
                  ref={(el) => {
                    faceRefs.current[i] = el
                  }}
                >
                  <RecipeCardPrint
                    recipe={recipe}
                    size={size}
                    style={style}
                    pageIndex={i}
                    plan={plan}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

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
      <div className="text-xs text-wicker-600 mt-0.5">{hint}</div>
    </button>
  )
}
