import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import RecipeDetail from './pages/RecipeDetail'
import RecipeEdit from './pages/RecipeEdit'
import RecipeNew from './pages/RecipeNew'
import ImportRecipe from './pages/ImportRecipe'
import Categories from './pages/Categories'
import Login from './pages/Login'
import Register from './pages/Register'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="recipe/new" element={<RecipeNew />} />
        <Route path="recipe/import" element={<ImportRecipe />} />
        <Route path="recipe/:id" element={<RecipeDetail />} />
        <Route path="recipe/:id/edit" element={<RecipeEdit />} />
        <Route path="categories" element={<Categories />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="terms" element={<Terms />} />
        <Route path="privacy" element={<Privacy />} />
      </Route>
    </Routes>
  )
}

export default App
