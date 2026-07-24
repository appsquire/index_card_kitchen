import { Link } from 'react-router-dom'
import { Clock, Users } from 'lucide-react'

function tiltFromId(id) {
  const s = String(id || 'x')
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0
  const tilts = [-2.4, -1.5, -0.7, 0.5, 1.3, 2.2]
  return tilts[Math.abs(h) % tilts.length]
}

function tabColorFromId(id) {
  const colors = ['#c23b3b', '#4f7a5c', '#d4b44a', '#6f9a8c', '#8f2a2a']
  const s = String(id || 'x')
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h * 17 + s.charCodeAt(i)) | 0
  return colors[Math.abs(h) % colors.length]
}

export default function RecipeCard({ recipe }) {
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0)
  const tilt = tiltFromId(recipe.id)
  const tab = tabColorFromId(recipe.id)
  const category = recipe.categoryNames?.[0]

  return (
    <Link
      to={`/recipe/${recipe.id}`}
      className="recipe-box-card group"
      style={{ '--tilt': `${tilt}deg`, '--tab': tab }}
    >
      <span className="recipe-box-card__tab" aria-hidden>
        {category ? category.slice(0, 10) : 'Recipe'}
      </span>

      <article className="recipe-box-card__face">
        <div className="recipe-box-card__photo">
          {recipe.imageUrl ? (
            <img src={recipe.imageUrl} alt="" className="recipe-box-card__img" />
          ) : (
            <div className="recipe-box-card__lines" aria-hidden>
              <span />
              <span />
              <span />
            </div>
          )}
        </div>

        <div className="recipe-box-card__body">
          <p className="recipe-box-card__label">From the box</p>
          <h3 className="recipe-box-card__title">{recipe.title}</h3>

          {(totalTime > 0 || recipe.servings) && (
            <div className="recipe-box-card__meta">
              {totalTime > 0 && (
                <span>
                  <Clock className="w-3.5 h-3.5" />
                  {totalTime} min
                </span>
              )}
              {recipe.servings && (
                <span>
                  <Users className="w-3.5 h-3.5" />
                  {recipe.servings}
                </span>
              )}
            </div>
          )}
        </div>
      </article>
    </Link>
  )
}
