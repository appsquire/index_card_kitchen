import { useMemo } from 'react'
import {
  planRecipeCard,
  getPageChipLabel,
  getPageFooterTag,
  facesPerLetterSheet,
  packPageIndexes,
  SIZE_STYLES,
  MAX_CARD_PAGES,
  pageBodyLayout,
  sectionHeadingOnPage,
} from '@shared/cardPlan.js'

export {
  planRecipeCard,
  getPageChipLabel,
  getPageFooterTag,
  facesPerLetterSheet,
  packPageIndexes,
  SIZE_STYLES,
  MAX_CARD_PAGES,
  pageBodyLayout,
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
  // Only show the amount column when there is a real quantity.
  // Scraper note-rows often put labels ("Instead", "Whiz") in `unit` with empty amount.
  if (!qty) return ''
  return [qty, ing?.unit].filter(Boolean).join(' ')
}

/** Ingredient name, merging label-units when there is no quantity. */
export function formatIngredientName(ing) {
  const qty = formatQuantity(ing?.amount)
  const unit = ing?.unit ? String(ing.unit).trim() : ''
  const name = ing?.name ? String(ing.name).trim() : ''
  if (!qty && unit) return [unit, name].filter(Boolean).join(' ')
  return name
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

export default function RecipeCardPrint({
  recipe,
  size = '4x6',
  style = 'lined',
  pageIndex = 0,
  className = '',
  largeText = false,
  plan: planProp,
}) {
  const dims = SIZE_STYLES[size] || SIZE_STYLES['4x6']
  const source = recipe.sourceUrl ? safeHostname(recipe.sourceUrl) : null

  const plan = useMemo(
    () => planProp || planRecipeCard(recipe, { size }),
    [planProp, recipe, size]
  )

  const totalPages = plan.pages?.length || 1
  const safeIndex = Math.min(Math.max(0, pageIndex), totalPages - 1)
  const page = plan.pages[safeIndex] || { mode: 'stacked', ingredients: [], instructions: [] }
  const shownIngredients = page.ingredients || []
  const shownInstructions = page.instructions || []
  const isContinuation = safeIndex > 0

  const stepOffset = (plan.pages || [])
    .slice(0, safeIndex)
    .reduce((n, p) => n + (p.instructions?.length || 0), 0)

  const bodyLayout = pageBodyLayout(page, plan)
  const showCardHeader = safeIndex === 0
  const showIngHeading =
    shownIngredients.length > 0 && sectionHeadingOnPage(plan, safeIndex, 'ingredients')
  const showDirHeading =
    shownInstructions.length > 0 && sectionHeadingOnPage(plan, safeIndex, 'directions')

  const metaBits = [
    recipe.servings ? `Serves: ${recipe.servings}` : null,
    recipe.prepTime ? `Prep time: ${formatMinutes(recipe.prepTime)}` : null,
    recipe.cookTime ? `Cook time: ${formatMinutes(recipe.cookTime)}` : null,
  ].filter(Boolean)

  const title = (recipe.title || 'Untitled recipe').toUpperCase()
  const footerTag = getPageFooterTag(safeIndex, totalPages)

  return (
    <article
      className={[
        'recipe-index-card',
        STYLE_CLASS[style] || STYLE_CLASS.lined,
        SIZE_CLASS[size] || SIZE_CLASS['4x6'],
        LAYOUT_CLASS[bodyLayout] || LAYOUT_CLASS.split,
        isContinuation ? 'recipe-index-card--back' : 'recipe-index-card--front',
        isContinuation ? 'recipe-index-card--continuation' : '',
        largeText ? 'recipe-index-card--large-text' : '',
        className,
      ].join(' ')}
      style={{ width: dims.width, height: dims.height }}
      data-page-index={safeIndex}
    >
      <div className="recipe-index-card__frame">
        {showCardHeader && (
          <header className="recipe-index-card__header">
            <p className="recipe-index-card__wordmark">Recipe</p>
            <div className="recipe-index-card__heading">
              <h1 className="recipe-index-card__title">{title}</h1>
              {metaBits.length > 0 && (
                <p className="recipe-index-card__meta">
                  {metaBits.map((bit, i) => (
                    <span key={bit}>
                      {i > 0 && (
                        <span className="recipe-index-card__meta-sep" aria-hidden>
                          |
                        </span>
                      )}
                      {bit}
                    </span>
                  ))}
                </p>
              )}
            </div>
          </header>
        )}

        <div
          className={`recipe-index-card__body ${
            BODY_LAYOUT_CLASS[bodyLayout] || BODY_LAYOUT_CLASS.split
          }`}
        >
          {bodyLayout === 'split' ? (
            <>
              <div className="recipe-index-card__pane">
                {shownIngredients.length > 0 && (
                  <section className="recipe-index-card__block recipe-index-card__block--ingredients">
                    {showIngHeading && <h2>Ingredients</h2>}
                    <ul>
                      {shownIngredients.map((ing, idx) => {
                        const amount = formatAmount(ing)
                        return (
                          <li
                            key={idx}
                            className={amount ? undefined : 'recipe-index-card__ing--full'}
                          >
                            {amount ? (
                              <span className="recipe-index-card__amt">{amount}</span>
                            ) : null}
                            <span className="recipe-index-card__iname">
                              {formatIngredientName(ing)}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )}
              </div>
              <div className="recipe-index-card__pane">
                {shownInstructions.length > 0 && (
                  <section className="recipe-index-card__block recipe-index-card__block--directions">
                    {showDirHeading && <h2>Directions</h2>}
                    <ol>
                      {shownInstructions.map((inst, idx) => {
                        const n = stepOffset + idx + 1
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
              </div>
            </>
          ) : (
            <>
              {shownIngredients.length > 0 && (
                <section className="recipe-index-card__block recipe-index-card__block--ingredients">
                  {showIngHeading && <h2>Ingredients</h2>}
                  <ul>
                    {shownIngredients.map((ing, idx) => {
                      const amount = formatAmount(ing)
                      return (
                        <li
                          key={idx}
                          className={amount ? undefined : 'recipe-index-card__ing--full'}
                        >
                          {amount ? (
                            <span className="recipe-index-card__amt">{amount}</span>
                          ) : null}
                          <span className="recipe-index-card__iname">
                            {formatIngredientName(ing)}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}
              {shownInstructions.length > 0 && (
                <section className="recipe-index-card__block recipe-index-card__block--directions">
                  {showDirHeading && <h2>Directions</h2>}
                  <ol>
                    {shownInstructions.map((inst, idx) => {
                      const n = stepOffset + idx + 1
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
            </>
          )}
        </div>

        <footer className="recipe-index-card__footer">
          <span>
            {source
              ? `From the kitchen · ${source}`
              : 'From the kitchen · Index Card Kitchen'}
          </span>
          {footerTag && (
            <span className="recipe-index-card__side-tag">{footerTag}</span>
          )}
        </footer>
      </div>
    </article>
  )
}
