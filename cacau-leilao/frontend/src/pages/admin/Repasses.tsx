import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../api/client'
import { StatusBadge } from '../../components/StatusBadge'
import type { RepasseDetalheResponse, SplitResponse } from '../../api/types'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function AdminRepasses() {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [pixId, setPixId] = useState('')
  const [chaves, setChaves] = useState<Record<string, string>>({})

  const { data: repasses, isLoading } = useQuery({
    queryKey: ['admin-repasses'],
    queryFn: () => apiGet<RepasseDetalheResponse[]>('/admin/repasses'),
  })

  const { data: splits } = useQuery({
    queryKey: ['admin-splits', expanded],
    queryFn: () => apiGet<SplitResponse[]>(`/repasses/${expanded}/splits`),
    enabled: !!expanded,
  })

  const confirmarPagamento = useMutation({
    mutationFn: ({ id, pix_id }: { id: string; pix_id: string }) =>
      apiPost(`/repasses/${id}/confirmar-pagamento`, { pix_id_comprador: pix_id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-repasses'] }); setPixId('') },
  })

  const confirmarPix = useMutation({
    mutationFn: ({ id, chave_pix, pix_id_transacao }: { id: string; chave_pix: string; pix_id_transacao: string }) =>
      apiPost(`/splits/${id}/confirmar-pix`, { chave_pix, pix_id_transacao }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-splits', expanded] })
      qc.invalidateQueries({ queryKey: ['admin-repasses'] })
    },
  })

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-cacau-700">Repasses & Splits PIX</h2>
      {isLoading && <p className="text-slate-400 text-sm">Carregando...</p>}

      <div className="space-y-3">
        {repasses?.map(r => (
          <div key={r.id} className="bg-white border rounded-xl overflow-hidden">
            <div
              className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50"
              onClick={() => setExpanded(expanded === r.id ? null : r.id)}
            >
              <div>
                <p className="font-mono text-sm font-semibold text-cacau-700">{r.lote_codigo}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {brl(r.valor_total)} total · {brl(r.valor_liquido_produtores)} p/ produtores
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={r.status} />
                <span className="text-slate-400 text-xs">{expanded === r.id ? '▲' : '▼'}</span>
              </div>
            </div>

            {expanded === r.id && (
              <div className="border-t px-5 py-4 space-y-4">
                {r.status === 'aguardando_pagamento' && (
                  <div className="flex gap-2">
                    <input
                      value={pixId}
                      onChange={e => setPixId(e.target.value)}
                      placeholder="ID da transação PIX do comprador"
                      className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono"
                    />
                    <button
                      onClick={() => confirmarPagamento.mutate({ id: r.id, pix_id: pixId })}
                      disabled={!pixId || confirmarPagamento.isPending}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60"
                    >
                      Confirmar recebimento
                    </button>
                  </div>
                )}

                {splits && splits.length > 0 && (
                  <table className="w-full text-sm">
                    <thead className="text-xs text-slate-500 uppercase">
                      <tr>
                        {['Produtor', 'Volume', '%', 'Bruto', 'Taxa', 'Líquido', 'PIX', ''].map(h => (
                          <th key={h} className="py-2 text-left pr-4 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {splits.map(s => (
                        <tr key={s.id}>
                          <td className="py-2 pr-4 text-slate-700">{s.produtor_nome}</td>
                          <td className="py-2 pr-4">{s.volume_kg.toLocaleString('pt-BR')} kg</td>
                          <td className="py-2 pr-4">{s.percentual_lote.toFixed(2)}%</td>
                          <td className="py-2 pr-4">{brl(s.valor_bruto)}</td>
                          <td className="py-2 pr-4 text-red-600">
                            {s.taxa_anual_deduzida > 0 ? `− ${brl(s.taxa_anual_deduzida)}` : '—'}
                          </td>
                          <td className="py-2 pr-4 font-bold text-green-700">{brl(s.valor_liquido)}</td>
                          <td className="py-2 pr-4"><StatusBadge status={s.pix_status} /></td>
                          <td className="py-2">
                            {s.pix_status === 'pendente' && r.status === 'pago' && (
                              <div className="flex gap-1">
                                <input
                                  value={chaves[s.id] ?? ''}
                                  onChange={e => setChaves(c => ({ ...c, [s.id]: e.target.value }))}
                                  placeholder="chave PIX"
                                  className="border rounded px-2 py-1 text-xs w-32 font-mono"
                                />
                                <button
                                  onClick={() => confirmarPix.mutate({
                                    id: s.id,
                                    chave_pix: chaves[s.id] ?? '',
                                    pix_id_transacao: `pix-${s.id.slice(0, 8)}`,
                                  })}
                                  disabled={!chaves[s.id]}
                                  className="bg-amber-500 text-white px-2 py-1 rounded text-xs hover:bg-amber-600 disabled:opacity-60"
                                >
                                  Pagar
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ))}
        {repasses?.length === 0 && (
          <p className="text-slate-400 text-sm">Nenhum repasse criado ainda.</p>
        )}
      </div>
    </div>
  )
}
