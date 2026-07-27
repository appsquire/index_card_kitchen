import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import { localDb } from '../services/localDb'
import { recipeApi } from '../services/api'
import { buildDefaultCategories } from '../data/defaultCategories'

const RecipeContext = createContext(null)

function sortByCreatedAt(recipes) {
  return [...recipes].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  )
}

function mergeCloudAndLocal(cloudRecipes, unsyncedRecipes) {
  const byId = new Map()
  for (const recipe of cloudRecipes) {
    byId.set(recipe.id, { ...recipe, synced: true })
  }
  for (const recipe of unsyncedRecipes) {
    if (!byId.has(recipe.id)) {
      byId.set(recipe.id, recipe)
    }
  }
  return sortByCreatedAt([...byId.values()])
}

export function RecipeProvider({ children }) {
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const [recipes, setRecipes] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const loadGenRef = useRef(0)
  const wasAuthenticatedRef = useRef(false)

  // Upload local-only recipes to the cloud. Continues past individual failures
  // so one bad card doesn't block the rest of the box from syncing.
  const uploadUnsyncedRecipes = async () => {
    if (!localStorage.getItem('token')) return

    const unsyncedRecipes = await localDb.getUnsyncedRecipes()
    for (const recipe of unsyncedRecipes) {
      const { synced, ...recipeData } = recipe
      try {
        const saved = await recipeApi.create(recipeData)
        // Prefer the server copy (same id when client sent one).
        await localDb.saveRecipe({ ...saved, synced: true })
        if (saved.id !== recipe.id) {
          await localDb.deleteRecipe(recipe.id)
        }
      } catch (error) {
        const status = error.response?.status
        const code = error.response?.data?.code
        const message = String(error.response?.data?.message || error.message || '')
        // Already on the server (re-upload / race) — treat as synced.
        if (
          status === 409 ||
          code === '23505' ||
          /duplicate|unique|already exists/i.test(message)
        ) {
          await localDb.markSynced(recipe.id)
          continue
        }
        console.error('Failed to upload recipe:', recipe.id, error)
      }
    }
  }

  const loadRecipes = useCallback(async () => {
    const gen = ++loadGenRef.current
    setLoading(true)
    try {
      if (isAuthenticated) {
        await uploadUnsyncedRecipes()
        if (gen !== loadGenRef.current) return

        const cloudRecipes = await recipeApi.getAll()
        if (gen !== loadGenRef.current) return

        await localDb.syncRecipes(cloudRecipes)
        const unsynced = await localDb.getUnsyncedRecipes()
        if (gen !== loadGenRef.current) return

        setRecipes(mergeCloudAndLocal(cloudRecipes, unsynced))
      } else {
        // Only wipe cloud cache when we know there is no session token.
        // Never clear while auth is still resolving a stored token.
        if (!localStorage.getItem('token')) {
          await localDb.clearCloudCache()
        }
        if (gen !== loadGenRef.current) return

        const localRecipes = await localDb.getAllRecipes()
        if (gen !== loadGenRef.current) return

        setRecipes(localRecipes.filter((r) => !r.synced))
      }
    } catch (error) {
      console.error('Failed to load recipes:', error)
      if (gen !== loadGenRef.current) return
      // Offline / API error — keep whatever is still in IndexedDB (synced + not).
      const localRecipes = await localDb.getAllRecipes()
      if (gen !== loadGenRef.current) return
      setRecipes(sortByCreatedAt(localRecipes))
    } finally {
      if (gen === loadGenRef.current) setLoading(false)
    }
  }, [isAuthenticated])

  const loadCategories = useCallback(async () => {
    try {
      if (isAuthenticated) {
        const cloudCategories = await recipeApi.getCategories()
        setCategories(cloudCategories)
        await localDb.syncCategories(cloudCategories)
      } else {
        let localCategories = await localDb.getAllCategories()
        if (localCategories.length === 0) {
          const defaults = buildDefaultCategories()
          await localDb.syncCategories(defaults)
          localCategories = defaults
        }
        setCategories(localCategories)
      }
    } catch (error) {
      console.error('Failed to load categories:', error)
      const localCategories = await localDb.getAllCategories()
      setCategories(localCategories)
    }
  }, [isAuthenticated])

  // Wait for AuthContext to finish checking the stored token before deciding
  // logged-in vs logged-out. Premature "logged out" used to clearCloudCache()
  // and wipe the user's recipes from IndexedDB.
  useEffect(() => {
    if (authLoading) return

    const justLoggedOut = wasAuthenticatedRef.current && !isAuthenticated
    wasAuthenticatedRef.current = isAuthenticated

    if (justLoggedOut && !localStorage.getItem('token')) {
      localDb.clearCloudCache().finally(() => {
        loadRecipes()
        loadCategories()
      })
      return
    }

    loadRecipes()
    loadCategories()
  }, [authLoading, isAuthenticated, loadRecipes, loadCategories, user])

  // Sync local recipes to cloud when user logs in (token may exist before React re-renders).
  const syncToCloud = async () => {
    if (!localStorage.getItem('token')) return

    setSyncing(true)
    const gen = ++loadGenRef.current
    try {
      await uploadUnsyncedRecipes()
      if (gen !== loadGenRef.current) return

      const cloudRecipes = await recipeApi.getAll()
      if (gen !== loadGenRef.current) return

      await localDb.syncRecipes(cloudRecipes)
      const unsynced = await localDb.getUnsyncedRecipes()
      if (gen !== loadGenRef.current) return

      setRecipes(mergeCloudAndLocal(cloudRecipes, unsynced))
    } catch (error) {
      console.error('Sync failed:', error)
      if (gen !== loadGenRef.current) return
      const localRecipes = await localDb.getAllRecipes()
      setRecipes(sortByCreatedAt(localRecipes))
    } finally {
      if (gen === loadGenRef.current) setSyncing(false)
    }
  }

  // Recipe CRUD operations
  const addRecipe = async (recipeData) => {
    const recipe = {
      ...recipeData,
      id: recipeData.id || crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    if (isAuthenticated) {
      try {
        const savedRecipe = await recipeApi.create(recipe)
        setRecipes((prev) => [savedRecipe, ...prev.filter((r) => r.id !== savedRecipe.id)])
        await localDb.saveRecipe({ ...savedRecipe, synced: true })
        return savedRecipe
      } catch (error) {
        // Keep a local copy so the card isn't lost if the network blips.
        await localDb.saveRecipe({ ...recipe, synced: false })
        setRecipes((prev) => [recipe, ...prev.filter((r) => r.id !== recipe.id)])
        throw error
      }
    }

    await localDb.saveRecipe({ ...recipe, synced: false })
    setRecipes((prev) => [recipe, ...prev])
    return recipe
  }

  const updateRecipe = async (id, updates) => {
    const updatedData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    if (isAuthenticated) {
      try {
        const updatedRecipe = await recipeApi.update(id, updatedData)
        setRecipes((prev) => prev.map((r) => (r.id === id ? updatedRecipe : r)))
        await localDb.saveRecipe({ ...updatedRecipe, synced: true })
        return updatedRecipe
      } catch (error) {
        const existingRecipe = recipes.find((r) => r.id === id)
        const updatedRecipe = { ...existingRecipe, ...updatedData, synced: false }
        await localDb.saveRecipe(updatedRecipe)
        setRecipes((prev) => prev.map((r) => (r.id === id ? updatedRecipe : r)))
        throw error
      }
    }

    const existingRecipe = recipes.find((r) => r.id === id)
    const updatedRecipe = { ...existingRecipe, ...updatedData }
    await localDb.saveRecipe({ ...updatedRecipe, synced: false })
    setRecipes((prev) => prev.map((r) => (r.id === id ? updatedRecipe : r)))
    return updatedRecipe
  }

  const deleteRecipe = async (id) => {
    if (isAuthenticated) {
      try {
        await recipeApi.delete(id)
      } catch (error) {
        // If the server already lacks it, still drop the local copy.
        if (error.response?.status !== 404) throw error
      }
    }
    await localDb.deleteRecipe(id)
    setRecipes((prev) => prev.filter((r) => r.id !== id))
  }

  const getRecipe = (id) => {
    return recipes.find((r) => r.id === id)
  }

  // Category operations
  const addCategory = async (categoryData) => {
    const category = {
      ...categoryData,
      id: categoryData.id || crypto.randomUUID(),
    }

    if (isAuthenticated) {
      const savedCategory = await recipeApi.createCategory(category)
      setCategories((prev) => [...prev, savedCategory])
      await localDb.saveCategory(savedCategory)
      return savedCategory
    }

    await localDb.saveCategory(category)
    setCategories((prev) => [...prev, category])
    return category
  }

  const updateCategory = async (id, updates) => {
    if (isAuthenticated) {
      const updatedCategory = await recipeApi.updateCategory(id, updates)
      setCategories((prev) => prev.map((c) => (c.id === id ? updatedCategory : c)))
      await localDb.saveCategory(updatedCategory)
      return updatedCategory
    }

    const existingCategory = categories.find((c) => c.id === id)
    const updatedCategory = { ...existingCategory, ...updates }
    await localDb.saveCategory(updatedCategory)
    setCategories((prev) => prev.map((c) => (c.id === id ? updatedCategory : c)))
    return updatedCategory
  }

  const deleteCategory = async (id) => {
    if (isAuthenticated) {
      await recipeApi.deleteCategory(id)
    }
    await localDb.deleteCategory(id)
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }

  // Search functionality
  const searchRecipes = (query, categoryId = null) => {
    const lowerQuery = query.toLowerCase()
    return recipes.filter((recipe) => {
      const matchesQuery =
        !query ||
        recipe.title.toLowerCase().includes(lowerQuery) ||
        recipe.description?.toLowerCase().includes(lowerQuery) ||
        recipe.ingredients?.some((ing) => ing.name?.toLowerCase().includes(lowerQuery))

      const matchesCategory = !categoryId || recipe.categoryIds?.includes(categoryId)

      return matchesQuery && matchesCategory
    })
  }

  const value = {
    recipes,
    categories,
    loading: loading || authLoading,
    syncing,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    getRecipe,
    addCategory,
    updateCategory,
    deleteCategory,
    searchRecipes,
    syncToCloud,
    refreshRecipes: loadRecipes,
  }

  return (
    <RecipeContext.Provider value={value}>
      {children}
    </RecipeContext.Provider>
  )
}

export function useRecipes() {
  const context = useContext(RecipeContext)
  if (!context) {
    throw new Error('useRecipes must be used within a RecipeProvider')
  }
  return context
}
