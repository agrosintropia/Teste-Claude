import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../api/client'
import { StatusBadge } from '../../components/StatusBadge'
import type { DefesaResponse } from '../../api/types'

export function Defesas() {
  const qc = useQueryClient()
  const [texto, setTexto] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState<Record<string, boolean>>({})

  const { data: defesas, isLoading } = useQuery({
    queryKey: ['defesas'],
    queryFn: () => apiGet<DefesaResponse[]>('/produtores/me/defesas'),
  })

  const enviar = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) =>
      apiPost(`/defesas/${id}/resposta`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['defesas'] }),
  })

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-cacau-700">Tribunal de Entregas</h2>
      <p className="text-sm text-slate-500">
        Processos de defesa abertos quando uma entrega não é validada a tempo.
      </p>

      {isLoading && <p className="text-slate-400 text-sm">Carregando...</p>}
      {defesas?.length === 0 && (
        <p className="text-slate-400 text-sm">Nenhum processo de defesa aberto.</p>
      )}

      <div className="space-y-4">
        {defesas?.map(d => (
          <div key={d.id} className="bg-white border rounded-xl p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-sm font-medium text-cacau-700">{d.lote_codigo}</p>
                <p className="text-xs text-slate-500 mt-0.5">Aberto em {new Date(d.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <StatusBadge status={d.status} />
            </div>

            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700">
              <p className="font-medium text-xs text-slate-500 uppercase mb-1">Motivo</p>
              <p>{d.motivo}</p>
            </div>

            {d.resposta_produtor && (
              <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-800">
                <p className="font-medium text-xs uppercase mb-1">Sua resposta</p>
                <p>{d.resposta_produtor}</p>
              </div>
            )}

            {d.status === 'aberto' && !d.resposta_produtor && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Enviar defesa</label>
                <textarea
                  rows={3}
                  value={texto[d.id] ?? ''}
                  onChange={e => setTexto(t => ({ ...t, [d.id]: e.target.value }))}
                  placeholder="Descreva o ocorrido e anexe documentos se necessário..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cacau-500"
                />
                <button
                  onClick={() => {
                    setUploading(u => ({ ...u, [d.id]: true }))
                    enviar.mutate(
                      { id: d.id, body: { resposta_produtor: texto[d.id] } },
                      { onSettled: () => setUploading(u => ({ ...u, [d.id]: false })) }
                    )
                  }}
                  disabled={!texto[d.id]?.trim() || uploading[d.id]}
                  className="bg-cacau-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-cacau-900 disabled:opacity-60"
                >
                  {uploading[d.id] ? 'Enviando...' : 'Enviar defesa'}
                </button>
              </div>
            )}

            {d.decisao && (
              <div className={`rounded-lg p-3 text-sm ${d.status === 'procedente' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                <p className="font-medium text-xs uppercase mb-1">Decisão</p>
                <p>{d.decisao}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
