import axios from 'axios'

// Determine API URL at runtime based on hostname
const API_BASE = (() => {
  if (typeof window !== 'undefined' && window.location.hostname === 'index-card-kitchen.onrender.com') {
    return 'https://indexcardkitchen-api.onrender.com/api/auth'
  }
  return '/api/auth'
})()

const api = axios.create({
  baseURL: API_BASE,
})

export const authService = {
  async login(email, password) {
    const { data } = await api.post('/login', { email, password })
    return data
  },

  async register(name, email, password) {
    const { data } = await api.post('/register', { name, email, password })
    return data
  },

  async getProfile() {
    const token = localStorage.getItem('token')
    const { data } = await api.get('/profile', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  },
}
