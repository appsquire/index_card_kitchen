/** Built-in tabs for a kitchen recipe box */
export const DEFAULT_CATEGORIES = [
  { name: 'Breakfast', color: '#D4B44A' },
  { name: 'Dinner', color: '#C23B3B' },
  { name: 'Desserts', color: '#8F2A2A' },
  { name: 'Sides', color: '#4F7A5C' },
  { name: 'Baking', color: '#B0794A' },
  { name: 'Drinks', color: '#557A6E' },
  { name: 'Weeknight', color: '#446358' },
  { name: 'Family favorites', color: '#6F9A8C' },
]

export function buildDefaultCategories() {
  return DEFAULT_CATEGORIES.map((cat) => ({
    id: crypto.randomUUID(),
    name: cat.name,
    color: cat.color,
  }))
}
