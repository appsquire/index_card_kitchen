import { openDB } from 'idb'

const DB_NAME = 'indexcardkitchen'
const DB_VERSION = 1

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Recipes store
      if (!db.objectStoreNames.contains('recipes')) {
        const recipeStore = db.createObjectStore('recipes', { keyPath: 'id' })
        recipeStore.createIndex('createdAt', 'createdAt')
        recipeStore.createIndex('synced', 'synced')
      }

      // Categories store
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' })
      }
    },
  })
}

export const localDb = {
  // Recipe operations
  async getAllRecipes() {
    const db = await getDb()
    const recipes = await db.getAll('recipes')
    return recipes.sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    )
  },

  async getRecipe(id) {
    const db = await getDb()
    return db.get('recipes', id)
  },

  async saveRecipe(recipe) {
    const db = await getDb()
    await db.put('recipes', recipe)
    return recipe
  },

  async deleteRecipe(id) {
    const db = await getDb()
    await db.delete('recipes', id)
  },

  async markSynced(id) {
    const db = await getDb()
    const recipe = await db.get('recipes', id)
    if (recipe) {
      recipe.synced = true
      await db.put('recipes', recipe)
    }
  },

  async syncRecipes(cloudRecipes) {
    const db = await getDb()
    const existing = await db.getAll('recipes')
    const tx = db.transaction('recipes', 'readwrite')
    const store = tx.objectStore('recipes')

    // Replace cloud cache only — keep local-only (unsynced) recipes intact.
    for (const recipe of existing) {
      if (recipe.synced) {
        await store.delete(recipe.id)
      }
    }
    for (const recipe of cloudRecipes) {
      await store.put({ ...recipe, synced: true })
    }
    await tx.done
  },

  async getUnsyncedRecipes() {
    const db = await getDb()
    const allRecipes = await db.getAll('recipes')
    return allRecipes.filter(r => !r.synced)
  },

  // Category operations
  async getAllCategories() {
    const db = await getDb()
    return db.getAll('categories')
  },

  async getCategory(id) {
    const db = await getDb()
    return db.get('categories', id)
  },

  async saveCategory(category) {
    const db = await getDb()
    await db.put('categories', category)
    return category
  },

  async deleteCategory(id) {
    const db = await getDb()
    await db.delete('categories', id)
  },

  async syncCategories(cloudCategories) {
    const db = await getDb()
    const tx = db.transaction('categories', 'readwrite')
    const store = tx.objectStore('categories')

    await store.clear()
    for (const category of cloudCategories) {
      await store.put(category)
    }
    await tx.done
  },

  async clearCloudCache() {
    const db = await getDb()
    const recipes = await db.getAll('recipes')
    const recipeTx = db.transaction('recipes', 'readwrite')
    for (const recipe of recipes) {
      if (recipe.synced) {
        await recipeTx.store.delete(recipe.id)
      }
    }
    await recipeTx.done
    await db.clear('categories')
  },

  // Clear all data
  async clearAll() {
    const db = await getDb()
    await db.clear('recipes')
    await db.clear('categories')
  },
}
