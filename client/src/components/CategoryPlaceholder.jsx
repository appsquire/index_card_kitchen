/**
 * Category-specific placeholder images for recipes without photos.
 * Uses simple SVG patterns with food-related icons.
 */

const CATEGORY_STYLES = {
  breakfast: {
    bg: 'linear-gradient(135deg, #FFF6D9 0%, #F5D978 100%)',
    icon: '☀️',
    pattern: 'eggs',
  },
  dinner: {
    bg: 'linear-gradient(135deg, #FFE8E8 0%, #FFCACA 100%)',
    icon: '🍽️',
    pattern: 'plate',
  },
  desserts: {
    bg: 'linear-gradient(135deg, #FFE4EC 0%, #FFBCD0 100%)',
    icon: '🍰',
    pattern: 'swirl',
  },
  sides: {
    bg: 'linear-gradient(135deg, #E4F0E8 0%, #C5D9C5 100%)',
    icon: '🥗',
    pattern: 'leaves',
  },
  baking: {
    bg: 'linear-gradient(135deg, #FFF0E0 0%, #FFD9B3 100%)',
    icon: '🥖',
    pattern: 'wheat',
  },
  drinks: {
    bg: 'linear-gradient(135deg, #E0F4F4 0%, #B3E0E0 100%)',
    icon: '🥤',
    pattern: 'bubbles',
  },
  weeknight: {
    bg: 'linear-gradient(135deg, #F0EDE4 0%, #D9D4C5 100%)',
    icon: '⏱️',
    pattern: 'clock',
  },
  'family favorites': {
    bg: 'linear-gradient(135deg, #E8F2EE 0%, #C5D9D0 100%)',
    icon: '❤️',
    pattern: 'hearts',
  },
  default: {
    bg: 'linear-gradient(135deg, #F7FBFA 0%, #E8F2EE 100%)',
    icon: '📝',
    pattern: 'lines',
  },
}

export default function CategoryPlaceholder({ category, className = '' }) {
  return (
    <div
      className={`relative w-full h-full ${className}`}
      style={{
        backgroundImage: 'url(/recipe-card-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      role="img"
      aria-label={category || 'Recipe'}
    />
  )
}

/**
 * Get the style for a category (for use outside the component)
 */
export function getCategoryStyle(category) {
  const key = category?.toLowerCase() || 'default'
  return CATEGORY_STYLES[key] || CATEGORY_STYLES.default
}
