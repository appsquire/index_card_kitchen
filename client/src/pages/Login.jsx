import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Prefer live DOM values — iOS Chrome/WebKit autofill often skips React onChange,
    // and password managers store different secrets per origin (localhost vs LAN IP).
    const form = e.currentTarget
    const emailInput = form.elements.namedItem('email')
    const passwordInput = form.elements.namedItem('password')
    const email = String(
      (emailInput && 'value' in emailInput ? emailInput.value : '') || formData.email || ''
    )
      .trim()
      .toLowerCase()
    const password = String(
      (passwordInput && 'value' in passwordInput ? passwordInput.value : '') ||
        formData.password ||
        ''
    )

    if (!email || !password) {
      setError('Enter your email and password (type them in — don’t rely on autofill).')
      setLoading(false)
      return
    }

    try {
      await login(email, password)
      // RecipeContext loads/syncs when isAuthenticated flips — avoid a second parallel upload.
      navigate('/')
    } catch (err) {
      if (!err.response) {
        setError('Could not reach the server. Check Wi‑Fi and try again.')
      } else if (err.response?.status === 401) {
        setError(
          'Invalid email or password. If the fields looked filled in, try typing them manually — browsers sometimes autofill the wrong saved password for this address.'
        )
      } else {
        setError(err.response?.data?.message || 'Could not sign in')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl text-wicker-900 mb-2">
          Welcome back
        </h1>
        <p className="text-wicker-600">
          Sign in so the recipe box follows you around
        </p>
      </div>

      <div className="card">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
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
                autoComplete="current-password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input pl-10"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <p className="text-xs text-wicker-500 leading-relaxed">
            If sign-in fails after autofill, clear the fields and type your password yourself —
            browsers often store different passwords per site address.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-wicker-600">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-gingham hover:underline font-medium">
            Create one
          </Link>
        </p>
      </div>

      <p className="mt-6 text-center text-sm text-wicker-600">
        You can also use Index Card Kitchen without an account.{' '}
        <Link to="/" className="text-gingham hover:underline">
          Continue without signing in
        </Link>
      </p>
    </div>
  )
}
