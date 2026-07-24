import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, BookOpen } from 'lucide-react'
import { useRecipes } from '../context/RecipeContext'
import RecipeCard from '../components/RecipeCard'
import SearchBar from '../components/SearchBar'

export default function Home() {
  const { recipes, categories, loading } = useRecipes()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)

  // Enrich recipes with category names
  const enrichedRecipes = useMemo(() => {
    return recipes.map(recipe => ({
      ...recipe,
      categoryNames: recipe.categoryIds
        ?.map(id => categories.find(c => c.id === id)?.name)
        .filter(Boolean) || [],
    }))
  }, [recipes, categories])

  // Filter recipes based on search and category
  const filteredRecipes = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase()
    return enrichedRecipes.filter(recipe => {
      const matchesQuery = !searchQuery ||
        recipe.title.toLowerCase().includes(lowerQuery) ||
        recipe.description?.toLowerCase().includes(lowerQuery) ||
        recipe.ingredients?.some(ing =>
          ing.name?.toLowerCase().includes(lowerQuery)
        )

      const matchesCategory = !selectedCategory ||
        recipe.categoryIds?.includes(selectedCategory)

      return matchesQuery && matchesCategory
    })
  }, [enrichedRecipes, searchQuery, selectedCategory])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gingham border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="font-hand text-gingham text-lg mb-1">The recipe box</p>
          <h1 className="text-4xl sm:text-5xl text-wicker-900 leading-none">
            What&apos;s cooking
          </h1>
        </div>
        <Link to="/recipe/new" className="btn-primary flex items-center gap-2 justify-center">
          <Plus className="w-5 h-5" />
          Add Recipe
        </Link>
      </div>

      <SearchBar
        onSearch={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {filteredRecipes.length === 0 ? (
        <div className="text-center py-16 max-w-md mx-auto">
          {recipes.length === 0 ? (
            <>
              <div className="mx-auto mb-6 w-40 h-28 recipe-card animate-soft-settle flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-wicker-400" />
              </div>
              <h2 className="text-3xl text-wicker-800 mb-2">
                Empty box, for now
              </h2>
              <p className="text-wicker-600 mb-6 leading-relaxed">
                Save a Sunday supper, a cookie sheet miracle, or that casserole everyone asks for.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/recipe/new" className="btn-primary">
                  Write one by hand
                </Link>
                <Link to="/recipe/import" className="btn-secondary">
                  Bring one in from a link
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-3xl text-wicker-800 mb-2">
                Nothing in this drawer
              </h2>
              <p className="text-wicker-600">
                Try another search, or clear the filters.
              </p>
            </>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-wicker-500 mb-4">
            {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''}
            {searchQuery && ` matching "${searchQuery}"`}
            {selectedCategory && categories.find(c => c.id === selectedCategory) &&
              ` in ${categories.find(c => c.id === selectedCategory).name}`}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
