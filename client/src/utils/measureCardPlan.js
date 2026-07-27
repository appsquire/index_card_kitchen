/**
 * One-shot DOM measure — auto layout.
 * Binary-search packing keeps renders O(log n) per page instead of one per item.
 */
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
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
  try {
    await Promise.race([
      document.fonts?.ready ?? Promise.resolve(),
      new Promise((r) => setTimeout(r, 300)),
    ])
  } catch {
    /* ignore */
  }
  fontsPrimed = true
}

function waitFrame() {
  return new Promise((r) => requestAnimationFrame(r))
}

function readOverflow(host, page, plan) {
  const body = host.querySelector('.recipe-index-card__body')
  const frame = host.querySelector('.recipe-index-card__frame')
  if (!body) return true

  const layout = pageBodyLayout(page, plan)
  const bodyBottom = body.getBoundingClientRect().bottom
  const clipped = (node) => Boolean(node && node.scrollHeight > node.clientHeight + 2)

  const pastBottom = (root) => {
    const nodes = root?.querySelectorAll('li, h2') || []
    if (!nodes.length) return false
    const last = nodes[nodes.length - 1]
    return last.getBoundingClientRect().bottom > bodyBottom + 2
  }

  if (layout === 'split') {
    const panes = body.querySelectorAll('.recipe-index-card__pane')
    if (panes.length >= 2) {
      return (
        clipped(panes[0]) ||
        clipped(panes[1]) ||
        pastBottom(panes[0]) ||
        pastBottom(panes[1]) ||
        clipped(body) ||
        clipped(frame)
      )
    }
  }

  return clipped(body) || clipped(frame) || pastBottom(body)
}

function clonePage(page) {
  return {
    mode: page.mode || 'stacked',
    ingredients: [...(page.ingredients || [])],
    instructions: [...(page.instructions || [])],
  }
}

function buildPlan(pages) {
  return {
    pages,
    strategy: pages.length === 1 && pages[0]?.mode === 'split' ? 'split' : 'stacked',
  }
}

async function renderPage(host, root, recipe, opts, pages, pageIndex) {
  const plan = buildPlan(pages)
  root.render(
    createElement(RecipeCardPrint, {
      recipe,
      size: opts.size,
      style: opts.style,
      pageIndex,
      plan,
    })
  )
  await waitFrame()
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
    if (kind === 'ing') trial.ingredients.push(...slice)
    else trial.instructions.push(...slice)

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

async function packItems(host, root, recipe, opts, items, kind, pages) {
  let page
  const last = pages[pages.length - 1]

  if (kind === 'dir' && last?.instructions?.length === 0 && last?.ingredients?.length > 0) {
    page = last
  } else {
    page = emptyPage('stacked')
    pages.push(page)
  }

  let start = 0
  while (start < items.length && pages.length <= MAX_CARD_PAGES) {
    const pageIndex = pages.indexOf(page)
    const count = await fitCount(host, root, recipe, opts, pages, pageIndex, page, items, start, kind)

    if (count === 0) {
      // Single oversized item — must keep it
      if (kind === 'ing') page.ingredients.push(items[start])
      else page.instructions.push(items[start])
      start += 1
      if (start < items.length) {
        page = emptyPage('stacked')
        pages.push(page)
      }
      continue
    }

    const slice = items.slice(start, start + count)
    if (kind === 'ing') page.ingredients.push(...slice)
    else page.instructions.push(...slice)
    start += count

    if (start < items.length) {
      page = emptyPage('stacked')
      pages.push(page)
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

    let pages = []
    pages = await packItems(host, root, recipe, opts, ingredients, 'ing', pages)
    pages = await packItems(host, root, recipe, opts, instructions, 'dir', pages)

    if (pages.length === 0) pages = [emptyPage()]

    return { pages: pages.slice(0, MAX_CARD_PAGES), strategy: 'stacked', measured: true }
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
