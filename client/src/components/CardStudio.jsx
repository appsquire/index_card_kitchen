import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Printer, Download, X, RotateCcw, Check, ImageIcon, ImageDown, Type } from 'lucide-react'
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

const SIZE_PHOTO_CLASS = {
  '4x6': 'card-studio__photo-preview--4x6',
  '5x7': 'card-studio__photo-preview--5x7',
  letter: 'card-studio__photo-preview--letter',
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

function pageImageSuffix(pageIdx, totalPages) {
  if (totalPages <= 1) return ''
  if (totalPages === 2) return pageIdx === 0 ? '_front' : '_back'
  return `_page_${pageIdx + 1}`
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

async function savePngBlob(blob, filename, shareTitle) {
  const file = new File([blob], filename, { type: 'image/png' })
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: shareTitle })
      return 'shared'
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled'
    }
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
  return 'downloaded'
}

function canShareImageFiles() {
  if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') {
    return false
  }
  try {
    const probe = new File([new Uint8Array([137, 80, 78, 71])], 'card.png', {
      type: 'image/png',
    })
    return navigator.canShare({ files: [probe] })
  } catch {
    return false
  }
}

const STYLES = [
  { id: 'lined', label: 'Ruled', hint: 'White card with writing lines' },
  { id: 'butter', label: 'Manila', hint: 'Warm scrap-paper yellow' },
  { id: 'enamel', label: 'Kitchen white', hint: 'Clean white, cherry script' },
]

export default function CardStudio({
  recipe,
  onClose,
  variant = 'studio',
  initialPhotoOpen = false,
  largeText: largeTextProp = false,
}) {
  const isViewMode = variant === 'view'
  const [size, setSize] = useState('4x6')
  const [style, setStyle] = useState('enamel')
  const [pageIndex, setPageIndex] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [printSheetOpen, setPrintSheetOpen] = useState(false)
  const [pdfCapturing, setPdfCapturing] = useState(false)
  const [imageCapturing, setImageCapturing] = useState(false)
  const [toast, setToast] = useState(null)
  const [photoViewOpen, setPhotoViewOpen] = useState(initialPhotoOpen)
  const [largeText, setLargeText] = useState(largeTextProp)
  const [showPrintOptions, setShowPrintOptions] = useState(false)
  const [isPhoneLayout, setIsPhoneLayout] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 900px)').matches : false
  )
  const [canShareImages] = useState(canShareImageFiles)
  const faceRefs = useRef([])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const sync = () => setIsPhoneLayout(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    setLargeText(largeTextProp)
  }, [largeTextProp])

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
    if (!isViewMode || refining || !ready) return undefined
    if (isPhoneLayout || initialPhotoOpen) {
      setPhotoViewOpen(true)
    }
    return undefined
  }, [isViewMode, isPhoneLayout, initialPhotoOpen, refining, ready])

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

        const canvas = await captureCardElement(el)
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

      pdf.save(`${slugifyTitle(recipe.title)}_card.pdf`)
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

  const runImageSave = useCallback(
    async (scope = 'current') => {
      if (!ready || refining || printSheetOpen) return
      setExporting(true)
      setPrintSheetOpen(true)
      setImageCapturing(true)
      try {
        const refsReady = await waitForFaceRefs(faceRefs, pageCount)
        if (!refsReady) {
          showToast('Image save failed — try again.')
          return
        }
        await waitForPaint()

        const indices =
          scope === 'all'
            ? Array.from({ length: pageCount }, (_, i) => i)
            : [pageIndex]
        const base = slugifyTitle(recipe.title)

        for (let j = 0; j < indices.length; j += 1) {
          const i = indices[j]
          const face = faceRefs.current[i]
          const el = face?.querySelector('.recipe-index-card')
          if (!el) continue

          const canvas = await captureCardElement(el)
          const blob = await new Promise((resolve) => {
            canvas.toBlob(resolve, 'image/png')
          })
          if (!blob) {
            showToast('Image save failed — try again.')
            return
          }

          const filename = `${base}_card${pageImageSuffix(i, pageCount)}.png`
          const result = await savePngBlob(blob, filename, recipe.title)
          if (result === 'cancelled') {
            showToast('Save cancelled.')
            return
          }

          if (indices.length > 1 && j < indices.length - 1) {
            await new Promise((resolve) => {
              window.setTimeout(resolve, 350)
            })
          }
        }

        if (indices.length > 1) {
          showToast('Images saved.')
        } else if (isPhoneLayout && canShareImages) {
          showToast('Saved to Photos.')
        } else {
          showToast('Image saved.')
        }
      } catch (error) {
        console.error(error)
        showToast('Image save failed — try again.')
      } finally {
        setExporting(false)
        setImageCapturing(false)
        setPrintSheetOpen(false)
        faceRefs.current = []
      }
    },
    [recipe.title, pageCount, pageIndex, ready, refining, printSheetOpen, isPhoneLayout, canShareImages]
  )

  const sheets = ready ? packPageIndexes(pageCount, size) : []

  const previewHint = (() => {
    if (!isMulti) return 'Preview — this is what prints'
    if (pageCount === 2) {
      return pageIndex === 0 ? 'Front of the card' : 'Back of the card'
    }
    return `Page ${pageIndex + 1} of ${pageCount}`
  })()

  useEffect(() => {
    if (!photoViewOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setPhotoViewOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [photoViewOpen])

  const cardPrintProps = {
    recipe,
    size,
    style,
    pageIndex,
    plan,
    largeText,
  }

  const saveImageLabel =
    isPhoneLayout && canShareImages ? 'Save to Photos' : 'Save as image'
  const saveImageShortLabel =
    isPhoneLayout && canShareImages ? 'Save to Photos' : 'Save image'
  const showMobileCookDock = isViewMode && isPhoneLayout && !photoViewOpen && ready && !refining
  const hideStudioChrome = isViewMode && isPhoneLayout && photoViewOpen

  const studio = (
    <div
      className={[
        'card-studio',
        isViewMode ? 'card-studio--view' : '',
        isViewMode && isPhoneLayout ? 'card-studio--mobile-cook' : '',
      ].filter(Boolean).join(' ')}
      role="dialog"
      aria-modal="true"
      aria-label={isViewMode ? 'Recipe card view' : 'Recipe card studio'}
    >
      <div className={`card-studio__chrome no-print${hideStudioChrome ? ' card-studio__chrome--hidden' : ''}`}>
        <header className="card-studio__top">
          <div>
            <p className="font-hand text-gingham text-lg leading-none mb-1">
              {isViewMode ? 'Recipe card' : 'Card studio'}
            </p>
            <h2 className="font-hand text-3xl sm:text-4xl text-wicker-900 leading-tight">
              {isViewMode ? recipe.title : 'Make your recipe card'}
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
          {!isViewMode || showPrintOptions ? (
            <aside className="card-studio__controls">
              {isViewMode && (
                <p className="text-sm text-wicker-600 -mt-1 mb-1">
                  Optional — most people just view the card on their phone.
                </p>
              )}

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
                  onClick={() => runImageSave('all')}
                  disabled={exporting || !ready || refining || printSheetOpen}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <ImageDown className="w-4 h-4" />
                  {exporting && imageCapturing
                    ? 'Saving image…'
                    : refining
                      ? 'Preparing…'
                      : saveImageLabel}
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
                {!isViewMode && (
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
                )}
              </div>
            </aside>
          ) : isPhoneLayout ? null : (
            <aside className="card-studio__controls card-studio__controls--view">
              <button
                type="button"
                className={`card-studio__large-text-toggle ${largeText ? 'is-active' : ''}`}
                onClick={() => setLargeText((v) => !v)}
                aria-pressed={largeText}
              >
                <Type className="w-4 h-4" aria-hidden />
                Large text
                <span className="card-studio__large-text-hint">Easier to read from across the counter</span>
              </button>

              <button
                type="button"
                className="btn-primary w-full flex items-center justify-center gap-2"
                disabled={exporting || !ready || refining || printSheetOpen}
                onClick={() => runImageSave('current')}
              >
                <ImageDown className="w-4 h-4" aria-hidden />
                {exporting && imageCapturing ? 'Saving…' : saveImageLabel}
              </button>

              {!isPhoneLayout && (
                <button
                  type="button"
                  className="btn-secondary w-full"
                  onClick={() => setPhotoViewOpen(true)}
                >
                  <ImageIcon className="w-4 h-4 inline mr-2" aria-hidden />
                  Full-screen view
                </button>
              )}

              <button
                type="button"
                className="card-studio__print-link"
                onClick={() => setShowPrintOptions(true)}
              >
                Print or download PDF
              </button>

              <button type="button" onClick={onClose} className="btn-secondary w-full">
                Done
              </button>
            </aside>
          )}

          <div
            className={[
              'card-studio__stage',
              size === 'letter' ? 'card-studio__stage--letter' : '',
            ].join(' ')}
          >
            {!refining && ready && isPhoneLayout ? (
              <button
                type="button"
                className="card-studio__preview-tap no-print"
                onClick={() => setPhotoViewOpen(true)}
                aria-label="Open full-screen card preview"
              >
                <div
                  className={[
                    'card-studio__preview',
                    SIZE_PREVIEW_CLASS[size] || SIZE_PREVIEW_CLASS['4x6'],
                  ].join(' ')}
                >
                  <RecipeCardPrint {...cardPrintProps} />
                </div>
                <span className="card-studio__preview-tap-label">Tap to preview</span>
              </button>
            ) : (
              <div
                className={[
                  'card-studio__preview',
                  SIZE_PREVIEW_CLASS[size] || SIZE_PREVIEW_CLASS['4x6'],
                  refining ? 'card-studio__preview--refining' : '',
                ].join(' ')}
              >
                <RecipeCardPrint {...cardPrintProps} />
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
            )}

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
              {refining
                ? 'Checking pagination…'
                : isViewMode
                  ? 'Prop your phone on the counter — tap the card for full screen'
                  : previewHint}
              <span className="card-studio__hint-size">
                {SIZES.find((s) => s.id === size)?.printLabel}
              </span>
            </p>

            {!refining && ready && isPhoneLayout && (
              <button
                type="button"
                className="card-studio__photo-btn card-studio__photo-btn--mobile no-print"
                onClick={() => setPhotoViewOpen(true)}
              >
                <ImageIcon className="w-4 h-4" aria-hidden />
                Full-screen preview
              </button>
            )}
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
                    {...cardPrintProps}
                    pageIndex={i}
                    largeText={imageCapturing ? largeText : false}
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

      {showMobileCookDock && (
        <div className="card-studio__mobile-dock no-print">
          <button
            type="button"
            className={`card-studio__mobile-dock-btn ${largeText ? 'is-active' : ''}`}
            onClick={() => setLargeText((v) => !v)}
            aria-pressed={largeText}
          >
            <Type className="w-5 h-5" aria-hidden />
            Large text
          </button>
          <button
            type="button"
            className="card-studio__mobile-dock-btn card-studio__mobile-dock-btn--primary"
            disabled={exporting || printSheetOpen}
            onClick={() => runImageSave('current')}
          >
            <ImageDown className="w-5 h-5" aria-hidden />
            {exporting && imageCapturing ? 'Saving…' : saveImageShortLabel}
          </button>
          <button
            type="button"
            className="card-studio__mobile-dock-btn"
            onClick={() => setPhotoViewOpen(true)}
          >
            <ImageIcon className="w-5 h-5" aria-hidden />
            Full screen
          </button>
        </div>
      )}

      {photoViewOpen && ready && !refining && (
        <div
          className="card-studio__photo-overlay no-print"
          role="dialog"
          aria-modal="true"
          aria-label="Recipe card photo preview"
          onClick={isPhoneLayout ? undefined : () => setPhotoViewOpen(false)}
        >
          <header className="card-studio__photo-header">
            <p className="card-studio__photo-title">{recipe.title}</p>
            <button
              type="button"
              className="card-studio__photo-close"
              onClick={() => setPhotoViewOpen(false)}
              aria-label="Close photo preview"
            >
              <X className="w-5 h-5" />
            </button>
          </header>

          <div
            className="card-studio__photo-stage"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={[
                'card-studio__photo-preview',
                SIZE_PHOTO_CLASS[size] || SIZE_PHOTO_CLASS['4x6'],
              ].join(' ')}
            >
              <RecipeCardPrint {...cardPrintProps} />
            </div>
          </div>

          {ready && isMulti && (
            <div className="card-studio__photo-sides" onClick={(e) => e.stopPropagation()}>
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

          <footer
            className="card-studio__photo-toolbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-studio__photo-toolbar-row">
              <button
                type="button"
                className={`card-studio__photo-tool ${largeText ? 'is-active' : ''}`}
                onClick={() => setLargeText((v) => !v)}
                aria-pressed={largeText}
              >
                <Type className="w-5 h-5" aria-hidden />
                <span>Large text</span>
              </button>
              <button
                type="button"
                className="card-studio__photo-tool card-studio__photo-tool--primary"
                disabled={exporting || printSheetOpen}
                onClick={() => runImageSave('current')}
              >
                <ImageDown className="w-5 h-5" aria-hidden />
                <span>{exporting && imageCapturing ? 'Saving…' : saveImageShortLabel}</span>
              </button>
            </div>
            {!isPhoneLayout && (
              <p className="card-studio__photo-caption">
                {isViewMode
                  ? 'Save the card to your photos, or toggle large text for counter reading.'
                  : 'Turn your phone sideways for the largest view.'}
              </p>
            )}
          </footer>
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
