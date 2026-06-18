import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { apiPost } from '../api/client'

export function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ nome: '', email: '', password: '', role: 'produtor' })
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      await apiPost('/auth/register', form)
      navigate('/login')
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao cadastrar')
    } finally {
      setLoading(false)
    }
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  return (
    <div className="min-h-screen flex items-center justify-center bg-cacau-50">
      <div className="bg-white rounded-xl shadow-md w-full max-w-sm p-8">
        <h1 className="text-2xl font-bold text-cacau-700 mb-1">Criar conta</h1>
        <p className="text-slate-500 text-sm mb-6">LoteForte — Valorizando o bom cacau</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Nome completo', field: 'nome', type: 'text' },
            { label: 'E-mail', field: 'email', type: 'email' },
            { label: 'Senha', field: 'password', type: 'password' },
          ].map(({ label, field, type }) => (
            <div key={field}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
              <input
                type={type} required value={form[field as keyof typeof form]}
                onChange={set(field)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cacau-500"
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Perfil</label>
            <select
              value={form.role} onChange={set('role')}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cacau-500"
            >
              <option value="produtor">Produtor</option>
              <option value="atravessador">Atravessador</option>
              <option value="moageira">Moageira</option>
            </select>
          </div>
          {erro && <p className="text-red-600 text-sm">{erro}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full bg-cacau-700 text-white py-2 rounded-lg text-sm font-medium hover:bg-cacau-900 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Cadastrando...' : 'Criar conta'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-500 mt-4">
          Já tem conta?{' '}
          <Link to="/login" className="text-cacau-700 font-medium hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
