import { useState } from 'react'
import { Search, X, Filter } from 'lucide-react'
import { useRecipes } from '../context/RecipeContext'

export default function SearchBar({ onSearch, selectedCategory, onCategoryChange }) {
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const { categories } = useRecipes()

  const handleSubmit = (e) => {
    e.preventDefault()
    onSearch(query)
  }

  const handleClear = () => {
    setQuery('')
    onSearch('')
  }

  return (
    <div className="mb-6">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-wicker-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipes by title or ingredient..."
            className="input pl-10 pr-10"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-wicker-400 hover:text-wicker-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary flex items-center gap-1 ${showFilters ? 'bg-wicker-200' : ''}`}
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
        </button>
        <button type="submit" className="btn-primary">
          Search
        </button>
      </form>

      {/* Filter Panel */}
      {showFilters && (
        <div className="mt-4 p-4 bg-white rounded-lg border border-wicker-200">
          <h4 className="text-sm font-medium text-wicker-700 mb-3">Filter by Category</h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onCategoryChange(null)}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                !selectedCategory
                  ? 'bg-gingham text-white'
                  : 'bg-wicker-100 text-wicker-600 hover:bg-wicker-200'
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-gingham text-white'
                    : 'bg-wicker-100 text-wicker-600 hover:bg-wicker-200'
                }`}
                style={
                  selectedCategory === category.id
                    ? {}
                    : { borderLeft: `3px solid ${category.color || '#B08C5C'}` }
                }
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
