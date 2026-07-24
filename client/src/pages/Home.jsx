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
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-rust border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-serif font-bold text-brown-800">
          My Recipes
        </h1>
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
        <div className="text-center py-16">
          {recipes.length === 0 ? (
            <>
              <BookOpen className="w-16 h-16 mx-auto text-brown-300 mb-4" />
              <h2 className="text-xl font-serif text-brown-700 mb-2">
                No recipes yet
              </h2>
              <p className="text-brown-500 mb-6">
                Start building your recipe collection
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/recipe/new" className="btn-primary">
                  Add Manual Recipe
                </Link>
                <Link to="/recipe/import" className="btn-secondary">
                  Import from URL
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-serif text-brown-700 mb-2">
                No recipes found
              </h2>
              <p className="text-brown-500">
                Try adjusting your search or filters
              </p>
            </>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-brown-500 mb-4">
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
