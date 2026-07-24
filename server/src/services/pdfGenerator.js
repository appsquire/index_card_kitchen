import puppeteer from 'puppeteer'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export async function generateRecipePdf(recipe) {
  const html = generateRecipeHtml(recipe)

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdfBuffer = await page.pdf({
      format: 'Letter',
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
      },
      printBackground: true,
    })

    return pdfBuffer
  } finally {
    await browser.close()
  }
}

function generateRecipeHtml(recipe) {
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0)

  const formatIngredient = (ing) => {
    const parts = [ing.amount, ing.unit, ing.name].filter(Boolean)
    return parts.join(' ')
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Crimson Text', Georgia, serif;
      color: #2E2408;
      background: #FDF8F3;
      line-height: 1.6;
    }

    .recipe-card {
      background: #F5EDE4;
      border: 2px solid #C9B08A;
      border-radius: 4px;
      padding: 40px;
      max-width: 100%;
      position: relative;
    }

    .recipe-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image:
        repeating-linear-gradient(
          0deg,
          transparent,
          transparent 27px,
          #E1D0B8 28px
        );
      background-position: 0 40px;
      pointer-events: none;
      opacity: 0.5;
    }

    .header {
      text-align: center;
      border-bottom: 2px solid #C9B08A;
      padding-bottom: 20px;
      margin-bottom: 30px;
      position: relative;
      z-index: 1;
    }

    h1 {
      font-size: 28px;
      font-weight: 600;
      color: #4A3A0C;
      margin-bottom: 10px;
    }

    .description {
      font-style: italic;
      color: #6B5210;
      margin-bottom: 15px;
    }

    .meta {
      display: flex;
      justify-content: center;
      gap: 30px;
      font-size: 14px;
      color: #6B5210;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      position: relative;
      z-index: 1;
    }

    h2 {
      font-size: 18px;
      font-weight: 600;
      color: #4A3A0C;
      border-bottom: 1px solid #C9B08A;
      padding-bottom: 5px;
      margin-bottom: 15px;
    }

    .ingredients ul {
      list-style: none;
    }

    .ingredients li {
      padding: 5px 0;
      padding-left: 20px;
      position: relative;
    }

    .ingredients li::before {
      content: '•';
      color: #B45309;
      position: absolute;
      left: 0;
    }

    .instructions ol {
      list-style: none;
      counter-reset: step;
    }

    .instructions li {
      padding: 10px 0;
      padding-left: 35px;
      position: relative;
      counter-increment: step;
    }

    .instructions li::before {
      content: counter(step);
      position: absolute;
      left: 0;
      top: 8px;
      width: 24px;
      height: 24px;
      background: #B45309;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
    }

    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #C9B08A;
      text-align: center;
      font-size: 12px;
      color: #8B6914;
      position: relative;
      z-index: 1;
    }

    .source {
      font-style: italic;
    }

    .brand {
      margin-top: 5px;
      color: #B08C5C;
    }

    @media print {
      body {
        background: white;
      }
      .recipe-card {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="recipe-card">
    <div class="header">
      <h1>${escapeHtml(recipe.title)}</h1>
      ${recipe.description ? `<p class="description">${escapeHtml(recipe.description)}</p>` : ''}
      <div class="meta">
        ${recipe.prepTime ? `<span class="meta-item">⏱ Prep: ${recipe.prepTime} min</span>` : ''}
        ${recipe.cookTime ? `<span class="meta-item">🍳 Cook: ${recipe.cookTime} min</span>` : ''}
        ${totalTime ? `<span class="meta-item">⏰ Total: ${totalTime} min</span>` : ''}
        ${recipe.servings ? `<span class="meta-item">👥 Serves ${recipe.servings}</span>` : ''}
      </div>
    </div>

    <div class="content">
      <div class="ingredients">
        <h2>Ingredients</h2>
        <ul>
          ${recipe.ingredients?.map(ing => `
            <li>${escapeHtml(formatIngredient(ing))}</li>
          `).join('') || ''}
        </ul>
      </div>

      <div class="instructions">
        <h2>Instructions</h2>
        <ol>
          ${recipe.instructions?.map(inst => `
            <li>${escapeHtml(inst.step)}</li>
          `).join('') || ''}
        </ol>
      </div>
    </div>

    <div class="footer">
      ${recipe.sourceUrl ? `<p class="source">Source: ${escapeHtml(new URL(recipe.sourceUrl).hostname)}</p>` : ''}
      <p class="brand">Index Card Kitchen</p>
    </div>
  </div>
</body>
</html>
  `
}

function escapeHtml(text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
