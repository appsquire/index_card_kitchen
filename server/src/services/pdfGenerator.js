import puppeteer from 'puppeteer'

const SIZES = {
  '4x6': { width: '6in', height: '4in', pageWidth: '6in', pageHeight: '4in' },
  '5x7': { width: '7in', height: '5in', pageWidth: '7in', pageHeight: '5in' },
  letter: { width: '8.5in', height: '11in', pageWidth: '8.5in', pageHeight: '11in' },
}

export async function generateRecipePdf(recipe, options = {}) {
  const size = SIZES[options.size] ? options.size : '4x6'
  const style = ['lined', 'butter', 'enamel'].includes(options.style) ? options.style : 'lined'
  const layout = options.layout === 'stacked' ? 'stacked' : 'split'
  const dims = SIZES[size]

  const html = generateRecipeHtml(recipe, { size, style, layout, dims })

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

function generateRecipeHtml(recipe, { size, style, layout, dims }) {
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0)
  const formatIngredient = (ing) =>
    [ing.amount, ing.unit, ing.name].filter(Boolean).join(' ')

  let source = ''
  try {
    if (recipe.sourceUrl) source = new URL(recipe.sourceUrl).hostname.replace(/^www\./, '')
  } catch {
    source = ''
  }

  const ingredients = (recipe.ingredients || []).filter((i) => i?.name?.trim())
  const instructions = (recipe.instructions || []).filter((i) => i?.step?.trim())

  const meta = [
    totalTime > 0 ? `${totalTime} min` : null,
    recipe.servings ? `serves ${recipe.servings}` : null,
  ].filter(Boolean).join(' · ')

  const ingredientsHtml = ingredients
    .map((ing) => `<li><span class="tick">□</span><span>${escapeHtml(formatIngredient(ing))}</span></li>`)
    .join('')

  const instructionsHtml = instructions
    .map((inst, idx) => `<li><span class="num">${idx + 1}</span><span>${escapeHtml(inst.step)}</span></li>`)
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&family=Patrick+Hand&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Nunito', sans-serif; color: #1c2924; }
    .card {
      width: ${dims.width};
      height: ${dims.height};
      padding: 0.42in;
      position: relative;
      overflow: hidden;
      border: 1px solid #cfc7b8;
      background: #fffef8;
    }
    .card.lined {
      background-image:
        linear-gradient(90deg, transparent 0.42in, #e8a0a0 0.42in, #e8a0a0 calc(0.42in + 1.5px), transparent calc(0.42in + 1.5px)),
        repeating-linear-gradient(transparent, transparent 21px, #b7d0e8 22px);
      background-position: 0 0, 0 0.95in;
    }
    .card.butter {
      background: #fff1c9;
      background-image: radial-gradient(ellipse at 20% 10%, rgba(255,255,255,0.55), transparent 45%);
    }
    .card.enamel {
      background: #fffefa;
      border-top: 10px solid #c23b3b;
    }
    .eyebrow { font-family: 'Patrick Hand', cursive; color: #c23b3b; font-size: 13px; }
    h1 { font-family: 'Patrick Hand', cursive; font-size: ${size === 'letter' ? '42px' : '28px'}; line-height: 1.05; margin: 2px 0 6px; }
    .meta { font-size: 12px; font-weight: 700; color: #446358; margin-bottom: 8px; }
    .header { border-bottom: 1px solid #c5d9d0; padding-bottom: 8px; margin-bottom: 10px; }
    .body.split { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .body.stacked { display: flex; flex-direction: column; gap: 12px; }
    h2 { font-family: 'Patrick Hand', cursive; font-size: 20px; margin-bottom: 4px; }
    li { list-style: none; display: flex; gap: 6px; align-items: flex-start; font-size: ${size === '4x6' ? '11px' : '12.5px'}; line-height: 1.35; margin-bottom: 3px; }
    .tick { color: #9bbdb0; }
    .num { color: #c23b3b; font-weight: 700; width: 1.1em; flex-shrink: 0; }
    .footer {
      position: absolute; left: 0.42in; right: 0.42in; bottom: 0.28in;
      display: flex; justify-content: space-between; font-size: 10px; color: #557a6e;
      border-top: 1px solid #c5d9d0; padding-top: 6px;
    }
  </style>
</head>
<body>
  <div class="card ${style}">
    <div class="header">
      <div class="eyebrow">Recipe card</div>
      <h1>${escapeHtml(recipe.title || '')}</h1>
      ${meta ? `<div class="meta">${escapeHtml(meta)}</div>` : ''}
    </div>
    <div class="body ${layout}">
      <section>
        <h2>Ingredients</h2>
        <ul>${ingredientsHtml}</ul>
      </section>
      <section>
        <h2>Method</h2>
        <ol>${instructionsHtml}</ol>
      </section>
    </div>
    <div class="footer">
      <span>${source ? `From ${escapeHtml(source)}` : 'Homemade'}</span>
      <span>Index Card Kitchen</span>
    </div>
  </div>
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
