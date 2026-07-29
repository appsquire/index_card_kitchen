/**
 * One-shot DOM measure — auto layout.
 * Landscape: aligned split panes, then stacked remainder.
 * Letter: continuous stacked stream.
 * Binary-search packing keeps renders O(log n) per page.
 */
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import RecipeCardPrint from '../components/RecipeCardPrint'
import {
  MAX_CARD_PAGES,
  planRecipeCard,
  pageBodyLayout,
  singlePageMode,
} from '@shared/cardPlan.js'

let fontsPrimed = false

async function primeFonts() {
  if (fontsPrimed) return
  if (typeof document === 'undefined' || !document.fonts) {
    fontsPrimed = true
    return
  }

  try {
    // Actively pull the faces the card uses — CSS @import alone is too late
    // for the first measure pass (wrong metrics → sparse pages that "fix"
    // after a later remasure once fonts are in).
    await Promise.all([
      document.fonts.load('400 48px "Patrick Hand"'),
      document.fonts.load('400 22px "Patrick Hand"'),
      document.fonts.load('800 15px Nunito'),
      document.fonts.load('700 11px Nunito'),
      document.fonts.load('400 10.5px Nunito'),
    ])
    await Promise.race([
      document.fonts.ready,
      new Promise((r) => setTimeout(r, 1500)),
    ])
  } catch {
    /* ignore */
  }

  // Only skip future waits when the faces we need are actually usable.
  const ready =
    document.fonts.check('400 48px "Patrick Hand"') &&
    document.fonts.check('800 15px Nunito')
  if (ready) fontsPrimed = true
}

/** True when card display fonts are loaded enough to measure reliably. */
export function cardFontsReady() {
  if (typeof document === 'undefined' || !document.fonts) return true
  return (
    document.fonts.check('400 48px "Patrick Hand"') &&
    document.fonts.check('800 15px Nunito')
  )
}

function waitPaint() {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
}

function readOverflow(host, page, plan) {
  const body = host.querySelector('.recipe-index-card__body')
  if (!body) return true

  const layout = pageBodyLayout(page, plan)
  const bodyBottom = body.getBoundingClientRect().bottom
  // Small slack: subpixel / font rounding should not force an extra page.
  const clipped = (node) => Boolean(node && node.scrollHeight > node.clientHeight + 4)

  const pastBottom = (root) => {
    const nodes = root?.querySelectorAll('li, h2') || []
    if (!nodes.length) return false
    const last = nodes[nodes.length - 1]
    return last.getBoundingClientRect().bottom > bodyBottom + 4
  }

  if (layout === 'split') {
    const panes = body.querySelectorAll('.recipe-index-card__pane')
    if (panes.length >= 2) {
      return (
        clipped(panes[0]) ||
        clipped(panes[1]) ||
        pastBottom(panes[0]) ||
        pastBottom(panes[1]) ||
        clipped(body)
      )
    }
  }

  // Body only — frame scrollHeight is noisy with flex + footer.
  return clipped(body) || pastBottom(body)
}

function clonePage(page) {
  return {
    mode: page.mode || 'stacked',
    ingredients: [...(page.ingredients || [])],
    instructions: [...(page.instructions || [])],
  }
}

function buildPlan(pages) {
  const strategy =
    pages.length === 1 && pages[0]?.mode === 'split'
      ? 'split'
      : pages.some((p) => p.mode === 'split')
        ? 'split'
        : 'stacked'
  return { pages, strategy }
}

async function renderPage(host, root, recipe, opts, pages, pageIndex) {
  const plan = buildPlan(pages)
  flushSync(() => {
    root.render(
      createElement(RecipeCardPrint, {
        recipe,
        size: opts.size,
        style: opts.style,
        pageIndex,
        plan,
      })
    )
  })
  await waitPaint()
  return readOverflow(host, pages[pageIndex], plan)
}

function emptyPage(mode = 'stacked') {
  return { mode, ingredients: [], instructions: [] }
}

/** How many items from `items[start…]` fit on `basePage` (binary search). */
async function fitCount(host, root, recipe, opts, pages, pageIndex, basePage, items, start, kind) {
  if (start >= items.length) return 0

  let lo = 1
  let hi = items.length - start
  let best = 0

  while (lo <= hi) {
    const mid = Math.ceil((lo + hi) / 2)
    const trial = clonePage(basePage)
    const slice = items.slice(start, start + mid)
    if (kind === 'ing') trial.ingredients = [...basePage.ingredients, ...slice]
    else trial.instructions = [...basePage.instructions, ...slice]

    const trialPages = pages.map((p, i) => (i === pageIndex ? trial : clonePage(p)))
    const overflow = await renderPage(host, root, recipe, opts, trialPages, pageIndex)

    if (overflow) hi = mid - 1
    else {
      best = mid
      lo = mid + 1
    }
  }

  return best
}

async function packStackedRemainder(host, root, recipe, opts, ingredients, instructions, pages) {
  let ingStart = 0
  let dirStart = 0

  // Continue onto the last page when it has room (ings then dirs).
  const ensurePage = () => {
    if (!pages.length) pages.push(emptyPage('stacked'))
    return pages[pages.length - 1]
  }

  while (ingStart < ingredients.length && pages.length <= MAX_CARD_PAGES) {
    let page = ensurePage()
    if (page.mode === 'split' || (page.ingredients.length === 0 && page.instructions.length > 0)) {
      page = emptyPage('stacked')
      pages.push(page)
    }
    const pageIndex = pages.indexOf(page)
    const base = clonePage(page)
    const count = await fitCount(
      host,
      root,
      recipe,
      opts,
      pages,
      pageIndex,
      base,
      ingredients,
      ingStart,
      'ing'
    )

    if (count === 0) {
      page.ingredients.push(ingredients[ingStart])
      ingStart += 1
      if (ingStart < ingredients.length || dirStart < instructions.length) {
        pages.push(emptyPage('stacked'))
      }
      continue
    }

    page.ingredients.push(...ingredients.slice(ingStart, ingStart + count))
    ingStart += count
    if (ingStart < ingredients.length) pages.push(emptyPage('stacked'))
  }

  while (dirStart < instructions.length && pages.length <= MAX_CARD_PAGES) {
    let page = ensurePage()
    // Prefer filling the last ings-only stacked page before opening a new one.
    if (page.mode === 'split') {
      page = emptyPage('stacked')
      pages.push(page)
    }
    const pageIndex = pages.indexOf(page)
    const base = clonePage(page)
    const count = await fitCount(
      host,
      root,
      recipe,
      opts,
      pages,
      pageIndex,
      base,
      instructions,
      dirStart,
      'dir'
    )

    if (count === 0) {
      page.instructions.push(instructions[dirStart])
      dirStart += 1
      if (dirStart < instructions.length) pages.push(emptyPage('stacked'))
      continue
    }

    page.instructions.push(...instructions.slice(dirStart, dirStart + count))
    dirStart += count
    if (dirStart < instructions.length) pages.push(emptyPage('stacked'))
  }

  return pages.filter((p) => p.ingredients.length || p.instructions.length)
}

/**
 * Fill both panes on each landscape page while both sections remain.
 * Uses mode:'split' with a placeholder sibling so pane width is correct
 * while measuring one side.
 */
async function packAlignedSplit(host, root, recipe, opts, ingredients, instructions) {
  const pages = []
  let ingStart = 0
  let dirStart = 0

  while (
    (ingStart < ingredients.length || dirStart < instructions.length) &&
    pages.length < MAX_CARD_PAGES
  ) {
    const remainingIngs = ingredients.length - ingStart

    if (ingStart >= ingredients.length || dirStart >= instructions.length || remainingIngs <= 2) {
      return packStackedRemainder(
        host,
        root,
        recipe,
        opts,
        ingredients.slice(ingStart),
        instructions.slice(dirStart),
        pages
      )
    }

    const page = emptyPage('split')
    pages.push(page)
    const pageIndex = pages.length - 1

    // Measure left pane at split width: keep a dirs placeholder so layout
    // stays split, then replace with the real dirs fit.
    page.instructions = [instructions[dirStart]]
    const ingBase = { mode: 'split', ingredients: [], instructions: page.instructions }
    let ingCount = await fitCount(
      host,
      root,
      recipe,
      opts,
      pages,
      pageIndex,
      ingBase,
      ingredients,
      ingStart,
      'ing'
    )
    if (ingCount === 0) {
      page.ingredients = [ingredients[ingStart]]
      ingCount = 1
    } else {
      page.ingredients = ingredients.slice(ingStart, ingStart + ingCount)
    }
    ingStart += ingCount

    const dirBase = { mode: 'split', ingredients: [...page.ingredients], instructions: [] }
    let dirCount = await fitCount(
      host,
      root,
      recipe,
      opts,
      pages,
      pageIndex,
      dirBase,
      instructions,
      dirStart,
      'dir'
    )
    if (dirCount === 0) {
      page.instructions = [instructions[dirStart]]
      dirCount = 1
    } else {
      page.instructions = instructions.slice(dirStart, dirStart + dirCount)
    }
    dirStart += dirCount

    if (!page.ingredients.length || !page.instructions.length) {
      page.mode = 'stacked'
    }
  }

  return pages.filter((p) => p.ingredients.length || p.instructions.length)
}

export async function measureAndPackPlan(recipe, { size = '4x6', style = 'enamel' } = {}) {
  const ingredients = (recipe.ingredients || []).filter((i) => i?.name?.trim())
  const instructions = (recipe.instructions || []).filter((i) => i?.step?.trim())

  if (typeof document === 'undefined') {
    return planRecipeCard(recipe, { size })
  }

  await primeFonts()

  const host = document.createElement('div')
  host.style.cssText =
    'position:fixed;left:-12000px;top:0;opacity:0;pointer-events:none;z-index:-1;width:auto;'
  document.body.appendChild(host)
  const root = createRoot(host)
  const opts = { size, style }

  try {
    const singlePage = {
      mode: singlePageMode(size),
      ingredients: [...ingredients],
      instructions: [...instructions],
    }

    const singleOverflow = await renderPage(host, root, recipe, opts, [singlePage], 0)

    if (!singleOverflow) {
      return { pages: [clonePage(singlePage)], strategy: singlePage.mode, measured: true }
    }

    let pages
    if (size === 'letter') {
      pages = await packStackedRemainder(host, root, recipe, opts, ingredients, instructions, [])
    } else {
      pages = await packAlignedSplit(host, root, recipe, opts, ingredients, instructions)
    }

    if (!pages.length) pages = [emptyPage()]

    const strategy = pages.some((p) => p.mode === 'split') ? 'split' : 'stacked'
    return { pages: pages.slice(0, MAX_CARD_PAGES), strategy, measured: true }
  } catch (err) {
    console.warn('Card measure-pack failed, using heuristic plan', err)
    return { ...planRecipeCard(recipe, { size }), measured: false }
  } finally {
    try {
      root.unmount()
    } catch {
      /* ignore */
    }
    host.remove()
  }
}
