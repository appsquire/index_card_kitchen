/** Fixtures for Card Studio / cardPlan tests (from docs acceptance checklist). */

export const shortRecipe = {
  title: 'Simple Taco Salad',
  servings: 4,
  prepTime: 15,
  ingredients: [
    { amount: '1', unit: 'lb', name: 'ground beef' },
    { amount: '1', unit: 'head', name: 'romaine lettuce' },
    { amount: '1', unit: 'cup', name: 'shredded cheddar' },
    { amount: '1', unit: 'can', name: 'black beans, drained' },
  ],
  instructions: [
    { step: 'Brown the beef in a skillet over medium heat. Drain excess fat.' },
    { step: 'Chop lettuce and add to a large bowl with beans and cheese.' },
    { step: 'Top with warm beef and serve with salsa.' },
  ],
}

/** Easy Gazpacho — long steps, note-style ingredients (The Kitchn-style fixture). */
export const gazpachoRecipe = {
  title: 'Easy Gazpacho',
  servings: 6,
  prepTime: 20,
  sourceUrl: 'https://www.thekitchn.com/easy-gazpacho-recipe',
  ingredients: [
    { amount: '2', unit: 'lb', name: 'ripe tomatoes' },
    { amount: '1', unit: 'medium', name: 'cucumber, peeled' },
    { amount: '1', unit: 'medium', name: 'red bell pepper' },
    { amount: '1/4', unit: 'medium', name: 'red onion' },
    { amount: '2', unit: 'cloves', name: 'garlic' },
    { amount: '2', unit: 'Tbsp', name: 'olive oil' },
    { amount: '2', unit: 'Tbsp', name: 'sherry vinegar' },
    { amount: '1', unit: 'tsp', name: 'salt' },
    { amount: '', unit: 'Instead', name: 'of sherry vinegar, use red wine vinegar' },
    { amount: '1/4', unit: 'tsp', name: 'black pepper' },
    { amount: '1', unit: 'cup', name: 'tomato juice' },
    { amount: '', unit: 'Whiz', name: 'everything until mostly smooth' },
    { amount: '1/4', unit: 'cup', name: 'fresh basil for garnish' },
  ],
  instructions: [
    {
      step: 'Core the tomatoes and cut them into rough chunks. Peel and seed the cucumber, then cut it into chunks similar in size to the tomatoes. Remove the stem and seeds from the bell pepper and cut it into chunks as well.',
    },
    {
      step: 'Peel and roughly chop the red onion and garlic. Combine all the vegetables in a large bowl with the olive oil, sherry vinegar, salt, and pepper.',
    },
    {
      step: 'Working in batches if needed, transfer the mixture to a blender or food processor and blend until mostly smooth with some texture remaining.',
    },
    {
      step: 'Pour the purée into a large bowl and stir in the tomato juice. Taste and adjust seasoning with additional salt, pepper, or vinegar as needed.',
    },
    {
      step: 'Cover and refrigerate for at least 2 hours, or until thoroughly chilled. The flavors meld and improve overnight.',
    },
    {
      step: 'Serve cold in chilled bowls, drizzled with a little olive oil and garnished with fresh basil. Pass extra vinegar at the table for those who like more tang.',
    },
    {
      step: 'Leftovers keep well in the refrigerator for up to 3 days. Stir before serving as natural separation may occur.',
    },
  ],
}

/** Forces multi-page overflow on 4×6 even with heuristic planner. */
export const longDirectionsRecipe = {
  title: 'Long Method Recipe',
  servings: 8,
  ingredients: [{ amount: '2', unit: 'cups', name: 'flour' }],
  instructions: Array.from({ length: 12 }, (_, i) => ({
    step: `Step ${i + 1}: ${'Whisk, fold, and bake until golden. '.repeat(8)}`,
  })),
}
