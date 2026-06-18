import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../api/client'
import { FaixaBadge } from '../../components/FaixaBadge'
import { StatusBadge } from '../../components/StatusBadge'
import type { LeilaoDetalheResponse } from '../../api/types'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function AdminLeiloes() {
  const qc = useQueryClient()
  const { data: leiloes, isLoading } = useQuery({
    queryKey: ['admin-leiloes'],
    queryFn: () => apiGet<LeilaoDetalheResponse[]>('/admin/leiloes'),
  })

  const encerrar = useMutation({
    mutationFn: (id: string) => apiPost(`/admin/leiloes/${id}/encerrar`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-leiloes'] }),
  })

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-cacau-700">Gestão de Leilões</h2>

      {isLoading && <p className="text-slate-400 text-sm">Carregando...</p>}

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
            <tr>
              {['Lote', 'Faixa', 'Volume', 'Lance Atual', 'Encerra em', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leiloes?.map(l => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-medium text-cacau-700">{l.lote_codigo}</td>
                <td className="px-4 py-3"><FaixaBadge faixa={l.lote_faixa_score ?? 'D'} /></td>
                <td className="px-4 py-3">{l.lote_volume_kg?.toLocaleString('pt-BR')} kg</td>
                <td className="px-4 py-3 font-bold">
                  {l.lance_atual_kg ? brl(l.lance_atual_kg) + '/kg' : '—'}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {l.encerra_em ? new Date(l.encerra_em).toLocaleString('pt-BR') : '—'}
                </td>
                <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                <td className="px-4 py-3">
                  {l.status === 'em_leilao' && (
                    <button
                      onClick={() => encerrar.mutate(l.id)}
                      className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full hover:bg-red-200"
                    >
                      Encerrar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {leiloes?.length === 0 && (
          <p className="text-center text-slate-400 text-sm py-6">Nenhum leilão.</p>
        )}
      </div>
    </div>
  )
}
