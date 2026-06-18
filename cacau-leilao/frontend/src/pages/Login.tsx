import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Login() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) {
    const dest = user.role === 'produtor' ? '/produtor'
      : user.role === 'admin' ? '/admin'
      : '/comprador/lotes'
    navigate(dest, { replace: true })
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      await login(email, senha)
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao entrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cacau-50">
      <div className="bg-white rounded-xl shadow-md w-full max-w-sm p-8">
        <h1 className="text-2xl font-bold text-cacau-700 mb-1">LoteForte</h1>
        <p className="text-slate-500 text-sm mb-6">Valorizando o bom cacau</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cacau-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <input
              type="password" required value={senha} onChange={e => setSenha(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cacau-500"
            />
          </div>
          {erro && <p className="text-red-600 text-sm">{erro}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full bg-cacau-700 text-white py-2 rounded-lg text-sm font-medium hover:bg-cacau-900 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-500 mt-4">
          Novo por aqui?{' '}
          <Link to="/register" className="text-cacau-700 font-medium hover:underline">Cadastre-se</Link>
        </p>
      </div>
    </div>
  )
}
