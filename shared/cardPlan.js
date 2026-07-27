/**
 * Classic recipe-card planner (auto layout).
 *
 * One card: ingredients | directions side-by-side when everything fits.
 * Overflow: ingredients through, then directions — full-width pages only.
 * Server uses line estimates; client refines with DOM measure.
 */

export const MAX_CARD_PAGES = 8

export const SIZE_STYLES = {
  '4x6': { width: '6in', height: '4in' },
  '5x7': { width: '7in', height: '5in' },
  letter: { width: '8.5in', height: '11in' },
}

function lineBudget(size) {
  if (size === 'letter') return 44
  if (size === '5x7') return 15
  return 11
}

function splitPaneBudget(size) {
  if (size === 'letter') return 36
  if (size === '5x7') return 13
  return 9
}

function charsPerLine(size, kind) {
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

function estimateIngLines(ing, size) {
  return Math.max(1, Math.ceil(ingredientText(ing).length / charsPerLine(size, 'ing')))
}

function estimateStepLines(inst, size) {
  const text = inst?.step ? String(inst.step) : ''
  return Math.max(1, Math.ceil(text.length / charsPerLine(size, 'step')))
}

const HEADING = 2

function totalIngLines(ings, size) {
  if (!ings.length) return 0
  return HEADING + ings.reduce((n, i) => n + estimateIngLines(i, size), 0)
}

function totalStepLines(steps, size) {
  if (!steps.length) return 0
  return HEADING + steps.reduce((n, s) => n + estimateStepLines(s, size), 0)
}

function fitsSinglePage(ings, steps, size) {
  if (size === 'letter') {
    const blocks = (ings.length ? 1 : 0) + (steps.length ? 1 : 0)
    const total =
      totalIngLines(ings, size) + totalStepLines(steps, size) + HEADING * Math.max(blocks, 1)
    return total <= lineBudget(size)
  }
  const pane = splitPaneBudget(size)
  return totalIngLines(ings, size) <= pane && totalStepLines(steps, size) <= pane
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

function packSection(items, estimate, size, budget, kind) {
  const pages = []
  let batch = []
  let used = 0

  const flush = () => {
    if (!batch.length) return
    const page = { mode: 'stacked', ingredients: [], instructions: [] }
    if (kind === 'ing') page.ingredients = [...batch]
    else page.instructions = [...batch]
    pages.push(page)
    batch = []
    used = 0
  }

  for (const item of items) {
    const cost = estimate(item, size) + (batch.length === 0 ? HEADING : 0)
    if (batch.length > 0 && used + cost > budget) flush()
    if (batch.length === 0 && cost > budget) {
      const page = { mode: 'stacked', ingredients: [], instructions: [] }
      if (kind === 'ing') page.ingredients = [item]
      else page.instructions = [item]
      pages.push(page)
      continue
    }
    batch.push(item)
    used += cost
  }
  flush()
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
      (kind === 'ing' ? estimateIngLines(item, size) : estimateStepLines(item, size)) +
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

  const ingPages = packSection(ingredients, estimateIngLines, size, lineBudget(size), 'ing')
  const dirPages = packSection(instructions, estimateStepLines, size, lineBudget(size), 'dir')

  if (ingPages.length && dirPages.length) {
    const lastIng = ingPages[ingPages.length - 1]
    const firstDir = dirPages[0]
    const combined =
      totalIngLines(lastIng.ingredients, size) + totalStepLines(firstDir.instructions, size)
    if (combined <= lineBudget(size)) {
      lastIng.instructions = [...firstDir.instructions]
      dirPages.shift()
    }
  }

  const pages = [...ingPages, ...dirPages].slice(0, MAX_CARD_PAGES)
  if (pages.length === 0) {
    pages.push({ mode: 'stacked', ingredients: [], instructions: [] })
  }

  return { pages, strategy: 'stacked' }
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

  const first = pages.findIndex((p) => ((p[field] || []).length > 0))
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

/** Side-by-side only when both sections are on this page. */
export function pageBodyLayout(page, plan) {
  const ings = page?.ingredients?.length > 0
  const dirs = page?.instructions?.length > 0
  if (ings && dirs && page.mode === 'split') return 'split'
  return 'stacked'
}
