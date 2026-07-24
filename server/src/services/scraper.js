import axios from 'axios'
import * as cheerio from 'cheerio'

export async function scrapeRecipe(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
      timeout: 15000,
    })

    const $ = cheerio.load(response.data)

    // Try to extract JSON-LD structured data first (Schema.org Recipe)
    let recipeData = extractJsonLd($)

    if (recipeData) {
      return recipeData
    }

    // Fallback: Try to extract from meta tags and common selectors
    recipeData = extractFromMeta($, url)

    return recipeData
  } catch (error) {
    console.error('Scraping error:', error.message)
    throw new Error('Failed to fetch recipe from URL')
  }
}

function extractJsonLd($) {
  const scripts = $('script[type="application/ld+json"]')

  for (let i = 0; i < scripts.length; i++) {
    try {
      const content = $(scripts[i]).html()
      const json = JSON.parse(content)

      // Handle array of schemas
      const items = Array.isArray(json) ? json : [json]

      for (const item of items) {
        // Check for @graph structure
        if (item['@graph']) {
          for (const graphItem of item['@graph']) {
            if (graphItem['@type'] === 'Recipe') {
              return parseRecipeSchema(graphItem)
            }
          }
        }

        // Direct Recipe type
        if (item['@type'] === 'Recipe') {
          return parseRecipeSchema(item)
        }

        // Array of types
        if (Array.isArray(item['@type']) && item['@type'].includes('Recipe')) {
          return parseRecipeSchema(item)
        }
      }
    } catch (e) {
      // Invalid JSON, continue to next script
    }
  }

  return null
}

function parseRecipeSchema(schema) {
  const recipe = {
    title: schema.name || '',
    description: schema.description || '',
    imageUrl: extractImage(schema.image),
    prepTime: parseDuration(schema.prepTime),
    cookTime: parseDuration(schema.cookTime),
    servings: parseServings(schema.recipeYield),
    ingredients: parseIngredients(schema.recipeIngredient),
    instructions: parseInstructions(schema.recipeInstructions),
  }

  return recipe
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

  // Parse ISO 8601 duration (e.g., "PT30M", "PT1H30M")
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
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
  // Try to parse "amount unit name" format
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

  // Handle string instructions
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
      steps.push({ step: inst.trim() })
    } else if (inst['@type'] === 'HowToStep') {
      steps.push({ step: inst.text?.trim() || '' })
    } else if (inst['@type'] === 'HowToSection') {
      // Handle nested sections
      const sectionSteps = parseInstructions(inst.itemListElement)
      steps.push(...sectionSteps)
    } else if (inst.text) {
      steps.push({ step: inst.text.trim() })
    }
  }

  return steps.filter((s) => s.step)
}

function extractFromMeta($, url) {
  // Try Open Graph and meta tags
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

  // Try to find ingredients and instructions from common selectors
  const ingredients = []
  const instructions = []

  // Common ingredient selectors
  $('[class*="ingredient"], [data-ingredient], .ingredients li, .recipe-ingredients li').each((_, el) => {
    const text = $(el).text().trim()
    if (text && text.length < 200) {
      ingredients.push(parseIngredientText(text))
    }
  })

  // Common instruction selectors
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
