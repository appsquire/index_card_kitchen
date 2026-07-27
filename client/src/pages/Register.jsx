import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Mail, Lock, AlertCircle, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useRecipes } from '../context/RecipeContext'

export default function Register() {
  const navigate = useNavigate()
  const { register, isAuthenticated } = useAuth()
  const { recipes } = useRecipes()
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const localRecipeCount = recipes.length

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const data = new FormData(form)
    const name = String(data.get('name') || formData.name || '').trim()
    const email = String(data.get('email') || formData.email || '').trim()
    const password = String(data.get('password') || formData.password || '')
    const confirmPassword = String(
      data.get('confirmPassword') || formData.confirmPassword || ''
    )

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (!acceptedTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy')
      return
    }

    setLoading(true)
    try {
      await register(name, email, password)
      // RecipeContext loads/syncs when isAuthenticated flips — avoid a second parallel upload.
      navigate('/')
    } catch (err) {
      if (!err.response) {
        setError('Could not reach the server. Check Wi‑Fi and try again.')
      } else {
        setError(err.response?.data?.message || 'Failed to create account')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl text-wicker-900 mb-2">
          Pull up a chair
        </h1>
        <p className="text-wicker-600">
          Make an account so your cards aren&apos;t stuck on one counter
        </p>
      </div>

      {localRecipeCount > 0 && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-green-700 font-medium">
              {localRecipeCount} local recipe{localRecipeCount > 1 ? 's' : ''} found
            </p>
            <p className="text-sm text-green-600">
              These will be synced to your account when you sign up.
            </p>
          </div>
        </div>
      )}

      <div className="card">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-wicker-700 mb-1">
              Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-wicker-500" />
              <input
                type="text"
                id="name"
                name="name"
                autoComplete="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input pl-10"
                placeholder="Your name"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-wicker-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-wicker-500" />
              <input
                type="email"
                id="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input pl-10"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-wicker-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-wicker-500" />
              <input
                type="password"
                id="password"
                name="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input pl-10"
                placeholder="••••••••"
                minLength={8}
                required
              />
            </div>
            <p className="mt-1 text-xs text-wicker-600">At least 8 characters</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-wicker-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-wicker-500" />
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="input pl-10"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 rounded border-wicker-300 text-gingham focus:ring-gingham"
              required
            />
            <span className="text-sm text-wicker-600 leading-snug">
              I agree to the{' '}
              <Link to="/terms" className="text-gingham hover:underline font-medium">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-gingham hover:underline font-medium">
                Privacy Policy
              </Link>
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !acceptedTerms}
            className="btn-primary w-full"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-wicker-600">
          Already have an account?{' '}
          <Link to="/login" className="text-gingham hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>

      <p className="mt-6 text-center text-sm text-wicker-600">
        You can also use Index Card Kitchen without an account.{' '}
        <Link to="/" className="text-gingham hover:underline">
          Continue without signing up
        </Link>
      </p>
    </div>
  )
}
