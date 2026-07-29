import { launchBrowser } from './browser.js'
import {
  planRecipeCard,
  packPageIndexes,
  getPageFooterTag,
  SIZE_STYLES,
  pageBodyLayout,
  sectionHeadingOnPage,
} from '../../../shared/cardPlan.js'

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

function formatMinutes(n) {
  if (!n) return null
  return n >= 60 ? `${Math.floor(n / 60)}H${n % 60 ? ` ${n % 60}M` : ''}` : `${n}M`
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function generateRecipePdf(recipe, options = {}) {
  const size = SIZE_STYLES[options.size] ? options.size : '4x6'
  const style = ['lined', 'butter', 'enamel'].includes(options.style) ? options.style : 'enamel'
  const dims = SIZE_STYLES[size]
  const plan = options.plan || planRecipeCard(recipe, { size })
  const packOntoLetter = size === '4x6' || size === '5x7'

  const html = generateRecipeHtml(recipe, {
    size,
    style,
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
            width: dims.width,
            height: dims.height,
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

function renderSection(kind, heading, listHtml, enamel) {
  if (!listHtml) return ''
  const color = enamel ? '#c23b3b' : '#111'
  const listTag = kind === 'ings' ? 'ul' : 'ol'
  const listClass = kind === 'ings' ? 'ings' : 'dirs'
  const headingHtml = heading
    ? `<h2 style="color:${color}">${escapeHtml(heading)}</h2>`
    : ''
  return `<section>
    ${headingHtml}
    <${listTag} class="${listClass}">${listHtml}</${listTag}>
  </section>`
}

function renderCardPage(recipe, { size, style, dims, plan, pageIndex }) {
  const totalPages = plan.pages?.length || 1
  const safeIndex = Math.min(Math.max(0, pageIndex), totalPages - 1)
  const page = plan.pages[safeIndex] || { mode: 'stacked', ingredients: [], instructions: [] }
  const ingredients = page.ingredients || []
  const instructions = page.instructions || []
  const isContinuation = safeIndex > 0
  const stepOffset = (plan.pages || [])
    .slice(0, safeIndex)
    .reduce((n, p) => n + (p.instructions?.length || 0), 0)

  const bodyLayout = pageBodyLayout(page, plan)

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

  const amtCol = size === 'letter' ? '1.15in' : size === '5x7' ? '1.05in' : '0.95in'

  const ingredientsHtml = ingredients
    .map((ing) => {
      const qty = formatQuantity(ing.amount)
      const amount = qty ? [qty, ing.unit].filter(Boolean).join(' ') : ''
      const name =
        !qty && ing.unit
          ? [ing.unit, ing.name].filter(Boolean).join(' ')
          : ing.name || ''
      return `<li class="${amount ? '' : 'full'}" style="--amt-col:${amtCol}">${
        amount ? `<span class="amt">${escapeHtml(amount)}</span>` : ''
      }<span class="iname">${escapeHtml(name)}</span></li>`
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
  const headerMb = isLetter ? '0.26in' : '0.18in'
  const enamel = style === 'enamel'

  const showCardHeader = safeIndex === 0
  const showIngHeading =
    ingredients.length > 0 && sectionHeadingOnPage(plan, safeIndex, 'ingredients')
  const showDirHeading =
    instructions.length > 0 && sectionHeadingOnPage(plan, safeIndex, 'directions')

  const ingSection = renderSection(
    'ings',
    showIngHeading ? 'Ingredients' : null,
    ingredientsHtml,
    enamel
  )
  const dirSection = renderSection(
    'dirs',
    showDirHeading ? 'Directions' : null,
    instructionsHtml,
    enamel
  )

  const bodyInner =
    bodyLayout === 'split'
      ? `<div class="pane">${ingSection}</div><div class="pane">${dirSection}</div>`
      : `${ingSection}${dirSection}`

  const metaBlock = metaHtml ? `<div class="meta">${metaHtml}</div>` : ''
  const headerHtml = showCardHeader
    ? `<div class="header" style="margin-bottom:${headerMb}">
      <div class="wordmark" style="font-size:${wordSize};color:${enamel ? '#c23b3b' : '#111'}">
        Recipe
      </div>
      <div class="heading">
        <h1 style="font-size:${titleSize}">${escapeHtml(title)}</h1>
        ${metaBlock}
      </div>
    </div>`
    : ''

  return `
  <div class="card ${style}${isContinuation ? ' continuation' : ''}" style="width:${dims.width};height:${dims.height}">
    ${headerHtml}
    <div class="body ${bodyLayout}" style="font-size:${bodySize}">
      ${bodyInner}
    </div>
    <div class="footer">
      <span>${escapeHtml(footerLeft)}</span>
      ${sideTag ? `<span class="side">${escapeHtml(sideTag)}</span>` : ''}
    </div>
  </div>`
}

export function generateRecipeHtml(recipe, { size, style, dims, plan, packOntoLetter = false }) {
  const totalPages = plan.pages?.length || 1
  const sheets = packOntoLetter
    ? packPageIndexes(totalPages, size)
    : [[...Array(totalPages).keys()]]

  const sheetHtml = sheets
    .map((faceIndexes, sheetIdx) => {
      const faces = faceIndexes
        .map((i) =>
          renderCardPage(recipe, { size, style, dims, plan, pageIndex: i })
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
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.18in 0.22in;
      align-items: stretch;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
    .body.split .pane {
      min-width: 0;
      min-height: 0;
      height: 100%;
      overflow: hidden;
    }
    .body.stacked {
      display: flex;
      flex-direction: column;
      gap: 0.16in;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
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