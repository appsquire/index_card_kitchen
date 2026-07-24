import { Link } from 'react-router-dom'
import { Clock, Users } from 'lucide-react'

export default function RecipeCard({ recipe }) {
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0)

  return (
    <Link to={`/recipe/${recipe.id}`} className="block">
      <article className="card card-hover overflow-hidden group">
        {/* Image */}
        <div className="aspect-video -mx-6 -mt-6 mb-4 overflow-hidden bg-wicker-100">
          {recipe.imageUrl ? (
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-wicker-300">
              <svg
                className="w-16 h-16"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Content */}
        <h3 className="text-lg font-serif font-semibold text-wicker-800 group-hover:text-gingham transition-colors line-clamp-2">
          {recipe.title}
        </h3>

        {recipe.description && (
          <p className="mt-2 text-sm text-wicker-600 line-clamp-2">
            {recipe.description}
          </p>
        )}

        {/* Meta info */}
        <div className="mt-4 flex items-center gap-4 text-sm text-wicker-500">
          {totalTime > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {totalTime} min
            </span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {recipe.servings} servings
            </span>
          )}
        </div>

        {/* Categories */}
        {recipe.categoryIds?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {recipe.categoryNames?.slice(0, 3).map((name, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 text-xs bg-wicker-100 text-wicker-600 rounded-full"
              >
                {name}
              </span>
            ))}
          </div>
        )}
      </article>
    </Link>
  )
}
