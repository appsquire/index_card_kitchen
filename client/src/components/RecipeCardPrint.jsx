import { useMemo } from 'react'

/** Landscape recipe-box cards; letter stays portrait full page */
const SIZE_STYLES = {
  '4x6': { width: '6in', height: '4in' },
  '5x7': { width: '7in', height: '5in' },
  letter: { width: '8.5in', height: '11in' },
}

const STYLE_CLASS = {
  lined: 'recipe-index-card--lined',
  butter: 'recipe-index-card--butter',
  enamel: 'recipe-index-card--enamel',
}

const SIZE_CLASS = {
  '4x6': 'recipe-index-card--4x6',
  '5x7': 'recipe-index-card--5x7',
  letter: 'recipe-index-card--letter',
}

const LAYOUT_CLASS = {
  stacked: 'recipe-index-card--stacked',
  split: 'recipe-index-card--split',
}

const BODY_LAYOUT_CLASS = {
  stacked: 'recipe-index-card__body--stacked',
  split: 'recipe-index-card__body--split',
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

/** Turn scraped floats like 0.666666686534888 into “⅔”. */
export function formatQuantity(value) {
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
  let frac = abs - whole

  if (frac < 0.02) {
    return `${sign}${whole}`
  }
  if (frac > 0.98) {
    return `${sign}${whole + 1}`
  }

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
  return `${sign}${Number.isInteger(rounded) ? rounded : String(rounded)}`
}

export function formatAmount(ing) {
  const qty = formatQuantity(ing?.amount)
  return [qty, ing?.unit].filter(Boolean).join(' ')
}

function safeHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function formatMinutes(n) {
  if (!n) return null
  return n >= 60 ? `${Math.floor(n / 60)}H${n % 60 ? ` ${n % 60}M` : ''}` : `${n}M`
}

/**
 * Decide what goes on the front vs back so content isn’t clipped.
 * Stacked cards: ingredients on front, directions on back (classic recipe box).
 * Split cards: fit what we can on front, continue on back.
 */
export function planRecipeCard(recipe, { size = '4x6', layout = 'split' } = {}) {
  const ingredients = recipe.ingredients?.filter((i) => i?.name?.trim()) || []
  const instructions = recipe.instructions?.filter((i) => i?.step?.trim()) || []

  if (size === 'letter') {
    const ingLimit = 28
    const stepLimit = 20
    const needsBack =
      ingredients.length > ingLimit || instructions.length > stepLimit
    return {
      needsBack,
      front: {
        ingredients: ingredients.slice(0, ingLimit),
        instructions: instructions.slice(0, stepLimit),
      },
      back: {
        ingredients: ingredients.slice(ingLimit),
        instructions: instructions.slice(stepLimit),
      },
      strategy: needsBack ? 'continue' : 'single',
    }
  }

  // Stacked landscape: classic double-sided card
  if (layout === 'stacked') {
    const ingLimit = size === '4x6' ? 8 : 12
    const frontIng = ingredients.slice(0, ingLimit)
    const backIng = ingredients.slice(ingLimit)
    const needsBack = instructions.length > 0 || backIng.length > 0

    return {
      needsBack,
      front: {
        ingredients: frontIng,
        instructions: [],
        note: needsBack ? 'Directions on back →' : null,
      },
      back: {
        ingredients: backIng,
        instructions,
      },
      strategy: 'ingredients-front',
    }
  }

  // Two-column: share the front, continue leftovers on back
  const ingLimit = size === '4x6' ? 7 : 11
  const stepLimit = size === '4x6' ? 5 : 8
  const frontIng = ingredients.slice(0, ingLimit)
  const frontSteps = instructions.slice(0, stepLimit)
  const backIng = ingredients.slice(ingLimit)
  const backSteps = instructions.slice(stepLimit)
  const needsBack = backIng.length > 0 || backSteps.length > 0

  return {
    needsBack,
    front: {
      ingredients: frontIng,
      instructions: frontSteps,
      note:
        needsBack && backSteps.length > 0
          ? '…continued on back'
          : needsBack
            ? '…more on back'
            : null,
    },
    back: {
      ingredients: backIng,
      instructions: backSteps,
    },
    strategy: 'continue',
  }
}

export default function RecipeCardPrint({
  recipe,
  size = '4x6',
  style = 'lined',
  layout = 'split',
  side = 'front',
  className = '',
  plan: planProp,
}) {
  const dims = SIZE_STYLES[size] || SIZE_STYLES['4x6']
  const source = recipe.sourceUrl ? safeHostname(recipe.sourceUrl) : null

  const plan = useMemo(
    () => planProp || planRecipeCard(recipe, { size, layout }),
    [planProp, recipe, size, layout]
  )

  const showingBack = side === 'back' && plan.needsBack
  const page = showingBack ? plan.back : plan.front
  const shownIngredients = page.ingredients || []
  const shownInstructions = page.instructions || []
  const continueNote = !showingBack ? page.note : null

  const frontStepCount = plan.front.instructions?.length || 0

  const metaBits = [
    recipe.servings ? `Serves: ${recipe.servings}` : null,
    recipe.prepTime ? `Prep time: ${formatMinutes(recipe.prepTime)}` : null,
    recipe.cookTime ? `Cook time: ${formatMinutes(recipe.cookTime)}` : null,
  ].filter(Boolean)

  const title = (recipe.title || 'Untitled recipe').toUpperCase()

  return (
    <article
      className={[
        'recipe-index-card',
        STYLE_CLASS[style] || STYLE_CLASS.lined,
        SIZE_CLASS[size] || SIZE_CLASS['4x6'],
        LAYOUT_CLASS[layout] || LAYOUT_CLASS.split,
        showingBack ? 'recipe-index-card--back' : 'recipe-index-card--front',
        className,
      ].join(' ')}
      style={{ width: dims.width, height: dims.height }}
    >
      <div className="recipe-index-card__frame">
        <header className="recipe-index-card__header">
          <p className="recipe-index-card__wordmark">
            {showingBack ? 'Back' : 'Recipe'}
          </p>
          <div className="recipe-index-card__heading">
            <h1 className="recipe-index-card__title">{title}</h1>
            {!showingBack && metaBits.length > 0 && (
              <p className="recipe-index-card__meta">
                {metaBits.map((bit, i) => (
                  <span key={bit}>
                    {i > 0 && <span className="recipe-index-card__meta-sep" aria-hidden>|</span>}
                    {bit}
                  </span>
                ))}
              </p>
            )}
            {showingBack && (
              <p className="recipe-index-card__meta">Continued from front</p>
            )}
          </div>
        </header>

        <div
          className={`recipe-index-card__body ${
            // Back of a stacked card is usually directions-only — still use stacked
            BODY_LAYOUT_CLASS[
              showingBack && plan.strategy === 'ingredients-front'
                ? 'stacked'
                : layout
            ] || BODY_LAYOUT_CLASS.split
          }`}
        >
          {shownIngredients.length > 0 && (
            <section className="recipe-index-card__block recipe-index-card__block--ingredients">
              <h2>{showingBack && shownInstructions.length ? 'More ingredients' : 'Ingredients'}</h2>
              <ul>
                {shownIngredients.map((ing, idx) => {
                  const amount = formatAmount(ing)
                  return (
                    <li
                      key={idx}
                      className={amount ? undefined : 'recipe-index-card__ing--full'}
                    >
                      {amount ? <span className="recipe-index-card__amt">{amount}</span> : null}
                      <span className="recipe-index-card__iname">{ing.name}</span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {shownInstructions.length > 0 && (
            <section className="recipe-index-card__block recipe-index-card__block--directions">
              <h2>Directions</h2>
              <ol>
                {shownInstructions.map((inst, idx) => {
                  const n = showingBack ? frontStepCount + idx + 1 : idx + 1
                  return (
                    <li key={idx}>
                      <span className="recipe-index-card__num">{n}</span>
                      <span className="recipe-index-card__step">{inst.step}</span>
                    </li>
                  )
                })}
              </ol>
            </section>
          )}

          {continueNote && (
            <p className="recipe-index-card__cont recipe-index-card__cont--banner">
              {continueNote}
            </p>
          )}
        </div>

        <footer className="recipe-index-card__footer">
          <span>
            {source
              ? `From the kitchen · ${source}`
              : 'From the kitchen · Index Card Kitchen'}
          </span>
          {plan.needsBack && (
            <span className="recipe-index-card__side-tag">
              {showingBack ? 'Side 2 of 2' : 'Side 1 of 2'}
            </span>
          )}
        </footer>
      </div>
    </article>
  )
}

export { SIZE_STYLES }
