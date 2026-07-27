import { gazpachoRecipe } from '@shared/fixtures/cardStudioRecipes.js'

/** Demo recipe shown on the home page before users add their own cards. */
export const SAMPLE_RECIPE = {
  id: 'sample-gazpacho',
  ...gazpachoRecipe,
  description: 'Chilled tomato soup — a sample card so you can see how recipes look.',
}
