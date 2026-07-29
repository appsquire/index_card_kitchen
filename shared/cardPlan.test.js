import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_CARD_PAGES,
  planRecipeCard,
  getPageChipLabel,
  getPageFooterTag,
  sectionHeadingOnPage,
  facesPerLetterSheet,
  packPageIndexes,
  pageBodyLayout,
  singlePageMode,
} from './cardPlan.js'
import {
  shortRecipe,
  gazpachoRecipe,
  longDirectionsRecipe,
} from './fixtures/cardStudioRecipes.js'

function filteredIngredients(recipe) {
  return (recipe.ingredients || []).filter((i) => i?.name?.trim())
}

function filteredInstructions(recipe) {
  return (recipe.instructions || []).filter((i) => i?.step?.trim())
}

function assertPlanPreservesContent(recipe, plan) {
  const ings = filteredIngredients(recipe)
  const steps = filteredInstructions(recipe)
  const packedIng = plan.pages.flatMap((p) => p.ingredients || [])
  const packedSteps = plan.pages.flatMap((p) => p.instructions || [])

  assert.equal(packedIng.length, ings.length, 'ingredient count preserved')
  assert.equal(packedSteps.length, steps.length, 'instruction count preserved')

  for (let i = 0; i < ings.length; i += 1) {
    assert.equal(packedIng[i].name, ings[i].name, `ingredient ${i} order/name`)
  }
  for (let i = 0; i < steps.length; i += 1) {
    assert.equal(packedSteps[i].step, steps[i].step, `step ${i} order/text`)
  }
}

function firstPageWith(plan, field) {
  return plan.pages.findIndex((p) => (p[field] || []).length > 0)
}

describe('planRecipeCard', () => {
  it('packs a short recipe on one split page for 4×6', () => {
    const plan = planRecipeCard(shortRecipe, { size: '4x6' })
    assert.equal(plan.pages.length, 1)
    assert.equal(plan.pages[0].mode, 'split')
    assert.equal(pageBodyLayout(plan.pages[0], plan), 'split')
    assertPlanPreservesContent(shortRecipe, plan)
  })

  it('uses stacked mode for letter when content fits one page', () => {
    const plan = planRecipeCard(shortRecipe, { size: 'letter' })
    assert.equal(plan.pages.length, 1)
    assert.equal(plan.pages[0].mode, 'stacked')
    assertPlanPreservesContent(shortRecipe, plan)
  })

  it('overflows Gazpacho to multiple pages on 4×6', () => {
    const plan = planRecipeCard(gazpachoRecipe, { size: '4x6' })
    assert.ok(plan.pages.length > 1, 'Gazpacho should need multiple cards')
    assert.ok(plan.pages.length <= MAX_CARD_PAGES)
    assertPlanPreservesContent(gazpachoRecipe, plan)
  })

  it('overflows Gazpacho to multiple pages on 5×7', () => {
    const plan = planRecipeCard(gazpachoRecipe, { size: '5x7' })
    assert.ok(plan.pages.length > 1)
    assertPlanPreservesContent(gazpachoRecipe, plan)
  })

  it('uses split panes on multi-page landscape when both sections remain', () => {
    const plan = planRecipeCard(gazpachoRecipe, { size: '4x6' })
    assert.ok(plan.pages.length > 1)
    assert.equal(plan.pages[0].mode, 'split')
    assert.ok(plan.pages[0].ingredients.length > 0)
    assert.ok(plan.pages[0].instructions.length > 0)
    assert.equal(pageBodyLayout(plan.pages[0], plan), 'split')
  })

  it('falls back to stacked for one-sided remainder pages', () => {
    const plan = planRecipeCard(gazpachoRecipe, { size: '4x6' })
    for (let i = 0; i < plan.pages.length; i += 1) {
      const layout = pageBodyLayout(plan.pages[i], plan)
      if (plan.pages[i].ingredients.length && !plan.pages[i].instructions.length) {
        assert.equal(layout, 'stacked', `page ${i} ingredients-only`)
      }
      if (plan.pages[i].instructions.length && !plan.pages[i].ingredients.length) {
        assert.equal(layout, 'stacked', `page ${i} directions-only`)
      }
    }
  })

  it('packs letter overflow as a continuous stacked stream', () => {
    const plan = planRecipeCard(gazpachoRecipe, { size: 'letter' })
    assert.ok(plan.pages.length >= 1)
    assert.equal(plan.strategy, 'stacked')
    // Should not leave an ingredients-only front when directions exist and room remains
    // on later pages — continuous stream may still start with ings-heavy pages, but
    // every page should be stacked mode.
    for (const page of plan.pages) {
      assert.equal(page.mode, 'stacked')
    }
    assertPlanPreservesContent(gazpachoRecipe, plan)
  })

  it('caps output at MAX_CARD_PAGES', () => {
    const plan = planRecipeCard(longDirectionsRecipe, { size: '4x6' })
    assert.equal(plan.pages.length, MAX_CARD_PAGES)
  })

  it('returns empty stacked page for blank recipe', () => {
    const plan = planRecipeCard({ title: 'Empty' }, { size: '4x6' })
    assert.equal(plan.pages.length, 1)
    assert.deepEqual(plan.pages[0].ingredients, [])
    assert.deepEqual(plan.pages[0].instructions, [])
  })
})

describe('sectionHeadingOnPage', () => {
  it('shows each section heading only on the first page that contains it', () => {
    const plan = planRecipeCard(gazpachoRecipe, { size: '4x6' })
    const firstIng = firstPageWith(plan, 'ingredients')
    const firstDir = firstPageWith(plan, 'instructions')

    assert.ok(firstIng >= 0)
    assert.ok(firstDir >= 0)

    for (let i = 0; i < plan.pages.length; i += 1) {
      const expectIng = i === firstIng && plan.pages[i].ingredients.length > 0
      const expectDir = i === firstDir && plan.pages[i].instructions.length > 0
      assert.equal(sectionHeadingOnPage(plan, i, 'ingredients'), expectIng, `ing heading page ${i}`)
      assert.equal(sectionHeadingOnPage(plan, i, 'directions'), expectDir, `dir heading page ${i}`)
    }
  })

  it('shows both headings on a single-page split card', () => {
    const plan = planRecipeCard(shortRecipe, { size: '4x6' })
    assert.equal(sectionHeadingOnPage(plan, 0, 'ingredients'), true)
    assert.equal(sectionHeadingOnPage(plan, 0, 'directions'), true)
  })
})

describe('print helpers', () => {
  it('labels two-page cards as Front / Back', () => {
    assert.equal(getPageChipLabel(0, 2), 'Front')
    assert.equal(getPageChipLabel(1, 2), 'Back')
    assert.equal(getPageFooterTag(1, 2), 'Side 2 of 2')
  })

  it('packs 4×6 faces two per letter sheet', () => {
    assert.equal(facesPerLetterSheet('4x6'), 2)
    assert.deepEqual(packPageIndexes(3, '4x6'), [[0, 1], [2]])
    assert.deepEqual(packPageIndexes(1, 'letter'), [[0]])
  })

  it('uses split mode for landscape sizes only', () => {
    assert.equal(singlePageMode('4x6'), 'split')
    assert.equal(singlePageMode('letter'), 'stacked')
  })
})
