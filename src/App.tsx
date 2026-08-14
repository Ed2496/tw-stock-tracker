import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import Info from './pages/Info'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/info" element={<Info />} />
    </Routes>
  )
}
