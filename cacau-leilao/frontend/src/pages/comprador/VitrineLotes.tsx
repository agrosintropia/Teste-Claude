import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../../api/client'
import { FaixaBadge } from '../../components/FaixaBadge'
import { StatusBadge } from '../../components/StatusBadge'
import type { LoteResponse } from '../../api/types'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function VitrineLotes() {
  const navigate = useNavigate()
  const { data: lotes, isLoading } = useQuery({
    queryKey: ['vitrine-lotes'],
    queryFn: () => apiGet<LoteResponse[]>('/lotes?status=em_leilao,publicado'),
  })

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-cacau-700">Lotes Disponíveis</h2>

      {isLoading && <p className="text-slate-400 text-sm">Carregando...</p>}
      {lotes?.length === 0 && (
        <p className="text-slate-400 text-sm">Nenhum lote disponível no momento.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {lotes?.map(l => (
          <div key={l.id} className="bg-white border rounded-xl p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-sm font-semibold text-cacau-700">{l.codigo}</p>
                <p className="text-xs text-slate-500 mt-0.5">{l.municipio_ponto}</p>
              </div>
              <div className="flex gap-1">
                <FaixaBadge faixa={l.faixa_score} />
                <StatusBadge status={l.status} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-xs text-slate-500">Volume</p>
                <p className="font-medium">{l.volume_declarado_kg.toLocaleString('pt-BR')} kg</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-xs text-slate-500">Score</p>
                <p className="font-medium">{l.score_medio?.toFixed(1) ?? '—'}</p>
              </div>
            </div>

            {l.lance_atual_kg && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-sm">
                <p className="text-xs text-amber-600">Lance atual</p>
                <p className="font-bold text-amber-700">{brl(l.lance_atual_kg)}/kg</p>
              </div>
            )}

            <div className="text-xs text-slate-500">
              Produtores: {l.num_produtores} · Região: {l.regiao_nome}
            </div>

            {l.status === 'em_leilao' && (
              <button
                onClick={() => navigate(`/comprador/leilao/${l.leilao_id}`)}
                className="mt-auto w-full bg-cacau-700 text-white py-2 rounded-lg text-sm font-medium hover:bg-cacau-900 transition-colors"
              >
                Entrar no leilão
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
