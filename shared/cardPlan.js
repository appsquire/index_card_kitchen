/**
 * Classic recipe-card planner (auto layout).
 *
 * One card: ingredients | directions side-by-side when everything fits.
 * Landscape overflow: fill both panes on each page (aligned split), then
 * full-width stacked for whichever section remains.
 * Letter overflow: continuous stacked stream (ings then dirs).
 * Server uses line estimates; client refines with DOM measure.
 */

export const MAX_CARD_PAGES = 8

export const SIZE_STYLES = {
  '4x6': { width: '6in', height: '4in' },
  '5x7': { width: '7in', height: '5in' },
  letter: { width: '8.5in', height: '11in' },
}

function lineBudget(size) {
  // Stacked full-width body. Prefer slight underfill over clipping.
  if (size === 'letter') return 50
  if (size === '5x7') return 17
  return 12
}

function splitPaneBudget(size) {
  // Half-width pane on landscape split pages.
  if (size === 'letter') return 40
  if (size === '5x7') return 14
  return 10
}

function charsPerLine(size, kind) {
  // Split panes are narrower than stacked full-width.
  if (size === 'letter') return kind === 'ing' ? 56 : 58
  if (size === '5x7') return kind === 'ing' ? 32 : 34
  return kind === 'ing' ? 28 : 30
}

function stackedCharsPerLine(size, kind) {
  if (size === 'letter') return kind === 'ing' ? 56 : 58
  if (size === '5x7') return kind === 'ing' ? 44 : 48
  return kind === 'ing' ? 38 : 42
}

function ingredientText(ing) {
  const qty = ing?.amount != null && String(ing.amount).trim() !== '' ? String(ing.amount).trim() : ''
  const unit = ing?.unit ? String(ing.unit).trim() : ''
  const name = ing?.name ? String(ing.name).trim() : ''
  if (qty) return [qty, unit, name].filter(Boolean).join(' ')
  return [unit, name].filter(Boolean).join(' ')
}

function estimateIngLines(ing, size, width = 'pane') {
  const cpl = width === 'stacked' ? stackedCharsPerLine(size, 'ing') : charsPerLine(size, 'ing')
  return Math.max(1, Math.ceil(ingredientText(ing).length / cpl))
}

function estimateStepLines(inst, size, width = 'pane') {
  const text = inst?.step ? String(inst.step) : ''
  const cpl = width === 'stacked' ? stackedCharsPerLine(size, 'step') : charsPerLine(size, 'step')
  return Math.max(1, Math.ceil(text.length / cpl))
}

const HEADING = 2

function totalIngLines(ings, size, width = 'pane') {
  if (!ings.length) return 0
  return HEADING + ings.reduce((n, i) => n + estimateIngLines(i, size, width), 0)
}

function totalStepLines(steps, size, width = 'pane') {
  if (!steps.length) return 0
  return HEADING + steps.reduce((n, s) => n + estimateStepLines(s, size, width), 0)
}

function fitsSinglePage(ings, steps, size) {
  if (size === 'letter') {
    const gap = ings.length && steps.length ? 1 : 0
    return totalIngLines(ings, size, 'stacked') + totalStepLines(steps, size, 'stacked') + gap <=
      lineBudget(size)
  }
  const pane = splitPaneBudget(size)
  return totalIngLines(ings, size, 'pane') <= pane && totalStepLines(steps, size, 'pane') <= pane
}

/** Landscape cards: side-by-side. Full page: vertical (portrait sheet). */
export function singlePageMode(size) {
  return size === 'letter' ? 'stacked' : 'split'
}

function clonePage(page) {
  return {
    mode: page.mode || 'stacked',
    ingredients: [...(page.ingredients || [])],
    instructions: [...(page.instructions || [])],
  }
}

/** Greedy fill from `start` until pane/stacked budget is used. */
function takeItems(items, start, estimate, size, budget, width) {
  const batch = []
  let used = 0
  let idx = start

  while (idx < items.length) {
    const cost = estimate(items[idx], size, width) + (batch.length === 0 ? HEADING : 0)
    if (batch.length > 0 && used + cost > budget) break
    if (batch.length === 0 && cost > budget) {
      batch.push(items[idx])
      idx += 1
      break
    }
    batch.push(items[idx])
    used += cost
    idx += 1
  }

  return { batch, next: idx }
}

/**
 * Landscape overflow: each page fills Ingredients | Directions until one
 * list is exhausted, then remaining items use full-width stacked pages.
 */
function packAlignedSplit(ings, steps, size) {
  const pane = splitPaneBudget(size)
  const pages = []
  let i = 0
  let d = 0

  while ((i < ings.length || d < steps.length) && pages.length < MAX_CARD_PAGES) {
    const remainingIngs = ings.length - i
    const remainingDirs = steps.length - d

    // Prefer full-width stacked when one side would leave a near-empty pane.
    if (i < ings.length && d < steps.length && remainingIngs > 2 && remainingDirs > 0) {
      const ingTake = takeItems(ings, i, estimateIngLines, size, pane, 'pane')
      const dirTake = takeItems(steps, d, estimateStepLines, size, pane, 'pane')
      pages.push({
        mode: 'split',
        ingredients: ingTake.batch,
        instructions: dirTake.batch,
      })
      i = ingTake.next
      d = dirTake.next
      continue
    }

    const rest = packStackedStream(ings.slice(i), steps.slice(d), size)
    for (const page of rest) {
      if (pages.length >= MAX_CARD_PAGES) break
      pages.push(page)
    }
    break
  }

  return pages
}

function packStackedStream(ings, steps, size) {
  const budget = lineBudget(size)
  const pages = []
  let page = { mode: 'stacked', ingredients: [], instructions: [] }
  let used = 0

  const newPage = () => {
    if (page.ingredients.length || page.instructions.length) pages.push(clonePage(page))
    page = { mode: 'stacked', ingredients: [], instructions: [] }
    used = 0
  }

  const add = (item, kind) => {
    const cost =
      (kind === 'ing'
        ? estimateIngLines(item, size, 'stacked')
        : estimateStepLines(item, size, 'stacked')) +
      (page.ingredients.length === 0 && page.instructions.length === 0 ? HEADING : 0) +
      (kind === 'dir' && page.ingredients.length > 0 && page.instructions.length === 0 ? HEADING : 0)

    if (used + cost > budget && (page.ingredients.length || page.instructions.length)) {
      newPage()
    }

    if (kind === 'ing') page.ingredients.push(item)
    else page.instructions.push(item)
    used += cost
  }

  for (const ing of ings) add(ing, 'ing')
  for (const step of steps) add(step, 'dir')

  if (page.ingredients.length || page.instructions.length) pages.push(clonePage(page))
  return pages
}

/** Auto layout — layout option ignored (kept for API compat). */
export function planRecipeCard(recipe, { size = '4x6' } = {}) {
  const ingredients = (recipe.ingredients || []).filter((i) => i?.name?.trim())
  const instructions = (recipe.instructions || []).filter((i) => i?.step?.trim())

  if (!ingredients.length && !instructions.length) {
    return { pages: [{ mode: 'stacked', ingredients: [], instructions: [] }], strategy: 'stacked' }
  }

  if (fitsSinglePage(ingredients, instructions, size)) {
    const mode = singlePageMode(size)
    return {
      pages: [{ mode, ingredients: [...ingredients], instructions: [...instructions] }],
      strategy: mode,
    }
  }

  const pages =
    size === 'letter'
      ? packStackedStream(ingredients, instructions, size)
      : packAlignedSplit(ingredients, instructions, size)

  const clipped = pages.slice(0, MAX_CARD_PAGES)
  if (clipped.length === 0) {
    clipped.push({ mode: 'stacked', ingredients: [], instructions: [] })
  }

  return {
    pages: clipped,
    strategy: size === 'letter' ? 'stacked' : 'split',
  }
}

export function getPageChipLabel(pageIndex, totalPages) {
  if (totalPages === 2) return pageIndex === 0 ? 'Front' : 'Back'
  return `Page ${pageIndex + 1}`
}

export function getPageFooterTag(pageIndex, totalPages) {
  if (totalPages <= 1) return null
  if (totalPages === 2) return `Side ${pageIndex + 1} of 2`
  return `Page ${pageIndex + 1} of ${totalPages}`
}

/** Show Ingredients/Directions label only on the first card that contains that section. */
export function sectionHeadingOnPage(plan, pageIndex, section) {
  const pages = plan?.pages || []
  const page = pages[pageIndex]
  if (!page) return false

  const field = section === 'ingredients' ? 'ingredients' : 'instructions'
  const items = page[field] || []
  if (!items.length) return false

  const first = pages.findIndex((p) => (p[field] || []).length > 0)
  return first === pageIndex
}

export function facesPerLetterSheet(size) {
  if (size === '4x6' || size === '5x7') return 2
  return 1
}

export function packPageIndexes(pageCount, size) {
  const per = facesPerLetterSheet(size)
  const sheets = []
  for (let i = 0; i < pageCount; i += per) {
    const faceIndexes = []
    for (let j = i; j < Math.min(i + per, pageCount); j += 1) {
      faceIndexes.push(j)
    }
    sheets.push(faceIndexes)
  }
  return sheets
}

/** Side-by-side when this page is in split mode and has both sections. */
export function pageBodyLayout(page, plan) {
  const ings = page?.ingredients?.length > 0
  const dirs = page?.instructions?.length > 0
  if (ings && dirs && page.mode === 'split') return 'split'
  return 'stacked'
}
