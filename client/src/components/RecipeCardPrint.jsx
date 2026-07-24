import { Clock, Users, ExternalLink } from 'lucide-react'

export default function RecipeCardPrint({ recipe, size = 'full' }) {
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0)

  const formatIngredient = (ing) => {
    const parts = [ing.amount, ing.unit, ing.name].filter(Boolean)
    return parts.join(' ')
  }

  // Full page recipe card
  if (size === 'full') {
    return (
      <div className="recipe-card max-w-2xl mx-auto print:max-w-none print:mx-0">
        {/* Header with vintage border */}
        <div className="border-b-2 border-brown-300 pb-4 mb-6">
          <h1 className="font-serif text-3xl text-brown-800 text-center">
            {recipe.title}
          </h1>

          {recipe.description && (
            <p className="mt-2 text-center text-brown-600 italic">
              {recipe.description}
            </p>
          )}

          {/* Meta info */}
          <div className="mt-4 flex justify-center gap-6 text-sm text-brown-600">
            {totalTime > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {totalTime} minutes
              </span>
            )}
            {recipe.servings && (
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                Serves {recipe.servings}
              </span>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Ingredients */}
          <div>
            <h2 className="font-serif text-xl text-brown-800 border-b border-brown-200 pb-1 mb-4">
              Ingredients
            </h2>
            <ul className="space-y-2">
              {recipe.ingredients?.map((ing, idx) => (
                <li key={idx} className="flex items-start gap-2 text-brown-700">
                  <span className="text-rust">•</span>
                  <span>{formatIngredient(ing)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          <div>
            <h2 className="font-serif text-xl text-brown-800 border-b border-brown-200 pb-1 mb-4">
              Instructions
            </h2>
            <ol className="space-y-4">
              {recipe.instructions?.map((inst, idx) => (
                <li key={idx} className="flex gap-3 text-brown-700">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-rust text-white flex items-center justify-center text-sm">
                    {idx + 1}
                  </span>
                  <span>{inst.step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Source attribution */}
        {recipe.sourceUrl && (
          <div className="mt-8 pt-4 border-t border-brown-200 text-center text-sm text-brown-500">
            <span className="flex items-center justify-center gap-1">
              <ExternalLink className="w-3 h-3" />
              Source: {new URL(recipe.sourceUrl).hostname}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 text-center text-xs text-brown-400">
          RecipeBox
        </div>
      </div>
    )
  }

  // Index card style (4x6)
  return (
    <div
      className="recipe-card"
      style={{
        width: '6in',
        minHeight: '4in',
        fontSize: '10pt',
        padding: '0.5in',
      }}
    >
      <h1 className="font-serif text-lg text-brown-800 border-b border-brown-300 pb-1 mb-2">
        {recipe.title}
      </h1>

      <div className="flex gap-4 text-xs text-brown-500 mb-3">
        {totalTime > 0 && <span>{totalTime} min</span>}
        {recipe.servings && <span>Serves {recipe.servings}</span>}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <h3 className="font-semibold text-brown-700 mb-1">Ingredients</h3>
          <ul className="space-y-0.5">
            {recipe.ingredients?.slice(0, 12).map((ing, idx) => (
              <li key={idx} className="text-brown-600 text-xs">
                • {formatIngredient(ing)}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-brown-700 mb-1">Instructions</h3>
          <ol className="space-y-1">
            {recipe.instructions?.slice(0, 8).map((inst, idx) => (
              <li key={idx} className="text-brown-600 text-xs">
                {idx + 1}. {inst.step.slice(0, 100)}
                {inst.step.length > 100 ? '...' : ''}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {recipe.sourceUrl && (
        <div className="absolute bottom-2 right-4 text-xs text-brown-400">
          {new URL(recipe.sourceUrl).hostname}
        </div>
      )}
    </div>
  )
}
