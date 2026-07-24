import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRecipes } from '../context/RecipeContext'
import { BookOpen, Plus, LogIn, LogOut, User, FolderOpen, Cloud } from 'lucide-react'

export default function Layout() {
  const { user, isAuthenticated, logout } = useAuth()
  const { syncing } = useRecipes()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white border-b border-brown-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 text-brown-800 hover:text-rust transition-colors">
              <BookOpen className="w-8 h-8" />
              <span className="text-xl font-serif font-bold">RecipeBox</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link
                to="/recipe/new"
                className="flex items-center gap-1 text-brown-600 hover:text-rust transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Recipe
              </Link>
              <Link
                to="/recipe/import"
                className="text-brown-600 hover:text-rust transition-colors"
              >
                Import from URL
              </Link>
              <Link
                to="/categories"
                className="flex items-center gap-1 text-brown-600 hover:text-rust transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
                Categories
              </Link>
            </nav>

            {/* Auth Section */}
            <div className="flex items-center gap-4">
              {syncing && (
                <div className="flex items-center gap-1 text-sm text-brown-500">
                  <Cloud className="w-4 h-4 animate-pulse" />
                  Syncing...
                </div>
              )}

              {isAuthenticated ? (
                <div className="flex items-center gap-4">
                  <span className="hidden sm:flex items-center gap-1 text-sm text-brown-600">
                    <User className="w-4 h-4" />
                    {user?.name || user?.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 text-brown-600 hover:text-rust transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-1 btn-primary text-sm"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-brown-100">
          <div className="flex justify-around py-2">
            <Link
              to="/recipe/new"
              className="flex flex-col items-center text-xs text-brown-600"
            >
              <Plus className="w-5 h-5" />
              Add
            </Link>
            <Link
              to="/recipe/import"
              className="flex flex-col items-center text-xs text-brown-600"
            >
              <Cloud className="w-5 h-5" />
              Import
            </Link>
            <Link
              to="/categories"
              className="flex flex-col items-center text-xs text-brown-600"
            >
              <FolderOpen className="w-5 h-5" />
              Categories
            </Link>
          </div>
        </div>
      </header>

      {/* Sync Banner (for non-authenticated users) */}
      {!isAuthenticated && (
        <div className="bg-brown-50 border-b border-brown-200 px-4 py-2 text-center text-sm text-brown-700">
          Your recipes are stored locally.{' '}
          <Link to="/register" className="text-rust hover:underline font-medium">
            Create an account
          </Link>{' '}
          to sync across devices.
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-brown-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-brown-500">
            RecipeBox - Save your favorite recipes with style
          </p>
        </div>
      </footer>
    </div>
  )
}
