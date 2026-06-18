import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../api/client'
import { FaixaBadge } from '../../components/FaixaBadge'
import { StatusBadge } from '../../components/StatusBadge'
import type { LoteResponse } from '../../api/types'

interface ScoreAtivo { faixa: string; score_total: number; valido_ate: string }

export function ProdutorDashboard() {
  const { data: lotes } = useQuery({
    queryKey: ['meus-lotes'],
    queryFn: () => apiGet<LoteResponse[]>('/lotes'),
  })

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-cacau-700">Meu Painel</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Lotes ativos" value={lotes?.filter(l => l.status !== 'cancelado').length ?? '—'} />
        <StatCard label="Em leilão agora" value={lotes?.filter(l => l.status === 'em_leilao').length ?? '—'} accent />
        <StatCard label="Validados" value={lotes?.filter(l => l.status === 'validado').length ?? '—'} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Meus lotes</h3>
        {!lotes?.length ? (
          <p className="text-slate-400 text-sm">Nenhum lote encontrado. Publique expectativas de produção para entrar nos lotes.</p>
        ) : (
          <div className="space-y-2">
            {lotes.map(l => (
              <div key={l.id} className="bg-white rounded-lg border p-4 flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm font-medium text-cacau-700">{l.codigo}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{l.municipio_ponto} · {l.volume_declarado_kg.toLocaleString('pt-BR')} kg</p>
                </div>
                <div className="flex items-center gap-2">
                  <FaixaBadge faixa={l.faixa_score} />
                  <StatusBadge status={l.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-5 ${accent ? 'bg-amber-50 border border-amber-200' : 'bg-white border'}`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${accent ? 'text-amber-600' : 'text-cacau-700'}`}>{value}</p>
    </div>
  )
}
