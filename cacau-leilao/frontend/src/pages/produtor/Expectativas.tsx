import { useState, FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../api/client'
import { StatusBadge } from '../../components/StatusBadge'
import type { ExpectativaResponse } from '../../api/types'

export function Expectativas() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ volume_kg: '', entrega_inicio: '', entrega_fim: '', observacoes: '' })
  const [erro, setErro] = useState('')

  const { data: lista, isLoading } = useQuery({
    queryKey: ['expectativas'],
    queryFn: () => apiGet<ExpectativaResponse[]>('/produtores/me/expectativas'),
  })

  const criar = useMutation({
    mutationFn: (body: object) => apiPost('/produtores/me/expectativas', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expectativas'] }); setShowForm(false); setForm({ volume_kg: '', entrega_inicio: '', entrega_fim: '', observacoes: '' }) },
    onError: (e: Error) => setErro(e.message),
  })

  const publicar = useMutation({
    mutationFn: (id: string) => apiPost(`/produtores/me/expectativas/${id}/publicar`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expectativas'] }),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault(); setErro('')
    criar.mutate({ ...form, volume_kg: parseFloat(form.volume_kg) })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-cacau-700">Expectativas de Produção</h2>
        <button onClick={() => setShowForm(s => !s)}
          className="bg-cacau-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-cacau-900">
          + Nova Expectativa
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-slate-700">Nova expectativa</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Volume (kg)" type="number" min="1" step="0.01" required
              value={form.volume_kg} onValue={v => setForm(f => ({ ...f, volume_kg: v }))} />
            <Field label="Início da entrega" type="date" required
              value={form.entrega_inicio} onValue={v => setForm(f => ({ ...f, entrega_inicio: v }))} />
            <Field label="Fim da entrega" type="date" required
              value={form.entrega_fim} onValue={v => setForm(f => ({ ...f, entrega_fim: v }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
            <textarea rows={2} value={form.observacoes}
              onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cacau-500" />
          </div>
          {erro && <p className="text-red-600 text-sm">{erro}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={criar.isPending}
              className="bg-cacau-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-cacau-900 disabled:opacity-60">
              {criar.isPending ? 'Salvando...' : 'Salvar rascunho'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg text-sm border hover:bg-slate-50">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {isLoading && <p className="text-slate-400 text-sm">Carregando...</p>}
      <div className="space-y-2">
        {lista?.map(e => (
          <div key={e.id} className="bg-white border rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-800">{e.volume_kg.toLocaleString('pt-BR')} kg</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {e.entrega_inicio} → {e.entrega_fim}
                {e.lote_id && <span className="ml-2 text-green-600">· alocado no lote</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={e.status} />
              {e.status === 'rascunho' && (
                <button onClick={() => publicar.mutate(e.id)}
                  className="text-xs bg-amber-500 text-white px-3 py-1 rounded-full hover:bg-amber-600">
                  Publicar
                </button>
              )}
            </div>
          </div>
        ))}
        {lista?.length === 0 && (
          <p className="text-slate-400 text-sm">Nenhuma expectativa cadastrada ainda.</p>
        )}
      </div>
    </div>
  )
}

function Field({ label, onValue, ...props }: { label: string; onValue: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input {...props} onChange={e => onValue(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cacau-500" />
    </div>
  )
}
