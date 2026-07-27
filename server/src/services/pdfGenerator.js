import { launchBrowser } from './browser.js'

const SIZES = {
  '4x6': { width: '6in', height: '4in', pageWidth: '6in', pageHeight: '4in' },
  '5x7': { width: '7in', height: '5in', pageWidth: '7in', pageHeight: '5in' },
  letter: { width: '8.5in', height: '11in', pageWidth: '8.5in', pageHeight: '11in' },
}

const MAX_CARD_PAGES = 8

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

function formatQuantity(value) {
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
  const frac = abs - whole

  if (frac < 0.02) return `${sign}${whole}`
  if (frac > 0.98) return `${sign}${whole + 1}`

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
  return `${sign}${rounded}`
}

function pageLimits(size) {
  if (size === 'letter') {
    return { stackedIng: 18, stackedStep: 10, splitIng: 28, splitStep: 14 }
  }
  if (size === '5x7') {
    return { stackedIng: 8, stackedStep: 5, splitIng: 12, splitStep: 6 }
  }
  return { stackedIng: 5, stackedStep: 3, splitIng: 8, splitStep: 3 }
}

function getPageFooterTag(pageIndex, totalPages) {
  if (totalPages <= 1) return null
  if (totalPages === 2) return `Side ${pageIndex + 1} of 2`
  return `Page ${pageIndex + 1} of ${totalPages}`
}

function annotatePageNotes(pages) {
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

function facesPerLetterSheet(size) {
  if (size === '4x6' || size === '5x7') return 2
  return 1
}

function packPageIndexes(pageCount, size) {
  const per = facesPerLetterSheet(size)
  const sheets = []
  for (let i = 0; i < pageCount; i += per) {
    const faceIndexes = []
    for (let j = i; j < Math.min(i + per, pageCount); j++) faceIndexes.push(j)
    sheets.push(faceIndexes)
  }
  return sheets
}

/**
 * Pack ingredients then directions onto pages (stream order).
 * Directions only start after all ingredients are placed.
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
 * Heuristic multi-page plan (server has no DOM measure).
 * Uses generous caps so pages stay denser; footer tag alone marks multi-page.
 */
function planRecipeCard(recipe, { size = '4x6', layout = 'split' } = {}) {
  const ingredients = (recipe.ingredients || []).filter((i) => i?.name?.trim())
  const instructions = (recipe.instructions || []).filter((i) => i?.step?.trim())
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

export async function generateRecipePdf(recipe, options = {}) {
  const size = SIZES[options.size] ? options.size : '4x6'
  const style = ['lined', 'butter', 'enamel'].includes(options.style) ? options.style : 'enamel'
  const layout = options.layout === 'stacked' ? 'stacked' : 'split'
  const dims = SIZES[size]
  const plan = planRecipeCard(recipe, { size, layout })
  const packOntoLetter = size === '4x6' || size === '5x7'

  const html = generateRecipeHtml(recipe, {
    size,
    style,
    layout,
    dims,
    plan,
    packOntoLetter,
  })

  const browser = await launchBrowser()

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 })
    await Promise.race([
      page.evaluate(() => document.fonts.ready),
      new Promise((r) => setTimeout(r, 1500)),
    ]).catch(() => {})

    const pdfBuffer = await page.pdf(
      packOntoLetter
        ? {
            width: '8.5in',
            height: '11in',
            margin: { top: '0.4in', right: '0.4in', bottom: '0.4in', left: '0.4in' },
            printBackground: true,
            preferCSSPageSize: false,
          }
        : {
            width: dims.pageWidth,
            height: dims.pageHeight,
            margin: { top: '0', right: '0', bottom: '0', left: '0' },
            printBackground: true,
            preferCSSPageSize: false,
          }
    )

    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}

function formatMinutes(n) {
  if (!n) return null
  return n >= 60 ? `${Math.floor(n / 60)}H${n % 60 ? ` ${n % 60}M` : ''}` : `${n}M`
}

function renderCardPage(recipe, { size, style, layout, dims, plan, pageIndex }) {
  const totalPages = plan.pages?.length || 1
  const safeIndex = Math.min(Math.max(0, pageIndex), totalPages - 1)
  const page = plan.pages[safeIndex] || { ingredients: [], instructions: [] }
  const ingredients = page.ingredients || []
  const instructions = page.instructions || []
  const isContinuation = safeIndex > 0
  const stepOffset = (plan.pages || [])
    .slice(0, safeIndex)
    .reduce((n, p) => n + (p.instructions?.length || 0), 0)

  const bodyLayout = plan.strategy === 'stacked' || layout === 'stacked' ? 'stacked' : 'split'

  let source = ''
  try {
    if (recipe.sourceUrl) source = new URL(recipe.sourceUrl).hostname.replace(/^www\./, '')
  } catch {
    source = ''
  }

  const metaBits = [
    recipe.servings ? `Serves: ${recipe.servings}` : null,
    recipe.prepTime ? `Prep time: ${formatMinutes(recipe.prepTime)}` : null,
    recipe.cookTime ? `Cook time: ${formatMinutes(recipe.cookTime)}` : null,
  ].filter(Boolean)

  const metaHtml = metaBits
    .map((bit, i) => `${i > 0 ? '<span class="sep">|</span>' : ''}${escapeHtml(bit)}`)
    .join('')

  const ingredientsHtml = ingredients
    .map((ing) => {
      const amount = [formatQuantity(ing.amount), ing.unit].filter(Boolean).join(' ')
      return `<li class="${amount ? '' : 'full'}">${
        amount ? `<span class="amt">${escapeHtml(amount)}</span>` : ''
      }<span class="iname">${escapeHtml(ing.name)}</span></li>`
    })
    .join('')

  const instructionsHtml = instructions
    .map((inst, idx) => {
      const n = stepOffset + idx + 1
      return `<li><span class="num">${n}</span><span class="step">${escapeHtml(inst.step)}</span></li>`
    })
    .join('')

  const title = String(recipe.title || 'Untitled recipe').toUpperCase()
  const footerLeft = source
    ? `From the kitchen · ${source}`
    : 'From the kitchen · Index Card Kitchen'
  const sideTag = getPageFooterTag(safeIndex, totalPages)

  const isLetter = size === 'letter'
  const wordSize = isLetter ? '64px' : size === '5x7' ? '48px' : '42px'
  const titleSize = isLetter ? '20px' : size === '5x7' ? '15px' : '13px'
  const bodySize = isLetter ? '13px' : '10.5px'
  const amtCol = isLetter ? '1.15in' : size === '5x7' ? '1.05in' : '0.95in'
  const headerMb = isLetter ? '0.26in' : '0.18in'

  const ingHeading =
    isContinuation && instructions.length > 0 && ingredients.length > 0
      ? 'More ingredients'
      : 'Ingredients'

  const metaBlock = metaHtml ? `<div class="meta">${metaHtml}</div>` : ''

  return `
  <div class="card ${style}" style="width:${dims.width};height:${dims.height}">
    <div class="header" style="margin-bottom:${headerMb}">
      <div class="wordmark" style="font-size:${wordSize};color:${style === 'enamel' ? '#c23b3b' : '#111'}">
        Recipe
      </div>
      <div class="heading">
        <h1 style="font-size:${titleSize}">${escapeHtml(title)}</h1>
        ${metaBlock}
      </div>
    </div>
    <div class="body ${bodyLayout}" style="font-size:${bodySize}">
      ${
        ingredients.length
          ? `<section>
              <h2 style="color:${style === 'enamel' ? '#c23b3b' : '#111'}">${escapeHtml(ingHeading)}</h2>
              <ul class="ings" style="--amt-col:${amtCol}">${ingredientsHtml}</ul>
            </section>`
          : ''
      }
      ${
        instructions.length
          ? `<section>
              <h2 style="color:${style === 'enamel' ? '#c23b3b' : '#111'}">Directions</h2>
              <ol class="dirs">${instructionsHtml}</ol>
            </section>`
          : ''
      }
    </div>
    <div class="footer">
      <span>${escapeHtml(footerLeft)}</span>
      ${sideTag ? `<span class="side">${escapeHtml(sideTag)}</span>` : ''}
    </div>
  </div>`
}

function generateRecipeHtml(recipe, { size, style, layout, dims, plan, packOntoLetter = false }) {
  const totalPages = plan.pages?.length || 1
  const sheets = packOntoLetter
    ? packPageIndexes(totalPages, size)
    : [[...Array(totalPages).keys()]]

  const sheetHtml = sheets
    .map((faceIndexes, sheetIdx) => {
      const faces = faceIndexes
        .map((i) =>
          renderCardPage(recipe, { size, style, layout, dims, plan, pageIndex: i })
        )
        .join('\n')
      const breakClass = sheetIdx > 0 ? ' sheet--break' : ''
      const cutClass = packOntoLetter ? ' sheet--cut' : ''
      return `<div class="sheet${cutClass}${breakClass}">${faces}</div>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800&family=Patrick+Hand&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Nunito', 'Segoe UI', Tahoma, sans-serif; color: #1a1a1a; }
    .sheet {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.15in;
    }
    .sheet--break {
      break-before: page;
      page-break-before: always;
    }
    .card {
      padding: 0.28in 0.32in 0.22in;
      overflow: hidden;
      background: #fff;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      border: none;
    }
    /* Dashed cut guides only when packing index cards onto letter sheets */
    .sheet--cut .card {
      border: 2px dashed #999;
    }
    .card.butter { background: #f6e6b4; }
    .card.lined .iname, .card.lined .step {
      border-bottom: 1px solid #d7e4f2;
      padding-bottom: 2px;
    }
    .card.butter .iname, .card.butter .step {
      border-bottom: 1px solid rgba(120, 90, 40, 0.22);
      padding-bottom: 2px;
    }
    .header { display: flex; gap: 0.18in; align-items: flex-start; margin-bottom: 0.18in; }
    .wordmark {
      font-family: 'Patrick Hand', 'Segoe Print', 'Comic Sans MS', cursive;
      line-height: 1.05;
      flex-shrink: 0;
      padding-bottom: 0.06in;
    }
    .heading { flex: 1; padding-top: 0.08in; }
    h1 {
      font-weight: 800;
      letter-spacing: 0.14em;
      line-height: 1.25;
      margin-bottom: 6px;
    }
    .meta {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #444;
    }
    .sep { margin: 0 0.28em; color: #999; font-weight: 500; }
    .body.split {
      column-count: 2;
      column-gap: 0.22in;
      column-fill: auto;
      flex: 1;
      min-height: 0;
      overflow: hidden;
      height: 100%;
    }
    .body.split > section + section { margin-top: 0.14in; }
    .body.split h2 { break-after: avoid; -webkit-column-break-after: avoid; }
    .body.split li {
      break-inside: avoid;
      -webkit-column-break-inside: avoid;
      page-break-inside: avoid;
    }
    .body.stacked { display: flex; flex-direction: column; gap: 0.16in; flex: 1; min-height: 0; overflow: hidden; }
    h2 {
      font-family: 'Patrick Hand', 'Segoe Print', 'Comic Sans MS', cursive;
      font-size: 22px;
      font-weight: 400;
      margin-bottom: 8px;
    }
    ul, ol { list-style: none; }
    .ings li {
      display: grid;
      grid-template-columns: var(--amt-col, 0.95in) 1fr;
      gap: 0.08in;
      align-items: end;
      margin-bottom: 5px;
      line-height: 1.25;
    }
    .ings li.full { grid-template-columns: 1fr; }
    .amt { font-weight: 700; font-size: 10px; white-space: nowrap; }
    .dirs li {
      display: grid;
      grid-template-columns: 0.18in 1fr;
      gap: 0.08in;
      margin-bottom: 5px;
      line-height: 1.3;
    }
    .num { font-weight: 800; font-size: 10px; }
    .cont {
      column-span: all;
      margin-top: 6px;
      text-align: right;
      font-family: 'Patrick Hand', cursive;
      font-size: 13px;
      color: #c23b3b;
    }
    .body.stacked .cont { margin-top: auto; }
    .footer {
      margin-top: auto;
      padding-top: 0.1in;
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #777;
    }
    .side { color: #c23b3b; letter-spacing: 0.08em; }
  </style>
</head>
<body>
  ${sheetHtml}
</body>
</html>`
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
