import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Printer, Download, X, RotateCcw, Check } from 'lucide-react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import RecipeCardPrint, {
  planRecipeCard,
  spillOneOverflowItem,
  detectCardOverflow,
  packPageIndexes,
  facesPerLetterSheet,
  getPageChipLabel,
  SIZE_STYLES,
  MAX_CARD_PAGES,
} from './RecipeCardPrint'

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

function plansEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

export default function CardStudio({ recipe, onClose }) {
  const [size, setSize] = useState('4x6')
  const [style, setStyle] = useState('enamel')
  const [layout, setLayout] = useState('split')
  const [pageIndex, setPageIndex] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState(null)
  const [plan, setPlan] = useState(() => planRecipeCard(recipe, { size: '4x6', layout: 'split' }))
  const faceRefs = useRef([])
  const previewRef = useRef(null)
  const refineCountRef = useRef(0)
  const MAX_REFINE_STEPS = 64

  // Stable key so parent re-renders with a new recipe object don't reset the plan
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

  const basePlan = useMemo(
    () => planRecipeCard(recipe, { size, layout }),
    // recipeContentKey captures recipe fields; size/layout drive pagination
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recipeContentKey, size, layout]
  )

  // Reset to seeded plan when recipe/size/layout/style change — not on every parent render
  useEffect(() => {
    setPlan(basePlan)
    setPageIndex(0)
    refineCountRef.current = 0
  }, [basePlan, style])

  const pageCount = plan.pages?.length || 1
  const isMulti = pageCount > 1

  useEffect(() => {
    if (pageIndex > pageCount - 1) setPageIndex(Math.max(0, pageCount - 1))
  }, [pageCount, pageIndex])

  // Measure-and-spill: refine seeded plan if a face still clips.
  useEffect(() => {
    let cancelled = false
    let raf = 0
    const timers = []

    const refine = () => {
      if (cancelled) return
      if (refineCountRef.current >= MAX_REFINE_STEPS) return

      const pages = plan.pages || []
      let needsRetry = false

      for (let i = 0; i < pages.length && i < MAX_CARD_PAGES; i++) {
        // Prefer on-screen preview for the visible page; print faces for others
        const cardEl =
          i === pageIndex && previewRef.current
            ? previewRef.current
            : faceRefs.current[i]
        if (!cardEl) {
          needsRetry = true
          continue
        }

        const overflow = detectCardOverflow(cardEl)
        if (!overflow) continue
        if (overflow.notReady) {
          needsRetry = true
          continue
        }

        const next = spillOneOverflowItem(plan, i, {
          preferColumn: overflow.preferColumn,
        })
        if (!plansEqual(next, plan)) {
          refineCountRef.current += 1
          setPlan(next)
          return
        }
      }

      if (needsRetry && refineCountRef.current < MAX_REFINE_STEPS) {
        timers.push(
          window.setTimeout(() => {
            raf = requestAnimationFrame(refine)
          }, 50)
        )
      }
    }

    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(refine)
    })
    timers.push(
      window.setTimeout(() => {
        if (!cancelled) refine()
      }, 150)
    )
    timers.push(
      window.setTimeout(() => {
        if (!cancelled) refine()
      }, 450)
    )

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      timers.forEach((t) => window.clearTimeout(t))
    }
  }, [plan, size, style, layout, pageIndex])

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

  const printLabel =
    pageCount <= 1
      ? 'Print card'
      : pageCount === 2
        ? 'Print both sides'
        : 'Print all cards'

  const pdfLabel =
    pageCount <= 1
      ? 'Download PDF'
      : pageCount === 2
        ? 'Download PDF (2 sides)'
        : `Download PDF (${pageCount} cards)`

  const multiCopy =
    pageCount === 2
      ? 'This recipe needs both sides.'
      : pageCount >= 3
        ? `This recipe needs ${pageCount} cards.`
        : null

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
        const el = faceRefs.current[i]
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
        })
        const imgData = canvas.toDataURL('image/png')

        // Cut guides only for 4×6 / 5×7 — Full page has no dashed border
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
      showToast(
        pageCount <= 1
          ? 'PDF ready for the recipe box.'
          : pageCount === 2
            ? 'PDF ready — front & back included.'
            : `PDF ready — ${pageCount} cards included.`
      )
    } catch (error) {
      console.error(error)
      showToast('PDF export failed — try Print instead.')
    } finally {
      setExporting(false)
    }
  }, [recipe.title, size, pageCount])

  const handleExportPdf = () => {
    runPdf()
  }

  const handlePrint = () => {
    runPrint()
  }

  const sheets = packPageIndexes(pageCount, size)

  const previewHint = (() => {
    if (!isMulti) return 'Preview — this is what prints'
    if (pageCount === 2) {
      return pageIndex === 0 ? 'Front of the card' : 'Back of the card'
    }
    return `Page ${pageIndex + 1} of ${pageCount}`
  })()

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

            <div className="card-studio__actions">
              <button
                type="button"
                onClick={handlePrint}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                {printLabel}
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={exporting}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                {exporting ? 'Making PDF…' : pdfLabel}
              </button>
              <button type="button" onClick={onClose} className="btn-secondary w-full">
                Done
              </button>
              <button
                type="button"
                onClick={() => {
                  setSize('4x6')
                  setStyle('enamel')
                  setLayout('split')
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
              ].join(' ')}
              ref={previewRef}
            >
              <RecipeCardPrint
                recipe={recipe}
                size={size}
                style={style}
                layout={layout}
                pageIndex={pageIndex}
                plan={plan}
              />
            </div>

            {isMulti && (
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
              {previewHint}
              {multiCopy ? ` · ${multiCopy}` : ''}
              <span className="card-studio__hint-size">
                {SIZES.find((s) => s.id === size)?.printLabel}
                {pageCount === 2 ? ' · 2-sided' : pageCount >= 3 ? ` · ${pageCount} cards` : ''}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div
        className={[
          'card-studio__print-sheet',
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
                  layout={layout}
                  pageIndex={i}
                  plan={plan}
                />
              </div>
            ))}
          </div>
        ))}
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
      <div className="text-xs text-wicker-600 mt-0.5">{hint}</div>
    </button>
  )
}
