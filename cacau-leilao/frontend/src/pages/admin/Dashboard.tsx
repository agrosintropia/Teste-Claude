import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../api/client'

interface AdminStats {
  produtores_ativos: number
  lotes_em_leilao: number
  repasses_pendentes: number
  volume_total_kg: number
  receita_mes: number
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => apiGet<AdminStats>('/admin/stats'),
  })

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-cacau-700">Painel Administrativo</h2>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Produtores ativos" value={stats?.produtores_ativos ?? '—'} />
        <StatCard label="Lotes em leilão" value={stats?.lotes_em_leilao ?? '—'} accent />
        <StatCard label="Repasses pendentes" value={stats?.repasses_pendentes ?? '—'} warn />
        <StatCard
          label="Volume total (kg)"
          value={stats?.volume_total_kg?.toLocaleString('pt-BR') ?? '—'}
        />
        <StatCard
          label="Receita do mês"
          value={stats?.receita_mes != null ? brl(stats.receita_mes) : '—'}
          accent
        />
      </div>
    </div>
  )
}

function StatCard({ label, value, accent, warn }: {
  label: string; value: number | string; accent?: boolean; warn?: boolean
}) {
  const bg = accent ? 'bg-amber-50 border-amber-200' : warn ? 'bg-red-50 border-red-200' : 'bg-white'
  const text = accent ? 'text-amber-700' : warn ? 'text-red-700' : 'text-cacau-700'
  return (
    <div className={`rounded-xl p-5 border ${bg}`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${text}`}>{value}</p>
    </div>
  )
}
