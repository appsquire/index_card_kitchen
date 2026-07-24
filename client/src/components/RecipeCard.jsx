import { Link } from 'react-router-dom'
import { Clock, Users } from 'lucide-react'

export default function RecipeCard({ recipe }) {
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0)

  return (
    <Link to={`/recipe/${recipe.id}`} className="block group animate-fade-up">
      <article className="card card-hover overflow-hidden p-0 border-2 border-wicker-200">
        <div className="index-thumb aspect-[4/3] -rotate-[0.4deg] group-hover:rotate-0 transition-transform duration-300">
          {recipe.imageUrl ? (
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              className="w-full h-full object-cover mix-blend-multiply opacity-95"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center px-6">
              <p className="font-hand text-2xl text-center text-wicker-500 leading-tight">
                {recipe.title}
              </p>
            </div>
          )}
        </div>

        <div className="p-5">
          <h3 className="font-hand text-2xl text-wicker-900 group-hover:text-gingham transition-colors line-clamp-2 leading-tight">
            {recipe.title}
          </h3>

          {recipe.description && (
            <p className="mt-2 text-sm text-wicker-600 line-clamp-2 leading-relaxed">
              {recipe.description}
            </p>
          )}

          <div className="mt-4 flex items-center gap-4 text-sm text-wicker-500 font-semibold">
            {totalTime > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {totalTime} min
              </span>
            )}
            {recipe.servings && (
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                Serves {recipe.servings}
              </span>
            )}
          </div>

          {recipe.categoryIds?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {recipe.categoryNames?.slice(0, 3).map((name, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 text-xs font-semibold bg-herb-light text-herb-dark border border-herb/20 rounded-sm"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      </article>
    </Link>
  )
}
