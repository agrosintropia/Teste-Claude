import { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Notificacoes } from './Notificacoes'

interface NavItem { to: string; label: string }

const produtorNav: NavItem[] = [
  { to: '/produtor', label: 'Dashboard' },
  { to: '/produtor/expectativas', label: 'Expectativas' },
  { to: '/produtor/recebimentos', label: 'Recebimentos' },
  { to: '/produtor/defesas', label: 'Defesas' },
]

const compradorNav: NavItem[] = [
  { to: '/comprador/lotes', label: 'Vitrine de Lotes' },
  { to: '/comprador/entregas', label: 'Entregas' },
  { to: '/comprador/balanca', label: 'Balança' },
]

const adminNav: NavItem[] = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/lotes', label: 'Formação de Lotes' },
  { to: '/admin/leiloes', label: 'Leilões' },
  { to: '/admin/repasses', label: 'Repasses' },
  { to: '/admin/tarifas', label: 'Tarifas' },
]

const auditorNav: NavItem[] = [
  { to: '/auditor', label: 'Minhas Auditorias' },
]

const COMPRADOR_ROLES = ['atravessador', 'moageira']

function getNav(role: string | undefined): NavItem[] {
  if (role === 'produtor') return produtorNav
  if (role && COMPRADOR_ROLES.includes(role)) return compradorNav
  if (role === 'admin') return adminNav
  if (role === 'auditor') return auditorNav
  return []
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const nav = getNav(user?.role)

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-56 bg-cacau-700 text-white flex flex-col shrink-0">
        <div className="p-5 border-b border-cacau-900 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-amber-300">LoteForte</h1>
            <p className="text-xs text-cacau-100 mt-0.5 opacity-70">Valorizando o bom cacau</p>
          </div>
          <Notificacoes />
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/produtor' || item.to === '/admin' || item.to === '/auditor'}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-amber-500 text-white font-medium'
                    : 'text-white/70 hover:text-white hover:bg-cacau-900/50'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-cacau-900">
          <p className="text-sm text-white truncate">{(user as { nome?: string })?.nome ?? (user as { email?: string })?.email ?? ''}</p>
          <p className="text-xs text-white/60 capitalize">{user?.role}</p>
          <button onClick={handleLogout} className="mt-2 text-xs text-white/50 hover:text-white">
            Sair →
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  )
}
