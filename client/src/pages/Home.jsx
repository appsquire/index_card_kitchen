import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Link as LinkIcon, PenLine, Printer, Search } from 'lucide-react'
import { useRecipes } from '../context/RecipeContext'
import RecipeCard from '../components/RecipeCard'
import SearchBar from '../components/SearchBar'

const STEPS = [
  {
    icon: PenLine,
    title: 'Drop it in',
    text: 'Write a recipe by hand, or paste a link and we’ll pull the details.',
  },
  {
    icon: Printer,
    title: 'Make the card',
    text: 'Pick a size and paper, print it, or keep it digital in the box.',
  },
  {
    icon: Search,
    title: 'Find it fast',
    text: 'Search by name, ingredient, or category when supper panic hits.',
  },
]

export default function Home() {
  const { recipes, categories, loading } = useRecipes()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)

  const enrichedRecipes = useMemo(() => {
    return recipes.map((recipe) => ({
      ...recipe,
      categoryNames:
        recipe.categoryIds
          ?.map((id) => categories.find((c) => c.id === id)?.name)
          .filter(Boolean) || [],
    }))
  }, [recipes, categories])

  const filteredRecipes = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase()
    return enrichedRecipes.filter((recipe) => {
      const matchesQuery =
        !searchQuery ||
        recipe.title.toLowerCase().includes(lowerQuery) ||
        recipe.description?.toLowerCase().includes(lowerQuery) ||
        recipe.ingredients?.some((ing) => ing.name?.toLowerCase().includes(lowerQuery))

      const matchesCategory =
        !selectedCategory || recipe.categoryIds?.includes(selectedCategory)

      return matchesQuery && matchesCategory
    })
  }, [enrichedRecipes, searchQuery, selectedCategory])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gingham border-t-transparent" />
      </div>
    )
  }

  const isEmpty = recipes.length === 0
  const noMatches = !isEmpty && filteredRecipes.length === 0

  return (
    <div className="home">
      <section className="home-intro">
        <div className="home-intro__copy">
          <p className="font-hand text-gingham text-xl mb-1">Index Card Kitchen</p>
          <h1 className="home-intro__title">
            Your recipes, filed like Nana kept them
          </h1>
          <p className="home-intro__lede">
            A digital recipe box for the cards that matter — import from the web,
            scribble your own, and pull them out when it’s time to cook.
          </p>
          <div className="home-intro__actions">
            <Link to="/recipe/new" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add to recipe box
            </Link>
            <Link
              to="/recipe/new?mode=link"
              className="btn-secondary inline-flex items-center gap-2"
            >
              <LinkIcon className="w-4 h-4" />
              Paste a link
            </Link>
          </div>
        </div>

        <ol className="home-steps">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <li key={step.title} className="home-steps__item">
                <span className="home-steps__num" aria-hidden>
                  {i + 1}
                </span>
                <Icon className="home-steps__icon" aria-hidden />
                <div>
                  <h2>{step.title}</h2>
                  <p>{step.text}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      <section className="recipe-box" aria-label="Your recipe box">
        <div className="recipe-box__lid">
          <span className="recipe-box__brand">Recipes</span>
          <span className="recipe-box__count">
            {isEmpty
              ? 'Empty for now'
              : `${filteredRecipes.length} card${filteredRecipes.length === 1 ? '' : 's'}${
                  searchQuery || selectedCategory ? ' showing' : ' in the box'
                }`}
          </span>
        </div>

        <div className="recipe-box__well">
          {!isEmpty && (
            <div className="recipe-box__tools">
              <SearchBar
                onSearch={setSearchQuery}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />
            </div>
          )}

          {isEmpty ? (
            <div className="recipe-box__empty">
              <div className="recipe-box__empty-cards" aria-hidden>
                <div className="recipe-box__ghost rotate-[-6deg]" />
                <div className="recipe-box__ghost rotate-[3deg]" />
                <div className="recipe-box__ghost rotate-[-1deg]" />
              </div>
              <h2 className="font-hand text-3xl text-enamel mb-2">Open box, empty slots</h2>
              <p className="text-butter-light/90 max-w-md mx-auto mb-6 leading-relaxed">
                First card’s the hardest. File a family favorite or pull one in from a link —
                it’ll show up here like it belongs in a wooden box on the counter.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/recipe/new" className="btn-primary inline-flex items-center justify-center gap-2">
                  <PenLine className="w-4 h-4" />
                  Write one by hand
                </Link>
                <Link
                  to="/recipe/new?mode=link"
                  className="btn-secondary inline-flex items-center justify-center gap-2"
                >
                  <LinkIcon className="w-4 h-4" />
                  From a link
                </Link>
              </div>
            </div>
          ) : noMatches ? (
            <div className="recipe-box__empty recipe-box__empty--soft">
              <h2 className="font-hand text-3xl text-enamel mb-2">Nothing in this drawer</h2>
              <p className="text-butter-light/90">Try another search, or clear the filters.</p>
            </div>
          ) : (
            <div className="recipe-box__grid">
              {filteredRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
              <Link to="/recipe/new" className="recipe-box-card recipe-box-card--add">
                <span className="recipe-box-card__tab" aria-hidden>
                  New
                </span>
                <article className="recipe-box-card__face recipe-box-card__face--add">
                  <Plus className="w-8 h-8 text-gingham mb-2" />
                  <p className="font-hand text-2xl text-wicker-800 leading-none">Add a card</p>
                  <p className="text-sm text-wicker-600 mt-2">Handwritten or from a link</p>
                </article>
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
