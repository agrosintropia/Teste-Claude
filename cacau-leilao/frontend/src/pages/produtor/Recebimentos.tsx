import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../api/client'
import { StatusBadge } from '../../components/StatusBadge'
import type { SplitResponse } from '../../api/types'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function Recebimentos() {
  const { data: splits, isLoading } = useQuery({
    queryKey: ['recebimentos'],
    queryFn: () => apiGet<SplitResponse[]>('/produtores/me/recebimentos'),
  })

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-cacau-700">Meus Recebimentos</h2>

      {isLoading && <p className="text-slate-400 text-sm">Carregando...</p>}
      {splits?.length === 0 && (
        <p className="text-slate-400 text-sm">Nenhum recebimento registrado ainda.</p>
      )}

      {splits && splits.length > 0 && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                {['Volume (kg)', 'Participação', 'Valor Bruto', 'Taxa Anual', 'Valor Líquido', 'PIX', 'Pago em'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {splits.map(s => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{s.volume_kg.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3">{s.percentual_lote.toFixed(2)}%</td>
                  <td className="px-4 py-3">{brl(s.valor_bruto)}</td>
                  <td className="px-4 py-3 text-red-600">
                    {s.taxa_anual_deduzida > 0 ? `− ${brl(s.taxa_anual_deduzida)}` : '—'}
                  </td>
                  <td className="px-4 py-3 font-bold text-green-700">{brl(s.valor_liquido)}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.pix_status} /></td>
                  <td className="px-4 py-3 text-slate-500">
                    {s.pix_pago_em ? new Date(s.pix_pago_em).toLocaleDateString('pt-BR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {splits && splits.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
          <p className="font-semibold text-amber-800">Total líquido recebido:</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">
            {brl(splits.filter(s => s.pix_status === 'pago').reduce((a, s) => a + s.valor_liquido, 0))}
          </p>
        </div>
      )}
    </div>
  )
}
