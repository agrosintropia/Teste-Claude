import { useState, FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../api/client'
import { FaixaBadge } from '../../components/FaixaBadge'
import { StatusBadge } from '../../components/StatusBadge'
import type { LoteResponse } from '../../api/types'
import type { ProdutorListItem } from '../../api/auditoria-types'

export function AdminFormacaoLotes() {
  const qc = useQueryClient()
  const [resultado, setResultado] = useState<{ lotes_criados: number; expectativas_alocadas: number } | null>(null)
  const [showAuditoria, setShowAuditoria] = useState(false)
  const [audForm, setAudForm] = useState({ produtor_id: '', tipo: 'inicial', data_agendada: '' })
  const [audErro, setAudErro] = useState('')
  const [audOk, setAudOk] = useState(false)

  const { data: lotes, isLoading } = useQuery({
    queryKey: ['admin-lotes'],
    queryFn: () => apiGet<LoteResponse[]>('/lotes'),
  })

  const { data: produtores } = useQuery({
    queryKey: ['admin-produtores'],
    queryFn: () => apiGet<ProdutorListItem[]>('/admin/produtores'),
  })

  const formarLotes = useMutation({
    mutationFn: () => apiPost<{ lotes_criados: number; expectativas_alocadas: number }>('/admin/lotes/formar'),
    onSuccess: (data) => {
      setResultado(data)
      qc.invalidateQueries({ queryKey: ['admin-lotes'] })
    },
  })

  const agendar = useMutation({
    mutationFn: (body: object) => apiPost('/auditorias', body),
    onSuccess: () => { setAudOk(true); setShowAuditoria(false); setAudForm({ produtor_id: '', tipo: 'inicial', data_agendada: '' }) },
    onError: (e: Error) => setAudErro(e.message),
  })

  const handleAuditoria = (e: FormEvent) => {
    e.preventDefault(); setAudErro(''); setAudOk(false)
    agendar.mutate(audForm)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-cacau-700">Formação de Lotes</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAuditoria(s => !s)}
            className="border px-4 py-2 rounded-lg text-sm hover:bg-slate-50"
          >
            + Agendar auditoria
          </button>
          <button
            onClick={() => formarLotes.mutate()}
            disabled={formarLotes.isPending}
            className="bg-cacau-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-cacau-900 disabled:opacity-60"
          >
            {formarLotes.isPending ? 'Formando lotes…' : 'Rodar formação agora'}
          </button>
        </div>
      </div>

      {resultado && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
          <p className="font-semibold">Job executado com sucesso</p>
          <p>{resultado.lotes_criados} lote(s) criado(s) · {resultado.expectativas_alocadas} expectativa(s) alocada(s)</p>
        </div>
      )}

      {showAuditoria && (
        <form onSubmit={handleAuditoria} className="bg-white border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-slate-700">Agendar auditoria</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Produtor</label>
              <select
                required value={audForm.produtor_id}
                onChange={e => setAudForm(f => ({ ...f, produtor_id: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cacau-500"
              >
                <option value="">Selecione...</option>
                {produtores?.map(p => (
                  <option key={p.id} value={p.id}>{p.nome} — {p.municipio}/{p.estado}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
              <select
                value={audForm.tipo}
                onChange={e => setAudForm(f => ({ ...f, tipo: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cacau-500"
              >
                <option value="inicial">Inicial</option>
                <option value="renovacao">Renovação</option>
                <option value="extraordinaria">Extraordinária</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data agendada</label>
              <input
                type="date" required value={audForm.data_agendada}
                onChange={e => setAudForm(f => ({ ...f, data_agendada: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cacau-500"
              />
            </div>
          </div>
          {audErro && <p className="text-red-600 text-sm">{audErro}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={agendar.isPending}
              className="bg-cacau-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-cacau-900 disabled:opacity-60">
              {agendar.isPending ? 'Agendando…' : 'Agendar'}
            </button>
            <button type="button" onClick={() => setShowAuditoria(false)}
              className="border px-4 py-2 rounded-lg text-sm hover:bg-slate-50">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {audOk && (
        <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          Auditoria agendada com sucesso.
        </p>
      )}

      {isLoading && <p className="text-slate-400 text-sm">Carregando lotes…</p>}

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
            <tr>
              {['Código', 'Faixa', 'Região', 'Volume (kg)', 'Produtores', 'Período', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lotes?.map(l => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-medium text-cacau-700">{l.codigo}</td>
                <td className="px-4 py-3"><FaixaBadge faixa={l.faixa_score} /></td>
                <td className="px-4 py-3 text-slate-600">{l.regiao_nome}</td>
                <td className="px-4 py-3">{l.volume_declarado_kg.toLocaleString('pt-BR')}</td>
                <td className="px-4 py-3">{l.num_produtores}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {new Date(l.entrega_inicio).toLocaleDateString('pt-BR')} →{' '}
                  {new Date(l.entrega_fim).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && !lotes?.length && (
          <p className="text-center text-slate-400 text-sm py-6">Nenhum lote encontrado.</p>
        )}
      </div>
    </div>
  )
}
