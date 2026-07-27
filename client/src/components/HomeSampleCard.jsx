import { useMemo } from 'react'
import { Smartphone } from 'lucide-react'
import RecipeCardPrint, { planRecipeCard } from './RecipeCardPrint'
import { SAMPLE_RECIPE } from '../data/sampleRecipe'

export default function HomeSampleCard({ onViewSample, compact = false }) {
  const plan = useMemo(() => planRecipeCard(SAMPLE_RECIPE, { size: '4x6' }), [])

  return (
    <div className={`home-sample-card${compact ? ' home-sample-card--compact' : ''}`}>
      <p className="home-sample-card__label font-hand text-gingham">
        {compact ? 'Sample card' : 'See what your cards look like'}
      </p>

      <button
        type="button"
        className="home-sample-card__preview"
        onClick={onViewSample}
        aria-label="View sample recipe card — Easy Gazpacho"
      >
        <div className="home-sample-card__frame">
          <RecipeCardPrint
            recipe={SAMPLE_RECIPE}
            size="4x6"
            style="enamel"
            pageIndex={0}
            plan={plan}
          />
        </div>
        <span className="home-sample-card__tap">Tap to open</span>
      </button>

      {!compact && (
        <button type="button" className="home-sample-card__cta btn-secondary" onClick={onViewSample}>
          <Smartphone className="w-4 h-4" aria-hidden />
          View sample on your phone
        </button>
      )}
    </div>
  )
}
