import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authService } from '../services/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setUser(null)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      authService
        .getProfile()
        .then((userData) => setUser(userData))
        .catch(() => {
          localStorage.removeItem('token')
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  // Soft logout from api 401 interceptor (avoids hard reload wiping in-flight state).
  useEffect(() => {
    const onForcedLogout = () => {
      localStorage.removeItem('token')
      setUser(null)
    }
    window.addEventListener('auth:logout', onForcedLogout)
    return () => window.removeEventListener('auth:logout', onForcedLogout)
  }, [])

  const login = async (email, password) => {
    const { user: userData, token } = await authService.login(email, password)
    localStorage.setItem('token', token)
    setUser(userData)
    return userData
  }

  const register = async (name, email, password) => {
    const { user: userData, token } = await authService.register(name, email, password)
    localStorage.setItem('token', token)
    setUser(userData)
    return userData
  }

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
