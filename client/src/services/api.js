import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const recipeApi = {
  // Recipes
  async getAll() {
    const { data } = await api.get('/recipes')
    return data
  },

  async getOne(id) {
    const { data } = await api.get(`/recipes/${id}`)
    return data
  },

  async create(recipe) {
    const { data } = await api.post('/recipes', recipe)
    return data
  },

  async update(id, updates) {
    const { data } = await api.put(`/recipes/${id}`, updates)
    return data
  },

  async delete(id) {
    await api.delete(`/recipes/${id}`)
  },

  // Import from URL
  async importFromUrl(url) {
    const { data } = await api.post('/recipes/import', { url })
    return data
  },

  // Categories
  async getCategories() {
    const { data } = await api.get('/categories')
    return data
  },

  async createCategory(category) {
    const { data } = await api.post('/categories', category)
    return data
  },

  async updateCategory(id, updates) {
    const { data } = await api.put(`/categories/${id}`, updates)
    return data
  },

  async deleteCategory(id) {
    await api.delete(`/categories/${id}`)
  },

  // PDF Export
  async exportPdf(recipeId, options = {}) {
    const { data } = await api.post(`/recipes/${recipeId}/export`, options, {
      responseType: 'blob',
    })
    return data
  },
}

export default api
