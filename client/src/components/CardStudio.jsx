import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Printer, Download, X, RotateCcw, Check, ImageDown, Maximize2, Share2 } from 'lucide-react'
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
  { id: '4x6', label: '4×6 recipe card', hint: 'Fits a classic recipe box' },
  { id: '5x7', label: '5×7 keepsake', hint: 'A little more room to write' },
  { id: 'letter', label: 'Full page', hint: 'Binder / fridge printout' },
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

function slugifyTitle(title) {
  return (title || 'recipe').replace(/[^a-z0-9]+/gi, '_')
}

function isMobileDevice() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

function canUseDownloadAttr() {
  // iOS Safari doesn't reliably support the download attribute
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  return !(isIOS || (isSafari && isMobileDevice()))
}

async function captureCardElement(el) {
  return html2canvas(el, {
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
  const [imageCapturing, setImageCapturing] = useState(false)
  const [toast, setToast] = useState(null)
  const [savedImage, setSavedImage] = useState(null) // { url, filename, blob }
  const [viewerOrientKey, setViewerOrientKey] = useState(0)
  const [isPhoneLayout, setIsPhoneLayout] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 900px)').matches : false
  )
  const faceRefs = useRef([])
  const savedImageRef = useRef(null)
  const captureBusy = useRef(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const sync = () => setIsPhoneLayout(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    savedImageRef.current = savedImage
  }, [savedImage])

  useEffect(() => {
    if (!savedImage) return undefined
    const onOrient = () => {
      // Remount the <img> so mobile browsers drop stuck zoom/size after rotate.
      window.setTimeout(() => setViewerOrientKey((k) => k + 1), 50)
    }
    window.addEventListener('orientationchange', onOrient)
    return () => window.removeEventListener('orientationchange', onOrient)
  }, [savedImage])

  useEffect(() => {
    return () => {
      if (savedImageRef.current?.url) URL.revokeObjectURL(savedImageRef.current.url)
    }
  }, [])

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

  const closeSavedImage = useCallback(() => {
    setSavedImage((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url)
      return null
    })
  }, [])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (savedImage) {
        closeSavedImage()
        return
      }
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, savedImage, closeSavedImage])

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

  const captureCurrentPage = useCallback(async () => {
    if (!ready || refining || printSheetOpen || captureBusy.current) return null
    captureBusy.current = true
    setExporting(true)
    setPrintSheetOpen(true)
    setImageCapturing(true)
    try {
      const refsReady = await waitForFaceRefs(faceRefs, pageCount)
      if (!refsReady) return null
      await waitForPaint()

      const face = faceRefs.current[pageIndex]
      const el = face?.querySelector('.recipe-index-card')
      if (!el) return null

      const canvas = await captureCardElement(el)
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) return null

      const filename = `${slugifyTitle(recipe.title)}_card.png`
      const url = URL.createObjectURL(blob)
      return { url, filename, blob }
    } catch (error) {
      console.error(error)
      return null
    } finally {
      captureBusy.current = false
      setExporting(false)
      setImageCapturing(false)
      setPrintSheetOpen(false)
      faceRefs.current = []
    }
  }, [recipe.title, pageCount, pageIndex, ready, refining, printSheetOpen])

  const showCapturedImage = useCallback((captured) => {
    setSavedImage((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url)
      return captured
    })
  }, [])

  const downloadCaptured = useCallback((captured) => {
    const a = document.createElement('a')
    a.href = captured.url
    a.download = captured.filename
    a.click()
    showToast('Downloaded')
  }, [])

  const shareCaptured = useCallback(
    async (captured) => {
      const file = new File([captured.blob], captured.filename, { type: 'image/png' })
      if (
        !(
          window.isSecureContext &&
          typeof navigator.canShare === 'function' &&
          navigator.canShare({ files: [file] })
        )
      ) {
        return false
      }
      try {
        await navigator.share({ files: [file], title: recipe.title })
        showToast('Shared.')
        return true
      } catch (err) {
        if (err?.name === 'AbortError') return true
        return false
      }
    },
    [recipe.title],
  )

  // Capture stays in this tab. Opening a blank tab first backgrounds us and
  // throttles requestAnimationFrame / html2canvas — that's why "Opening card…" stuck.
  const openAsImage = useCallback(async () => {
    const captured = await captureCurrentPage()
    if (!captured) {
      showToast("Couldn't open the card - try again.")
      return
    }
    showCapturedImage(captured)
  }, [captureCurrentPage, showCapturedImage])

  const runImageSave = useCallback(async () => {
    const captured = await captureCurrentPage()
    if (!captured) {
      showToast("Couldn't capture the card - try again.")
      return
    }

    const file = new File([captured.blob], captured.filename, { type: 'image/png' })
    if (
      window.isSecureContext &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({ files: [file], title: recipe.title })
        URL.revokeObjectURL(captured.url)
        showToast('Shared.')
        return
      } catch (err) {
        if (err?.name === 'AbortError') {
          URL.revokeObjectURL(captured.url)
          return
        }
        // Share failed - fall through to show image
      }
    }

    // Show the image viewer
    showCapturedImage(captured)

    // Only auto-download on desktop where it works reliably
    if (canUseDownloadAttr()) {
      downloadCaptured(captured)
    } else if (isMobileDevice()) {
      // On mobile without share support, guide the user
      showToast('Press and hold to save')
    }
  }, [captureCurrentPage, recipe.title, downloadCaptured, showCapturedImage])

  const downloadSavedBlob = useCallback(() => {
    if (!savedImage) return
    downloadCaptured(savedImage)
  }, [savedImage, downloadCaptured])

  const shareSavedBlob = useCallback(async () => {
    if (!savedImage) return
    const shared = await shareCaptured(savedImage)
    if (!shared) downloadCaptured(savedImage)
  }, [savedImage, shareCaptured, downloadCaptured])

  const sheets = ready ? packPageIndexes(pageCount, size) : []

  const previewHint = (() => {
    if (refining) return 'Checking pagination…'
    if (imageCapturing) return 'Opening…'
    if (!isMulti) return isPhoneLayout ? '' : 'Click to view image'
    if (pageCount === 2) {
      return pageIndex === 0 ? 'Front' : 'Back'
    }
    return `Page ${pageIndex + 1} of ${pageCount}`
  })()

  const studio = (
    <div
      className="card-studio"
      role="dialog"
      aria-modal="true"
      aria-label="Recipe card"
    >
      <div className="card-studio__chrome no-print">
        <header className="card-studio__top">
          <div>
            <p className="font-hand text-gingham text-lg leading-none mb-1">Recipe card</p>
            <h2 className="font-hand text-3xl sm:text-4xl text-wicker-900 leading-tight">
              {recipe.title}
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
                onClick={runImageSave}
                disabled={exporting || !ready || refining || printSheetOpen}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <ImageDown className="w-4 h-4" />
                {exporting && imageCapturing
                  ? 'Saving…'
                  : refining
                    ? 'Preparing…'
                    : 'Save image'}
              </button>
              <button
                type="button"
                onClick={runPrint}
                disabled={!ready || refining || printSheetOpen}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                {refining ? 'Preparing…' : printSheetOpen && !imageCapturing ? 'Opening print…' : 'Print'}
              </button>
              <button
                type="button"
                onClick={runPdf}
                disabled={exporting || !ready || refining || printSheetOpen}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                {exporting && pdfCapturing
                  ? 'Making PDF…'
                  : refining
                    ? 'Preparing…'
                    : 'Download PDF'}
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
              isPhoneLayout ? 'card-studio__stage--viewing' : '',
            ].join(' ')}
          >
            <div
              className={[
                'card-studio__preview',
                'card-studio__preview--focusable',
                SIZE_PREVIEW_CLASS[size] || SIZE_PREVIEW_CLASS['4x6'],
                refining ? 'card-studio__preview--refining' : '',
                imageCapturing ? 'card-studio__preview--capturing' : '',
              ].join(' ')}
              role="button"
              tabIndex={ready && !refining && !imageCapturing ? 0 : -1}
              aria-label="Open recipe card as image"
              onClick={() => {
                if (!ready || refining || imageCapturing) return
                openAsImage()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  if (!ready || refining || imageCapturing) return
                  openAsImage()
                }
              }}
            >
              <RecipeCardPrint
                recipe={recipe}
                size={size}
                style={style}
                pageIndex={pageIndex}
                plan={plan}
              />
              {ready && !refining && (
                <span className="card-studio__expand-badge" aria-hidden="true">
                  <Maximize2 className="w-4 h-4" />
                  {isPhoneLayout ? (imageCapturing ? 'Opening…' : 'Full screen') : null}
                </span>
              )}
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

            {previewHint ? (
              <p className="card-studio__hint">{previewHint}</p>
            ) : null}
          </div>
        </div>
      </div>

      {printSheetOpen && ready && !refining && (
        <div
          className={[
            'card-studio__print-sheet',
            pdfCapturing || imageCapturing ? 'card-studio__print-sheet--capture' : '',
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

      {savedImage && (
        <div
          className="card-studio__saved-overlay no-print"
          role="dialog"
          aria-modal="true"
          aria-label="Recipe card image"
        >
          <header className="card-studio__saved-header">
            <p className="card-studio__saved-title">{recipe.title}</p>
            <div className="card-studio__saved-actions">
              <button
                type="button"
                className="card-studio__photo-action"
                onClick={shareSavedBlob}
                aria-label="Share image"
                title="Share"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="card-studio__photo-action"
                onClick={downloadSavedBlob}
                aria-label="Download image"
                title="Download"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="card-studio__photo-close"
                onClick={closeSavedImage}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          <div className="card-studio__saved-stage">
            <img
              key={viewerOrientKey}
              src={savedImage.url}
              alt={`${recipe.title} recipe card`}
              className="card-studio__saved-img"
            />
            {isMobileDevice() && !canUseDownloadAttr() && (
              <p className="card-studio__saved-hint">
                Press and hold the image to save to your photos
              </p>
            )}
          </div>
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
