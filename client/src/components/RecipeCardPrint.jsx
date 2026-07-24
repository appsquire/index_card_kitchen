import { useMemo } from 'react'

const SIZE_STYLES = {
  '4x6': { width: '6in', height: '4in', className: 'text-[10.5px]' },
  '5x7': { width: '7in', height: '5in', className: 'text-[11.5px]' },
  letter: { width: '8.5in', height: '11in', className: 'text-[13px]' },
}

function formatIngredient(ing) {
  return [ing.amount, ing.unit, ing.name].filter(Boolean).join(' ')
}

function safeHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

export default function RecipeCardPrint({
  recipe,
  size = '4x6',
  style = 'lined',
  layout = 'split',
  side = 'front',
  className = '',
}) {
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0)
  const dims = SIZE_STYLES[size] || SIZE_STYLES['4x6']
  const source = recipe.sourceUrl ? safeHostname(recipe.sourceUrl) : null

  const ingredients = recipe.ingredients?.filter((i) => i?.name?.trim()) || []
  const instructions = recipe.instructions?.filter((i) => i?.step?.trim()) || []

  const { frontIngredients, frontInstructions, backIngredients, backInstructions, needsBack } =
    useMemo(() => {
      if (size === 'letter' || layout === 'stacked') {
        return {
          frontIngredients: ingredients,
          frontInstructions: instructions,
          backIngredients: [],
          backInstructions: [],
          needsBack: false,
        }
      }

      const ingLimit = size === '4x6' ? 10 : 14
      const stepLimit = size === '4x6' ? 6 : 8
      const overflow =
        ingredients.length > ingLimit || instructions.length > stepLimit

      if (!overflow) {
        return {
          frontIngredients: ingredients,
          frontInstructions: instructions,
          backIngredients: [],
          backInstructions: [],
          needsBack: false,
        }
      }

      return {
        frontIngredients: ingredients.slice(0, ingLimit),
        frontInstructions: instructions.slice(0, stepLimit),
        backIngredients: ingredients.slice(ingLimit),
        backInstructions: instructions.slice(stepLimit),
        needsBack: true,
      }
    }, [ingredients, instructions, size, layout])

  const showingBack = side === 'back' && needsBack
  const shownIngredients = showingBack ? backIngredients : frontIngredients
  const shownInstructions = showingBack ? backInstructions : frontInstructions

  const metaBits = [
    totalTime > 0 ? `${totalTime} min` : null,
    recipe.prepTime > 0 ? `prep ${recipe.prepTime}` : null,
    recipe.cookTime > 0 ? `cook ${recipe.cookTime}` : null,
    recipe.servings ? `serves ${recipe.servings}` : null,
  ].filter(Boolean)

  return (
    <article
      data-card-side={showingBack ? 'back' : 'front'}
      className={[
        'index-card',
        `index-card--${style}`,
        `index-card--${layout}`,
        dims.className,
        className,
      ].join(' ')}
      style={{ width: dims.width, height: dims.height }}
    >
      <div className="index-card__inner">
        <header className="index-card__header">
          <p className="index-card__eyebrow">
            {showingBack ? 'Continued…' : 'Recipe card'}
          </p>
          <h1 className="index-card__title">{recipe.title}</h1>
          {!showingBack && recipe.description && size !== '4x6' && (
            <p className="index-card__blurb">{recipe.description}</p>
          )}
          {!showingBack && metaBits.length > 0 && (
            <div className="index-card__meta">
              {metaBits.map((bit) => (
                <span key={bit}>{bit}</span>
              ))}
            </div>
          )}
        </header>

        <div className={`index-card__body index-card__body--${layout}`}>
          {shownIngredients.length > 0 && (
            <section className="index-card__section">
              <h2>Ingredients</h2>
              <ul>
                {shownIngredients.map((ing, idx) => (
                  <li key={idx}>
                    <span className="index-card__tick">□</span>
                    <span>{formatIngredient(ing)}</span>
                  </li>
                ))}
              </ul>
              {!showingBack && needsBack && ingredients.length > frontIngredients.length && (
                <p className="index-card__more">+ more on the back</p>
              )}
            </section>
          )}

          {shownInstructions.length > 0 && (
            <section className="index-card__section">
              <h2>Method</h2>
              <ol>
                {shownInstructions.map((inst, idx) => {
                  const number = showingBack
                    ? frontInstructions.length + idx + 1
                    : idx + 1
                  return (
                    <li key={idx}>
                      <span className="index-card__num">{number}</span>
                      <span>{inst.step}</span>
                    </li>
                  )
                })}
              </ol>
              {!showingBack && needsBack && instructions.length > frontInstructions.length && (
                <p className="index-card__more">+ more on the back</p>
              )}
            </section>
          )}

          {showingBack && shownIngredients.length === 0 && shownInstructions.length === 0 && (
            <p className="index-card__blurb">Nothing left for the back — this recipe fits up front.</p>
          )}
        </div>

        <footer className="index-card__footer">
          <span>{source ? `From ${source}` : 'Homemade'}</span>
          <span>Index Card Kitchen</span>
        </footer>
      </div>
    </article>
  )
}

export { SIZE_STYLES }
