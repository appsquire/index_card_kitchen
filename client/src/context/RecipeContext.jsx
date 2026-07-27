import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import { localDb } from '../services/localDb'
import { recipeApi } from '../services/api'
import { buildDefaultCategories } from '../data/defaultCategories'

const RecipeContext = createContext(null)

export function RecipeProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [recipes, setRecipes] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const uploadInFlight = useRef(null)

  // Upload local-only recipes to the cloud. Shared promise so login + effect
  // cannot double-POST the same recipes.
  const uploadUnsyncedRecipes = useCallback(async () => {
    if (!localStorage.getItem('token')) return
    if (uploadInFlight.current) return uploadInFlight.current

    uploadInFlight.current = (async () => {
      const unsyncedRecipes = await localDb.getUnsyncedRecipes()
      for (const recipe of unsyncedRecipes) {
        try {
          const recipeData = { ...recipe }
          delete recipeData.synced
          await recipeApi.create(recipeData)
          await localDb.markSynced(recipe.id)
        } catch (error) {
          // Duplicate id from a concurrent upload / retry — treat as synced.
          const status = error.response?.status
          if (status === 409 || status === 200 || status === 201) {
            await localDb.markSynced(recipe.id)
            continue
          }
          console.warn('Failed to upload recipe', recipe.id, error)
        }
      }
    })().finally(() => {
      uploadInFlight.current = null
    })

    return uploadInFlight.current
  }, [])

  // Load recipes from local DB or API
  const loadRecipes = useCallback(async () => {
    setLoading(true)
    try {
      if (isAuthenticated) {
        await uploadUnsyncedRecipes()
        const cloudRecipes = await recipeApi.getAll()
        await localDb.syncRecipes(cloudRecipes)
        // Prefer IndexedDB view: cloud cache + any still-unsynced locals.
        setRecipes(await localDb.getAllRecipes())
      } else {
        // Auth has finished resolving — safe to drop a previous session's cloud cache.
        // Never call this while authLoading (token still being validated).
        await localDb.clearCloudCache()
        const localRecipes = await localDb.getAllRecipes()
        setRecipes(localRecipes.filter((r) => !r.synced))
      }
    } catch (error) {
      console.error('Failed to load recipes:', error)
      const localRecipes = await localDb.getAllRecipes()
      // Offline or API error — show everything we still have cached locally.
      setRecipes(localRecipes)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, uploadUnsyncedRecipes])

  // Load categories — seed kitchen defaults if the box is empty
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

  // Wait for AuthContext to finish checking the token before loading/clearing.
  useEffect(() => {
    if (authLoading) {
      setLoading(true)
      return
    }
    loadRecipes()
    loadCategories()
  }, [authLoading, loadRecipes, loadCategories])

  // Sync local recipes to cloud when user logs in (token may exist before React re-renders).
  const syncToCloud = async () => {
    if (!localStorage.getItem('token')) return

    setSyncing(true)
    try {
      await uploadUnsyncedRecipes()
      const cloudRecipes = await recipeApi.getAll()
      await localDb.syncRecipes(cloudRecipes)
      setRecipes(await localDb.getAllRecipes())
    } catch (error) {
      console.error('Sync failed:', error)
      try {
        setRecipes(await localDb.getAllRecipes())
      } catch {
        /* ignore */
      }
    } finally {
      setSyncing(false)
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
      const savedRecipe = await recipeApi.create(recipe)
      setRecipes((prev) => [savedRecipe, ...prev.filter((r) => r.id !== savedRecipe.id)])
      await localDb.saveRecipe({ ...savedRecipe, synced: true })
      return savedRecipe
    } else {
      await localDb.saveRecipe({ ...recipe, synced: false })
      setRecipes((prev) => [recipe, ...prev])
      return recipe
    }
  }

  const updateRecipe = async (id, updates) => {
    const updatedData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    if (isAuthenticated) {
      const updatedRecipe = await recipeApi.update(id, updatedData)
      setRecipes((prev) => prev.map((r) => (r.id === id ? updatedRecipe : r)))
      await localDb.saveRecipe({ ...updatedRecipe, synced: true })
      return updatedRecipe
    } else {
      const existingRecipe = recipes.find((r) => r.id === id)
      const updatedRecipe = { ...existingRecipe, ...updatedData }
      await localDb.saveRecipe({ ...updatedRecipe, synced: false })
      setRecipes((prev) => prev.map((r) => (r.id === id ? updatedRecipe : r)))
      return updatedRecipe
    }
  }

  const deleteRecipe = async (id) => {
    if (isAuthenticated) {
      await recipeApi.delete(id)
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
    } else {
      await localDb.saveCategory(category)
      setCategories((prev) => [...prev, category])
      return category
    }
  }

  const updateCategory = async (id, updates) => {
    if (isAuthenticated) {
      const updatedCategory = await recipeApi.updateCategory(id, updates)
      setCategories((prev) => prev.map((c) => (c.id === id ? updatedCategory : c)))
      await localDb.saveCategory(updatedCategory)
      return updatedCategory
    } else {
      const existingCategory = categories.find((c) => c.id === id)
      const updatedCategory = { ...existingCategory, ...updates }
      await localDb.saveCategory(updatedCategory)
      setCategories((prev) => prev.map((c) => (c.id === id ? updatedCategory : c)))
      return updatedCategory
    }
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

  return <RecipeContext.Provider value={value}>{children}</RecipeContext.Provider>
}

export function useRecipes() {
  const context = useContext(RecipeContext)
  if (!context) {
    throw new Error('useRecipes must be used within a RecipeProvider')
  }
  return context
}
