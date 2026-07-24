import puppeteer from 'puppeteer'

const SIZES = {
  '4x6': { width: '6in', height: '4in', pageWidth: '6in', pageHeight: '4in' },
  '5x7': { width: '7in', height: '5in', pageWidth: '7in', pageHeight: '5in' },
  letter: { width: '8.5in', height: '11in', pageWidth: '8.5in', pageHeight: '11in' },
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

function planRecipeCard(recipe, { size = '4x6', layout = 'split' } = {}) {
  const ingredients = (recipe.ingredients || []).filter((i) => i?.name?.trim())
  const instructions = (recipe.instructions || []).filter((i) => i?.step?.trim())

  if (size === 'letter') {
    const ingLimit = 28
    const stepLimit = 20
    const needsBack = ingredients.length > ingLimit || instructions.length > stepLimit
    return {
      needsBack,
      strategy: needsBack ? 'continue' : 'single',
      front: {
        ingredients: ingredients.slice(0, ingLimit),
        instructions: instructions.slice(0, stepLimit),
      },
      back: {
        ingredients: ingredients.slice(ingLimit),
        instructions: instructions.slice(stepLimit),
      },
    }
  }

  if (layout === 'stacked') {
    const ingLimit = size === '4x6' ? 8 : 12
    const frontIng = ingredients.slice(0, ingLimit)
    const backIng = ingredients.slice(ingLimit)
    const needsBack = instructions.length > 0 || backIng.length > 0
    return {
      needsBack,
      strategy: 'ingredients-front',
      front: {
        ingredients: frontIng,
        instructions: [],
        note: needsBack ? 'Directions on back →' : null,
      },
      back: { ingredients: backIng, instructions },
    }
  }

  const ingLimit = size === '4x6' ? 7 : 11
  const stepLimit = size === '4x6' ? 5 : 8
  const backIng = ingredients.slice(ingLimit)
  const backSteps = instructions.slice(stepLimit)
  const needsBack = backIng.length > 0 || backSteps.length > 0
  return {
    needsBack,
    strategy: 'continue',
    front: {
      ingredients: ingredients.slice(0, ingLimit),
      instructions: instructions.slice(0, stepLimit),
      note: needsBack ? (backSteps.length ? '…continued on back' : '…more on back') : null,
    },
    back: { ingredients: backIng, instructions: backSteps },
  }
}

export async function generateRecipePdf(recipe, options = {}) {
  const size = SIZES[options.size] ? options.size : '4x6'
  const style = ['lined', 'butter', 'enamel'].includes(options.style) ? options.style : 'enamel'
  const layout = options.layout === 'stacked' ? 'stacked' : 'split'
  const dims = SIZES[size]
  const plan = planRecipeCard(recipe, { size, layout })

  const html = generateRecipeHtml(recipe, { size, style, layout, dims, plan })

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdfBuffer = await page.pdf({
      width: dims.pageWidth,
      height: dims.pageHeight,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      printBackground: true,
    })

    return pdfBuffer
  } finally {
    await browser.close()
  }
}

function formatMinutes(n) {
  if (!n) return null
  return n >= 60 ? `${Math.floor(n / 60)}H${n % 60 ? ` ${n % 60}M` : ''}` : `${n}M`
}

function renderCardPage(recipe, { size, style, layout, dims, plan, side }) {
  const showingBack = side === 'back'
  const page = showingBack ? plan.back : plan.front
  const ingredients = page.ingredients || []
  const instructions = page.instructions || []
  const continueNote = !showingBack ? page.note : null
  const frontStepCount = plan.front.instructions?.length || 0
  const bodyLayout =
    showingBack && plan.strategy === 'ingredients-front' ? 'stacked' : layout

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
      const n = showingBack ? frontStepCount + idx + 1 : idx + 1
      return `<li><span class="num">${n}</span><span class="step">${escapeHtml(inst.step)}</span></li>`
    })
    .join('')

  const title = String(recipe.title || 'Untitled recipe').toUpperCase()
  const footerLeft = source
    ? `From the kitchen · ${source}`
    : 'From the kitchen · Index Card Kitchen'
  const sideTag = plan.needsBack ? (showingBack ? 'Side 2 of 2' : 'Side 1 of 2') : ''

  const isLetter = size === 'letter'
  const wordSize = isLetter ? '64px' : size === '5x7' ? '48px' : '42px'
  const titleSize = isLetter ? '20px' : size === '5x7' ? '15px' : '13px'
  const bodySize = isLetter ? '13px' : '10.5px'

  return `
  <div class="card ${style}" style="width:${dims.width};height:${dims.height}">
    <div class="header">
      <div class="wordmark" style="font-size:${wordSize};color:${style === 'enamel' ? '#c23b3b' : '#111'}">
        ${showingBack ? 'Back' : 'Recipe'}
      </div>
      <div class="heading">
        <h1 style="font-size:${titleSize}">${escapeHtml(title)}</h1>
        ${
          showingBack
            ? '<div class="meta">Continued from front</div>'
            : metaHtml
              ? `<div class="meta">${metaHtml}</div>`
              : ''
        }
      </div>
    </div>
    <div class="body ${bodyLayout}" style="font-size:${bodySize}">
      ${
        ingredients.length
          ? `<section>
              <h2 style="color:${style === 'enamel' ? '#c23b3b' : '#111'}">${
                showingBack && instructions.length ? 'More ingredients' : 'Ingredients'
              }</h2>
              <ul class="ings">${ingredientsHtml}</ul>
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
      ${continueNote ? `<p class="cont">${escapeHtml(continueNote)}</p>` : ''}
    </div>
    <div class="footer">
      <span>${escapeHtml(footerLeft)}</span>
      ${sideTag ? `<span class="side">${escapeHtml(sideTag)}</span>` : ''}
    </div>
  </div>`
}

function generateRecipeHtml(recipe, { size, style, layout, dims, plan }) {
  const pages = [renderCardPage(recipe, { size, style, layout, dims, plan, side: 'front' })]
  if (plan.needsBack) {
    pages.push(renderCardPage(recipe, { size, style, layout, dims, plan, side: 'back' }))
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800&family=Patrick+Hand&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Nunito', sans-serif; color: #1a1a1a; }
    .card {
      padding: 0.28in 0.32in 0.22in;
      overflow: hidden;
      background: #fff;
      display: flex;
      flex-direction: column;
      page-break-after: always;
      break-after: page;
    }
    .card:last-child { page-break-after: auto; break-after: auto; }
    .card.butter { background: #f6e6b4; }
    .card.lined .iname, .card.lined .step {
      border-bottom: 1px solid #d7e4f2;
      padding-bottom: 2px;
    }
    .card.butter .iname, .card.butter .step {
      border-bottom: 1px solid rgba(120, 90, 40, 0.22);
      padding-bottom: 2px;
    }
    .header { display: flex; gap: 0.18in; align-items: flex-start; margin-bottom: 0.14in; }
    .wordmark {
      font-family: 'Patrick Hand', cursive;
      line-height: 0.85;
      flex-shrink: 0;
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
    .body.split { display: grid; grid-template-columns: 0.92fr 1.08fr; gap: 0.22in; flex: 1; min-height: 0; }
    .body.stacked { display: flex; flex-direction: column; gap: 0.16in; flex: 1; min-height: 0; }
    h2 {
      font-family: 'Patrick Hand', cursive;
      font-size: 22px;
      font-weight: 400;
      margin-bottom: 8px;
    }
    ul, ol { list-style: none; }
    .ings li {
      display: grid;
      grid-template-columns: 0.72in 1fr;
      gap: 0.08in;
      align-items: end;
      margin-bottom: 5px;
      line-height: 1.25;
    }
    .ings li.full { grid-template-columns: 1fr; }
    .amt { font-weight: 700; font-size: 10px; }
    .dirs li {
      display: grid;
      grid-template-columns: 0.18in 1fr;
      gap: 0.08in;
      margin-bottom: 5px;
      line-height: 1.3;
    }
    .num { font-weight: 800; font-size: 10px; }
    .cont {
      grid-column: 1 / -1;
      margin-top: auto;
      text-align: right;
      font-family: 'Patrick Hand', cursive;
      font-size: 13px;
      color: #c23b3b;
    }
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
  ${pages.join('\n')}
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
