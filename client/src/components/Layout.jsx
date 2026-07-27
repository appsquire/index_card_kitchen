import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRecipes } from '../context/RecipeContext'
import { copyrightNotice } from '../data/legal'
import { Plus, LogIn, LogOut, User, FolderOpen, Cloud } from 'lucide-react'

export default function Layout() {
  const { user, isAuthenticated, logout } = useAuth()
  const { syncing } = useRecipes()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="kitchen-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-[4.25rem]">
            <Link to="/" className="flex items-center gap-3 group">
              <span
                className="hidden sm:flex h-10 w-8 items-center justify-center bg-butter-light border border-wicker-200 text-gingham font-hand text-lg shadow-paper rotate-[-4deg] group-hover:rotate-[-1deg] transition-transform"
                aria-hidden
              >
                ♥
              </span>
              <span className="brand-mark group-hover:text-gingham transition-colors">
                Index Card Kitchen
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 font-semibold text-wicker-700">
              <Link
                to="/recipe/new"
                className="flex items-center gap-1 hover:text-gingham transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add recipe
              </Link>
              <Link
                to="/categories"
                className="flex items-center gap-1 hover:text-gingham transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
                Categories
              </Link>
            </nav>

            <div className="flex items-center gap-4">
              {syncing && (
                <div className="flex items-center gap-1 text-sm text-wicker-600">
                  <Cloud className="w-4 h-4 animate-pulse" />
                  Syncing...
                </div>
              )}

              {isAuthenticated ? (
                <div className="flex items-center gap-4">
                  <span className="hidden sm:flex items-center gap-1 text-sm text-wicker-600">
                    <User className="w-4 h-4" />
                    {user?.name || user?.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 text-wicker-600 hover:text-gingham transition-colors font-semibold"
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

        <div className="md:hidden border-t border-wicker-100 bg-enamel/80">
          <div className="flex justify-around py-2">
            <Link
              to="/recipe/new"
              className="flex flex-col items-center text-xs text-wicker-600 font-semibold"
            >
              <Plus className="w-5 h-5" />
              Add
            </Link>
            <Link
              to="/categories"
              className="flex flex-col items-center text-xs text-wicker-600 font-semibold"
            >
              <FolderOpen className="w-5 h-5" />
              Categories
            </Link>
          </div>
        </div>
      </header>

      {!isAuthenticated && (
        <div className="bg-butter-light/80 border-b border-butter-dark/30 px-4 py-2.5 text-center text-sm text-wicker-800">
          <span className="hidden sm:inline">
            Your recipes live in this browser only — clear your data and they're gone.{' '}
          </span>
          <span className="sm:hidden">
            Recipes are stored locally only.{' '}
          </span>
          <Link to="/register" className="text-gingham hover:underline font-bold">
            Create a free account
          </Link>{' '}
          to keep them safe and access anywhere.
        </div>
      )}

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-up">
        <Outlet />
      </main>

      <footer className="site-footer mt-auto">
        <div className="site-footer__inner">
          <p className="site-footer__tagline">
            Index Card Kitchen — come hungry, leave with a card
          </p>

          <p className="site-footer__legal">
            <Link to="/terms">Terms</Link>
            <span aria-hidden> · </span>
            <Link to="/privacy">Privacy</Link>
          </p>

          <div className="site-footer__rule" aria-hidden />

          <a
            href="https://www.appsquire.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="site-footer__credit group"
            aria-label="Built by AppSquire — visit appsquire.com"
          >
            <span className="site-footer__stamp" aria-hidden>
              Launch Lab
            </span>
            <span className="site-footer__logo-mark" aria-hidden>
              as
            </span>
            <span className="site-footer__credit-text">
              <span className="site-footer__credit-lead">Filed &amp; built by</span>
              <span className="site-footer__credit-brand">
                <span className="site-footer__credit-name">appsquire</span>
                <span className="site-footer__credit-consulting">consulting</span>
              </span>
              <span className="site-footer__credit-meta">Edmonton, AB · Custom software</span>
            </span>
            <span className="site-footer__credit-arrow" aria-hidden>
              →
            </span>
          </a>

          <p className="site-footer__copyright">{copyrightNotice()}</p>
        </div>
      </footer>
    </div>
  )
}
