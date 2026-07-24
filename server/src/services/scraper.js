import * as cheerio from 'cheerio'
import puppeteer from 'puppeteer'

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  'Upgrade-Insecure-Requests': '1',
}

export async function scrapeRecipe(url) {
  let html = await fetchHtml(url)

  let recipeData = parseHtml(html, url)
  if (recipeData?.title && (recipeData.ingredients?.length || recipeData.instructions?.length)) {
    return recipeData
  }

  // Many recipe sites bot-block plain HTTP; render in a real browser.
  html = await fetchHtmlWithBrowser(url)
  recipeData = parseHtml(html, url)

  if (!recipeData?.title) {
    throw new Error('Could not extract recipe data from this URL')
  }

  return recipeData
}

async function fetchHtml(url) {
  try {
    const response = await fetch(url, {
      headers: BROWSER_HEADERS,
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      console.warn(`Lightweight fetch returned ${response.status} for ${url}`)
      return null
    }

    return await response.text()
  } catch (error) {
    console.warn('Lightweight fetch failed:', error.message)
    return null
  }
}

async function fetchHtmlWithBrowser(url) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setUserAgent(BROWSER_HEADERS['User-Agent'])
    await page.setExtraHTTPHeaders({
      'Accept-Language': BROWSER_HEADERS['Accept-Language'],
    })

    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    })

    if (!response || response.status() >= 400) {
      throw new Error(`Could not access the URL (status ${response?.status() || 'unknown'})`)
    }

    // Give JSON-LD a moment to appear on JS-heavy sites
    await page.waitForSelector('script[type="application/ld+json"], h1', {
      timeout: 5000,
    }).catch(() => {})

    return await page.content()
  } finally {
    await browser.close()
  }
}

function parseHtml(html, url) {
  if (!html) return null

  const $ = cheerio.load(html)
  const fromJsonLd = extractJsonLd($)
  if (fromJsonLd) return fromJsonLd

  return extractFromMeta($, url)
}

function extractJsonLd($) {
  const scripts = $('script[type="application/ld+json"]')

  for (let i = 0; i < scripts.length; i++) {
    try {
      let content = $(scripts[i]).html()
      if (!content) continue

      // Some sites leave HTML comments or trailing commas
      content = content.trim()
      const json = JSON.parse(content)

      const items = Array.isArray(json) ? json : [json]

      for (const item of items) {
        if (item['@graph']) {
          for (const graphItem of item['@graph']) {
            if (isRecipeType(graphItem['@type'])) {
              return parseRecipeSchema(graphItem)
            }
          }
        }

        if (isRecipeType(item['@type'])) {
          return parseRecipeSchema(item)
        }
      }
    } catch {
      // Invalid JSON, continue
    }
  }

  return null
}

function isRecipeType(type) {
  if (!type) return false
  if (type === 'Recipe') return true
  return Array.isArray(type) && type.includes('Recipe')
}

function parseRecipeSchema(schema) {
  return {
    title: decodeEntities(schema.name || ''),
    description: decodeEntities(schema.description || ''),
    imageUrl: extractImage(schema.image),
    prepTime: parseDuration(schema.prepTime),
    cookTime: parseDuration(schema.cookTime),
    servings: parseServings(schema.recipeYield),
    ingredients: parseIngredients(schema.recipeIngredient),
    instructions: parseInstructions(schema.recipeInstructions),
  }
}

function decodeEntities(text) {
  if (!text || typeof text !== 'string') return text || ''
  return cheerio.load(`<textarea>${text}</textarea>`, { xml: false })('textarea').val() || text
}

function extractImage(image) {
  if (!image) return null
  if (typeof image === 'string') return image
  if (Array.isArray(image)) return image[0]?.url || image[0] || null
  if (image.url) return image.url
  return null
}

function parseDuration(duration) {
  if (!duration) return null
  if (typeof duration === 'number') return duration

  const match = String(duration).match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i)
  if (!match) return null

  const hours = parseInt(match[1] || 0, 10)
  const minutes = parseInt(match[2] || 0, 10)
  return hours * 60 + minutes
}

function parseServings(yield_) {
  if (!yield_) return null
  if (typeof yield_ === 'number') return yield_

  const str = Array.isArray(yield_) ? yield_[0] : yield_
  const match = String(str).match(/\d+/)
  return match ? parseInt(match[0], 10) : null
}

function parseIngredients(ingredients) {
  if (!ingredients) return []
  if (!Array.isArray(ingredients)) return []

  return ingredients.map((ing) => {
    const text = typeof ing === 'string' ? ing : ing.text || ''
    return parseIngredientText(text)
  })
}

function parseIngredientText(text) {
  text = decodeEntities(text)
  const match = text.match(/^([\d\s\/⁄½¼¾⅓⅔⅛⅜⅝⅞.]+)?\s*([a-zA-Z]+(?:\.|[a-zA-Z]*))?\s*(.+)$/)

  if (match) {
    return {
      amount: match[1]?.trim() || '',
      unit: match[2]?.trim() || '',
      name: match[3]?.trim() || text.trim(),
    }
  }

  return {
    amount: '',
    unit: '',
    name: text.trim(),
  }
}

function parseInstructions(instructions) {
  if (!instructions) return []

  if (typeof instructions === 'string') {
    return instructions
      .split(/\n+/)
      .filter((s) => s.trim())
      .map((step) => ({ step: step.trim() }))
  }

  if (!Array.isArray(instructions)) return []

  const steps = []

  for (const inst of instructions) {
    if (typeof inst === 'string') {
      steps.push({ step: decodeEntities(inst.trim()) })
    } else if (inst['@type'] === 'HowToStep') {
      steps.push({ step: decodeEntities((inst.text || inst.name || '').trim()) })
    } else if (inst['@type'] === 'HowToSection') {
      steps.push(...parseInstructions(inst.itemListElement))
    } else if (inst.text) {
      steps.push({ step: decodeEntities(inst.text.trim()) })
    }
  }

  return steps.filter((s) => s.step)
}

function extractFromMeta($, url) {
  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="title"]').attr('content') ||
    $('h1').first().text().trim() ||
    $('title').text().trim()

  const description =
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    ''

  const imageUrl =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="image"]').attr('content') ||
    ''

  const ingredients = []
  const instructions = []

  $('[class*="ingredient"], [data-ingredient], .ingredients li, .recipe-ingredients li').each((_, el) => {
    const text = $(el).text().trim()
    if (text && text.length < 200) {
      ingredients.push(parseIngredientText(text))
    }
  })

  $('[class*="instruction"], [class*="direction"], [class*="step"], .instructions li, .recipe-instructions li, .recipe-steps li').each((_, el) => {
    const text = $(el).text().trim()
    if (text && text.length < 1000) {
      instructions.push({ step: text })
    }
  })

  if (!title) {
    return null
  }

  return {
    title,
    description,
    imageUrl,
    prepTime: null,
    cookTime: null,
    servings: null,
    ingredients: ingredients.length > 0 ? ingredients : [{ amount: '', unit: '', name: '' }],
    instructions: instructions.length > 0 ? instructions : [{ step: '' }],
  }
}
