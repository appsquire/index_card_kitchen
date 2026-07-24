import { Navigate } from 'react-router-dom'

/** Old /recipe/import URLs land on the unified Add page. */
export default function ImportRecipe() {
  return <Navigate to="/recipe/new?mode=link" replace />
}
