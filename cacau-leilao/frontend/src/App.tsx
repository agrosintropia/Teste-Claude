import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ProdutorDashboard } from './pages/produtor/Dashboard'
import { Expectativas } from './pages/produtor/Expectativas'
import { Recebimentos } from './pages/produtor/Recebimentos'
import { Defesas } from './pages/produtor/Defesas'
import { VitrineLotes } from './pages/comprador/VitrineLotes'
import { SalaLeilao } from './pages/comprador/SalaLeilao'
import { EntregasComprador as Entregas } from './pages/comprador/Entregas'
import { Balanca } from './pages/comprador/Balanca'
import { AdminDashboard } from './pages/admin/Dashboard'
import { AdminLeiloes } from './pages/admin/Leiloes'
import { AdminRepasses as Repasses } from './pages/admin/Repasses'
import { AdminTarifas as Tarifas } from './pages/admin/Tarifas'
import { ReactNode } from 'react'

const COMPRADOR_ROLES = ['atravessador', 'moageira']

function RequireAuth({ children, role }: { children: ReactNode; role?: string }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="flex items-center justify-center h-screen text-slate-400">Carregando...</div>
  if (!user) return <Navigate to="/login" replace />
  if (role === 'comprador' && !COMPRADOR_ROLES.includes(user.role) && user.role !== 'admin')
    return <Navigate to="/login" replace />
  if (role && role !== 'comprador' && user.role !== role && user.role !== 'admin')
    return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

function HomeRedirect() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="flex items-center justify-center h-screen text-slate-400">Carregando...</div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'produtor') return <Navigate to="/produtor" replace />
  if (user.role === 'admin') return <Navigate to="/admin" replace />
  return <Navigate to="/comprador/lotes" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/produtor" element={<RequireAuth role="produtor"><ProdutorDashboard /></RequireAuth>} />
      <Route path="/produtor/expectativas" element={<RequireAuth role="produtor"><Expectativas /></RequireAuth>} />
      <Route path="/produtor/recebimentos" element={<RequireAuth role="produtor"><Recebimentos /></RequireAuth>} />
      <Route path="/produtor/defesas" element={<RequireAuth role="produtor"><Defesas /></RequireAuth>} />

      <Route path="/comprador/lotes" element={<RequireAuth role="comprador"><VitrineLotes /></RequireAuth>} />
      <Route path="/comprador/leilao/:id" element={<RequireAuth role="comprador"><SalaLeilao /></RequireAuth>} />
      <Route path="/comprador/entregas" element={<RequireAuth role="comprador"><Entregas /></RequireAuth>} />
      <Route path="/comprador/balanca" element={<RequireAuth role="comprador"><Balanca /></RequireAuth>} />

      <Route path="/admin" element={<RequireAuth role="admin"><AdminDashboard /></RequireAuth>} />
      <Route path="/admin/leiloes" element={<RequireAuth role="admin"><AdminLeiloes /></RequireAuth>} />
      <Route path="/admin/repasses" element={<RequireAuth role="admin"><Repasses /></RequireAuth>} />
      <Route path="/admin/tarifas" element={<RequireAuth role="admin"><Tarifas /></RequireAuth>} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
