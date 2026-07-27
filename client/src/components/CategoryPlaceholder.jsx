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

function getPatternSvg(pattern, color) {
  const patterns = {
    eggs: `
      <circle cx="25" cy="30" r="12" fill="${color}" opacity="0.15"/>
      <circle cx="55" cy="50" r="10" fill="${color}" opacity="0.12"/>
      <circle cx="75" cy="25" r="8" fill="${color}" opacity="0.1"/>
    `,
    plate: `
      <circle cx="50" cy="50" r="30" fill="none" stroke="${color}" stroke-width="2" opacity="0.15"/>
      <circle cx="50" cy="50" r="20" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.1"/>
    `,
    swirl: `
      <path d="M20,50 Q35,20 50,50 T80,50" fill="none" stroke="${color}" stroke-width="2" opacity="0.15"/>
      <path d="M25,70 Q40,40 55,70 T85,70" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.1"/>
    `,
    leaves: `
      <path d="M30,60 Q40,40 50,60 Q40,50 30,60" fill="${color}" opacity="0.12"/>
      <path d="M60,40 Q70,20 80,40 Q70,30 60,40" fill="${color}" opacity="0.1"/>
    `,
    wheat: `
      <line x1="30" y1="70" x2="50" y2="30" stroke="${color}" stroke-width="2" opacity="0.15"/>
      <ellipse cx="45" cy="35" rx="4" ry="8" fill="${color}" opacity="0.12" transform="rotate(-20 45 35)"/>
      <ellipse cx="52" cy="40" rx="4" ry="8" fill="${color}" opacity="0.1" transform="rotate(20 52 40)"/>
    `,
    bubbles: `
      <circle cx="25" cy="60" r="8" fill="${color}" opacity="0.12"/>
      <circle cx="50" cy="40" r="6" fill="${color}" opacity="0.1"/>
      <circle cx="70" cy="65" r="10" fill="${color}" opacity="0.08"/>
      <circle cx="80" cy="30" r="5" fill="${color}" opacity="0.1"/>
    `,
    clock: `
      <circle cx="50" cy="50" r="25" fill="none" stroke="${color}" stroke-width="2" opacity="0.15"/>
      <line x1="50" y1="50" x2="50" y2="32" stroke="${color}" stroke-width="2" opacity="0.2"/>
      <line x1="50" y1="50" x2="62" y2="55" stroke="${color}" stroke-width="2" opacity="0.15"/>
    `,
    hearts: `
      <path d="M50,65 L35,50 Q35,40 45,40 Q50,40 50,48 Q50,40 55,40 Q65,40 65,50 Z" fill="${color}" opacity="0.12"/>
      <path d="M75,35 L68,28 Q68,23 73,23 Q75,23 75,27 Q75,23 77,23 Q82,23 82,28 Z" fill="${color}" opacity="0.1"/>
    `,
    lines: `
      <line x1="20" y1="30" x2="80" y2="30" stroke="${color}" stroke-width="1" opacity="0.1"/>
      <line x1="20" y1="45" x2="80" y2="45" stroke="${color}" stroke-width="1" opacity="0.08"/>
      <line x1="20" y1="60" x2="80" y2="60" stroke="${color}" stroke-width="1" opacity="0.1"/>
      <line x1="20" y1="75" x2="80" y2="75" stroke="${color}" stroke-width="1" opacity="0.08"/>
    `,
  }
  return patterns[pattern] || patterns.lines
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
