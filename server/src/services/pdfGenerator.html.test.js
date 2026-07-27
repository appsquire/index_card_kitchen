import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { planRecipeCard, sectionHeadingOnPage } from '../../../shared/cardPlan.js'
import { gazpachoRecipe, shortRecipe } from '../../../shared/fixtures/cardStudioRecipes.js'
import { generateRecipeHtml } from './pdfGenerator.js'

function cardBlocks(html) {
  return html.split('<div class="card ').slice(1).map((chunk) => `<div class="card ${chunk}`)
}

function countMatches(html, pattern) {
  return (html.match(pattern) || []).length
}

describe('generateRecipeHtml', () => {
  it('includes title header only on the first card', () => {
    const plan = planRecipeCard(gazpachoRecipe, { size: '4x6' })
    assert.ok(plan.pages.length > 1)

    const html = generateRecipeHtml(gazpachoRecipe, {
      size: '4x6',
      style: 'enamel',
      dims: { width: '6in', height: '4in' },
      plan,
      packOntoLetter: true,
    })

    const cards = cardBlocks(html)
    assert.equal(cards.length, plan.pages.length)

    assert.match(cards[0], /Easy Gazpacho/i)
    assert.match(cards[0], /class="wordmark"/)
    assert.doesNotMatch(cards[1], /class="wordmark"/)
  })

  it('renders section headings once per section across pages', () => {
    const plan = planRecipeCard(gazpachoRecipe, { size: '4x6' })
    const html = generateRecipeHtml(gazpachoRecipe, {
      size: '4x6',
      style: 'enamel',
      dims: { width: '6in', height: '4in' },
      plan,
      packOntoLetter: true,
    })

    assert.equal(countMatches(html, /<h2[^>]*>Ingredients<\/h2>/g), 1)
    assert.equal(countMatches(html, /<h2[^>]*>Directions<\/h2>/g), 1)

    for (let i = 0; i < plan.pages.length; i += 1) {
      if (sectionHeadingOnPage(plan, i, 'ingredients')) {
        assert.match(cardBlocks(html)[i], /Ingredients/)
      } else if (!plan.pages[i].ingredients.length) {
        assert.doesNotMatch(cardBlocks(html)[i], /Ingredients/)
      }
    }
  })

  it('renders a complete single-card HTML document for short recipes', () => {
    const plan = planRecipeCard(shortRecipe, { size: '4x6' })
    const html = generateRecipeHtml(shortRecipe, {
      size: '4x6',
      style: 'enamel',
      dims: { width: '6in', height: '4in' },
      plan,
      packOntoLetter: true,
    })

    assert.match(html, /<!DOCTYPE html>/)
    assert.match(html, /Simple Taco Salad/i)
    assert.match(html, /Ingredients/)
    assert.match(html, /Directions/)
    assert.match(html, /ground beef/)
  })
})
