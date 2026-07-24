import axios from 'axios'

const api = axios.create({
  baseURL: '/api/auth',
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
