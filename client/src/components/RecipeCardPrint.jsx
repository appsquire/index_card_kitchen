import { useMemo } from 'react'

/** Landscape recipe-box cards; letter stays portrait full page */
const SIZE_STYLES = {
  '4x6': { width: '6in', height: '4in' },
  '5x7': { width: '7in', height: '5in' },
  letter: { width: '8.5in', height: '11in' },
}

const STYLE_CLASS = {
  lined: 'recipe-index-card--lined',
  butter: 'recipe-index-card--butter',
  enamel: 'recipe-index-card--enamel',
}

const SIZE_CLASS = {
  '4x6': 'recipe-index-card--4x6',
  '5x7': 'recipe-index-card--5x7',
  letter: 'recipe-index-card--letter',
}

const LAYOUT_CLASS = {
  stacked: 'recipe-index-card--stacked',
  split: 'recipe-index-card--split',
}

const BODY_LAYOUT_CLASS = {
  stacked: 'recipe-index-card__body--stacked',
  split: 'recipe-index-card__body--split',
}

const FRACTIONS = [
  [1 / 8, '⅛'],
  [1 / 6, '⅙'],
  [1 / 5, '⅕'],
  [1 / 4, '¼'],
  [1 / 3, '⅓'],
  [3 / 8, '⅜'],
  [1 / 2, '½'],
  [5 / 8, '⅝'],
  [2 / 3, '⅔'],
  [3 / 4, '¾'],
  [5 / 6, '⅚'],
  [7 / 8, '⅞'],
]

export const MAX_CARD_PAGES = 8

/** Turn scraped floats like 0.666666686534888 into “⅔”. */
export function formatQuantity(value) {
  if (value == null || value === '') return ''
  if (typeof value === 'string' && !/^-?\d*\.?\d+$/.test(value.trim())) {
    return value.trim()
  }

  const num = typeof value === 'number' ? value : parseFloat(value)
  if (!Number.isFinite(num)) return String(value)
  if (Math.abs(num) < 0.001) return ''

  const sign = num < 0 ? '-' : ''
  const abs = Math.abs(num)
  const whole = Math.floor(abs + 1e-9)
  let frac = abs - whole

  if (frac < 0.02) {
    return `${sign}${whole}`
  }
  if (frac > 0.98) {
    return `${sign}${whole + 1}`
  }

  let best = null
  let bestDiff = Infinity
  for (const [f, glyph] of FRACTIONS) {
    const diff = Math.abs(frac - f)
    if (diff < bestDiff) {
      bestDiff = diff
      best = glyph
    }
  }

  if (best && bestDiff <= 0.04) {
    return whole > 0 ? `${sign}${whole}${best}` : `${sign}${best}`
  }

  const rounded = Math.round(abs * 100) / 100
  return `${sign}${Number.isInteger(rounded) ? rounded : String(rounded)}`
}

export function formatAmount(ing) {
  const qty = formatQuantity(ing?.amount)
  return [qty, ing?.unit].filter(Boolean).join(' ')
}

function safeHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function formatMinutes(n) {
  if (!n) return null
  return n >= 60 ? `${Math.floor(n / 60)}H${n % 60 ? ` ${n % 60}M` : ''}` : `${n}M`
}

/** Studio chip label: Front/Back when N=2; Page N when N≥3. */
export function getPageChipLabel(pageIndex, totalPages) {
  if (totalPages === 2) return pageIndex === 0 ? 'Front' : 'Back'
  return `Page ${pageIndex + 1}`
}

/** Printed/PDF footer tag; null when single page. */
export function getPageFooterTag(pageIndex, totalPages) {
  if (totalPages <= 1) return null
  if (totalPages === 2) return `Side ${pageIndex + 1} of 2`
  return `Page ${pageIndex + 1} of ${totalPages}`
}

/** How many card faces fit on one letter sheet. */
export function facesPerLetterSheet(size) {
  if (size === '4x6' || size === '5x7') return 2
  return 1
}

/** Pack 0..pageCount-1 indexes into letter-sheet groups. */
export function packPageIndexes(pageCount, size) {
  const per = facesPerLetterSheet(size)
  const sheets = []
  for (let i = 0; i < pageCount; i += per) {
    const faceIndexes = []
    for (let j = i; j < Math.min(i + per, pageCount); j++) faceIndexes.push(j)
    sheets.push(faceIndexes)
  }
  return sheets
}

function annotatePageNotes(pages) {
  // Footer page tag is enough — no in-card “…continued” banners.
  return pages.map((page) => ({ ...page, note: null }))
}

function trimEmptyPages(pages) {
  const mapped = pages.map((p) => ({
    ingredients: [...(p.ingredients || [])],
    instructions: [...(p.instructions || [])],
    note: null,
  }))
  const nonempty = mapped.filter(
    (p) => p.ingredients.length > 0 || p.instructions.length > 0
  )
  return nonempty.length > 0
    ? nonempty
    : [{ ingredients: [], instructions: [], note: null }]
}

/** Conservative per-face budgets — prefer an extra page over clipping. */
function pageLimits(size) {
  if (size === 'letter') {
    return { stackedIng: 18, stackedStep: 10, splitIng: 28, splitStep: 14 }
  }
  if (size === '5x7') {
    return { stackedIng: 8, stackedStep: 5, splitIng: 12, splitStep: 6 }
  }
  // 4x6 — tight on purpose
  return { stackedIng: 5, stackedStep: 3, splitIng: 8, splitStep: 3 }
}

/**
 * Pack ingredients then directions onto pages (stream order).
 * Directions start only after all ingredients are placed.
 */
function packStreamPages(ingredients, instructions, { ingCap, stepCap }) {
  const pages = []
  let ingRemaining = [...ingredients]
  let stepRemaining = [...instructions]

  if (ingRemaining.length === 0 && stepRemaining.length === 0) {
    return [{ ingredients: [], instructions: [] }]
  }

  while (
    (ingRemaining.length > 0 || stepRemaining.length > 0) &&
    pages.length < MAX_CARD_PAGES
  ) {
    const pageIng = ingRemaining.splice(0, ingCap)
    let pageSteps = []
    if (ingRemaining.length === 0) {
      pageSteps = stepRemaining.splice(0, stepCap)
    }
    if (pageIng.length === 0 && pageSteps.length === 0) break
    pages.push({ ingredients: pageIng, instructions: pageSteps })
  }

  if (ingRemaining.length || stepRemaining.length) {
    if (pages.length === 0) {
      pages.push({ ingredients: [], instructions: [] })
    }
    const last = pages[pages.length - 1]
    last.ingredients.push(...ingRemaining)
    last.instructions.push(...stepRemaining)
  }

  return pages
}

/**
 * Multi-page plan. Seeds with size-based budgets (reliable), then Card Studio
 * measure-and-spill can still move items if a face clips.
 */
export function planRecipeCard(recipe, { size = '4x6', layout = 'split' } = {}) {
  const ingredients = recipe.ingredients?.filter((i) => i?.name?.trim()) || []
  const instructions = recipe.instructions?.filter((i) => i?.step?.trim()) || []
  const strategy = layout === 'stacked' ? 'stacked' : 'split'
  const limits = pageLimits(size)

  const pages = packStreamPages(ingredients, instructions, {
    ingCap: strategy === 'split' ? limits.splitIng : limits.stackedIng,
    stepCap: strategy === 'split' ? limits.splitStep : limits.stackedStep,
  })

  return {
    pages: annotatePageNotes(
      trimEmptyPages(pages.length ? pages : [{ ingredients: [], instructions: [] }])
    ),
    strategy,
  }
}

/**
 * Move one trailing item from an overflowing page onto the next page.
 * Returns a new plan, or the same plan if nothing moved.
 */
export function spillOneOverflowItem(plan, pageIndex, { preferColumn } = {}) {
  const pages = trimEmptyPages(plan.pages)
  if (pageIndex < 0 || pageIndex >= pages.length) return plan
  if (pages.length >= MAX_CARD_PAGES && pageIndex === pages.length - 1) return plan

  const page = {
    ingredients: [...(pages[pageIndex].ingredients || [])],
    instructions: [...(pages[pageIndex].instructions || [])],
  }

  let movedIng = null
  let movedStep = null

  const spillIng = () => {
    if (page.ingredients.length === 0) return false
    movedIng = page.ingredients.pop()
    return true
  }
  const spillStep = () => {
    if (page.instructions.length === 0) return false
    movedStep = page.instructions.pop()
    return true
  }

  if (preferColumn === 'ingredients') {
    if (!spillIng() && !spillStep()) return plan
  } else if (preferColumn === 'instructions') {
    if (!spillStep() && !spillIng()) return plan
  } else {
    // Stream layouts (stacked + newspaper split): spill from end — steps then ings
    if (page.instructions.length > 0) {
      if (!spillStep()) return plan
    } else if (!spillIng()) {
      return plan
    }
  }

  const nextPages = pages.map((p, i) =>
    i === pageIndex
      ? page
      : {
          ingredients: [...(p.ingredients || [])],
          instructions: [...(p.instructions || [])],
        }
  )

  if (!nextPages[pageIndex + 1]) {
    if (nextPages.length >= MAX_CARD_PAGES) {
      // Put item back — cannot create another page
      if (movedStep) page.instructions.push(movedStep)
      if (movedIng) page.ingredients.push(movedIng)
      return plan
    }
    nextPages.push({ ingredients: [], instructions: [] })
  }

  if (movedStep) nextPages[pageIndex + 1].instructions.unshift(movedStep)
  if (movedIng) nextPages[pageIndex + 1].ingredients.unshift(movedIng)

  return {
    strategy: plan.strategy,
    pages: annotatePageNotes(trimEmptyPages(nextPages)),
  }
}

/** Detect whether a rendered card face is clipping content. */
export function detectCardOverflow(cardEl) {
  if (!cardEl) return null
  const card = cardEl.matches?.('.recipe-index-card')
    ? cardEl
    : cardEl.querySelector('.recipe-index-card')
  if (!card) return null

  const frame = card.querySelector('.recipe-index-card__frame')
  const body = frame?.querySelector('.recipe-index-card__body')
  if (!frame || !body) return null

  const bodyH = body.clientHeight
  if (bodyH < 16) {
    return { notReady: true, frameOverflow: true, bodyOverflow: true, preferColumn: null }
  }

  // Geometry check (works under CSS transform:scale on the preview).
  // If any list item extends past the body box, content is clipped.
  const bodyRect = body.getBoundingClientRect()
  if (bodyRect.height < 8) {
    return { notReady: true, frameOverflow: true, bodyOverflow: true, preferColumn: null }
  }

  const slack = 3
  const items = body.querySelectorAll('li')
  for (const el of items) {
    const r = el.getBoundingClientRect()
    if (r.height < 1) continue
    if (r.bottom > bodyRect.bottom + slack) {
      return {
        frameOverflow: true,
        bodyOverflow: true,
        preferColumn: null,
      }
    }
  }

  // Also catch section headings / leftover content with no list items yet
  const blocks = body.querySelectorAll('.recipe-index-card__block')
  for (const el of blocks) {
    const r = el.getBoundingClientRect()
    if (r.height < 1) continue
    if (r.bottom > bodyRect.bottom + slack) {
      return {
        frameOverflow: true,
        bodyOverflow: true,
        preferColumn: null,
      }
    }
  }

  return null
}

export default function RecipeCardPrint({
  recipe,
  size = '4x6',
  style = 'lined',
  layout = 'split',
  pageIndex = 0,
  className = '',
  plan: planProp,
}) {
  const dims = SIZE_STYLES[size] || SIZE_STYLES['4x6']
  const source = recipe.sourceUrl ? safeHostname(recipe.sourceUrl) : null

  const plan = useMemo(
    () => planProp || planRecipeCard(recipe, { size, layout }),
    [planProp, recipe, size, layout]
  )

  const totalPages = plan.pages?.length || 1
  const safeIndex = Math.min(Math.max(0, pageIndex), totalPages - 1)
  const page = plan.pages[safeIndex] || { ingredients: [], instructions: [] }
  const shownIngredients = page.ingredients || []
  const shownInstructions = page.instructions || []
  const isContinuation = safeIndex > 0

  const stepOffset = (plan.pages || [])
    .slice(0, safeIndex)
    .reduce((n, p) => n + (p.instructions?.length || 0), 0)

  const bodyLayout =
    plan.strategy === 'stacked' || layout === 'stacked' ? 'stacked' : 'split'

  const metaBits = [
    recipe.servings ? `Serves: ${recipe.servings}` : null,
    recipe.prepTime ? `Prep time: ${formatMinutes(recipe.prepTime)}` : null,
    recipe.cookTime ? `Cook time: ${formatMinutes(recipe.cookTime)}` : null,
  ].filter(Boolean)

  const title = (recipe.title || 'Untitled recipe').toUpperCase()
  const footerTag = getPageFooterTag(safeIndex, totalPages)

  const ingHeading =
    isContinuation && shownInstructions.length > 0 && shownIngredients.length > 0
      ? 'More ingredients'
      : 'Ingredients'

  return (
    <article
      className={[
        'recipe-index-card',
        STYLE_CLASS[style] || STYLE_CLASS.lined,
        SIZE_CLASS[size] || SIZE_CLASS['4x6'],
        LAYOUT_CLASS[bodyLayout] || LAYOUT_CLASS.split,
        isContinuation ? 'recipe-index-card--back' : 'recipe-index-card--front',
        className,
      ].join(' ')}
      style={{ width: dims.width, height: dims.height }}
      data-page-index={safeIndex}
    >
      <div className="recipe-index-card__frame">
        <header className="recipe-index-card__header">
          <p className="recipe-index-card__wordmark">Recipe</p>
          <div className="recipe-index-card__heading">
            <h1 className="recipe-index-card__title">{title}</h1>
            {metaBits.length > 0 && (
              <p className="recipe-index-card__meta">
                {metaBits.map((bit, i) => (
                  <span key={bit}>
                    {i > 0 && (
                      <span className="recipe-index-card__meta-sep" aria-hidden>
                        |
                      </span>
                    )}
                    {bit}
                  </span>
                ))}
              </p>
            )}
          </div>
        </header>

        <div
          className={`recipe-index-card__body ${
            BODY_LAYOUT_CLASS[bodyLayout] || BODY_LAYOUT_CLASS.split
          }`}
        >
          {shownIngredients.length > 0 && (
            <section className="recipe-index-card__block recipe-index-card__block--ingredients">
              <h2>{ingHeading}</h2>
              <ul>
                {shownIngredients.map((ing, idx) => {
                  const amount = formatAmount(ing)
                  return (
                    <li
                      key={idx}
                      className={amount ? undefined : 'recipe-index-card__ing--full'}
                    >
                      {amount ? (
                        <span className="recipe-index-card__amt">{amount}</span>
                      ) : null}
                      <span className="recipe-index-card__iname">{ing.name}</span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {shownInstructions.length > 0 && (
            <section className="recipe-index-card__block recipe-index-card__block--directions">
              <h2>Directions</h2>
              <ol>
                {shownInstructions.map((inst, idx) => {
                  const n = stepOffset + idx + 1
                  return (
                    <li key={idx}>
                      <span className="recipe-index-card__num">{n}</span>
                      <span className="recipe-index-card__step">{inst.step}</span>
                    </li>
                  )
                })}
              </ol>
            </section>
          )}
        </div>

        <footer className="recipe-index-card__footer">
          <span>
            {source
              ? `From the kitchen · ${source}`
              : 'From the kitchen · Index Card Kitchen'}
          </span>
          {footerTag && (
            <span className="recipe-index-card__side-tag">{footerTag}</span>
          )}
        </footer>
      </div>
    </article>
  )
}

export { SIZE_STYLES }
