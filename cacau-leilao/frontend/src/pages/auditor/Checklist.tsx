import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../api/client'
import type { CriterioResponse, FinalizarAuditoriaResponse } from '../../api/auditoria-types'

type Resposta = 'sim' | 'nao' | 'na' | ''

interface ItemState {
  pontos: number
  resposta: Resposta
  observacao: string
}

const AREAS = [
  { key: 'gestao_producao', label: 'Gestão da Produção' },
  { key: 'gestao_ambiental', label: 'Gestão Ambiental' },
  { key: 'gestao_social', label: 'Gestão Social' },
]

export function Checklist() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [itens, setItens] = useState<Record<number, ItemState>>({})
  const [resultado, setResultado] = useState<FinalizarAuditoriaResponse | null>(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [finalizando, setFinalizando] = useState(false)

  const { data: criterios, isLoading } = useQuery({
    queryKey: ['criterios'],
    queryFn: () => apiGet<CriterioResponse[]>('/auditorias/criterios'),
  })

  const update = (criterioId: number, field: keyof ItemState, value: string | number) =>
    setItens(prev => ({
      ...prev,
      [criterioId]: { ...{ pontos: 0, resposta: '' as Resposta, observacao: '' }, ...prev[criterioId], [field]: value },
    }))

  const preenchidos = Object.values(itens).filter(i => i.resposta !== '').length
  const total = criterios?.length ?? 0

  const salvar = async () => {
    setSalvando(true); setErro('')
    try {
      const payload = Object.entries(itens)
        .filter(([, v]) => v.resposta !== '')
        .map(([criterio_id, v]) => ({
          criterio_id: parseInt(criterio_id),
          pontos_obtidos: v.resposta === 'sim' ? (criterios?.find(c => c.id === parseInt(criterio_id))?.pontos_max ?? 0) : 0,
          atende: v.resposta === 'sim',
          nao_aplicavel: v.resposta === 'na',
          observacao: v.observacao || null,
        }))
      await apiPost(`/auditorias/${id}/checklist`, { itens: payload })
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const finalizar = async () => {
    await salvar()
    setFinalizando(true); setErro('')
    try {
      const res = await apiPost<FinalizarAuditoriaResponse>(`/auditorias/${id}/finalizar`)
      setResultado(res)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao finalizar')
    } finally {
      setFinalizando(false)
    }
  }

  const criteriosPorArea = useMemo(() => {
    if (!criterios) return {}
    return criterios.reduce<Record<string, CriterioResponse[]>>((acc, c) => {
      ;(acc[c.area] ??= []).push(c)
      return acc
    }, {})
  }, [criterios])

  if (resultado) {
    const cores = { aprovado: 'green', aprovado_com_ressalvas: 'amber', reprovado: 'red' }
    const cor = cores[resultado.resultado as keyof typeof cores] ?? 'slate'
    return (
      <div className="max-w-xl space-y-6">
        <h2 className="text-xl font-bold text-cacau-700">Resultado da Auditoria</h2>
        <div className={`bg-${cor}-50 border border-${cor}-200 rounded-xl p-6 space-y-4`}>
          <div className="flex items-center justify-between">
            <p className={`text-lg font-bold text-${cor}-700 capitalize`}>
              {resultado.resultado.replace(/_/g, ' ')}
            </p>
            <span className={`text-3xl font-bold text-${cor}-700`}>{resultado.score_total}</span>
          </div>
          <p className={`text-sm text-${cor}-600`}>{resultado.message}</p>
          <div className="grid grid-cols-3 gap-2 text-sm text-center">
            {[
              ['Produção', resultado.score_producao],
              ['Ambiental', resultado.score_ambiental],
              ['Social', resultado.score_social],
            ].map(([label, val]) => (
              <div key={label as string} className="bg-white rounded-lg p-2 border">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="font-bold text-cacau-700">{val}</p>
              </div>
            ))}
          </div>
          <p className="text-sm font-semibold">
            Faixa: <span className="text-cacau-700">{resultado.faixa}</span>
          </p>
          {resultado.reprovado_por.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-700 uppercase mb-1">Critérios obrigatórios não atendidos</p>
              <ul className="text-xs text-red-600 space-y-0.5">
                {resultado.reprovado_por.map(c => <li key={c}>• {c}</li>)}
              </ul>
            </div>
          )}
        </div>
        <button onClick={() => navigate('/auditor')}
          className="text-sm text-cacau-700 hover:underline">
          ← Voltar ao painel
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-cacau-700">Checklist CSCacau</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {preenchidos}/{total} critérios respondidos
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={salvar} disabled={salvando || preenchidos === 0}
            className="border px-4 py-2 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-60">
            {salvando ? 'Salvando…' : 'Salvar rascunho'}
          </button>
          <button onClick={finalizar} disabled={finalizando || preenchidos < total * 0.8}
            className="bg-cacau-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-cacau-900 disabled:opacity-60">
            {finalizando ? 'Finalizando…' : 'Finalizar e calcular score'}
          </button>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div
          className="bg-cacau-500 h-2 rounded-full transition-all"
          style={{ width: `${total ? (preenchidos / total) * 100 : 0}%` }}
        />
      </div>

      {erro && <p className="text-red-600 text-sm">{erro}</p>}
      {isLoading && <p className="text-slate-400 text-sm">Carregando critérios…</p>}

      {AREAS.map(area => {
        const lista = criteriosPorArea[area.key] ?? []
        if (!lista.length) return null
        return (
          <section key={area.key} className="space-y-2">
            <h3 className="font-semibold text-slate-700 border-b pb-1">{area.label}</h3>
            {lista.map(c => {
              const estado = itens[c.id] ?? { pontos: 0, resposta: '', observacao: '' }
              return (
                <div key={c.id} className="bg-white border rounded-xl p-4 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">
                        <span className="font-mono text-cacau-700 mr-2">{c.codigo}</span>
                        {c.titulo}
                        {c.obrigatorio && (
                          <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                            obrigatório
                          </span>
                        )}
                      </p>
                      {c.descricao && (
                        <p className="text-xs text-slate-500 mt-0.5">{c.descricao}</p>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 shrink-0">{c.pontos_max} pts</p>
                  </div>

                  <div className="flex gap-2">
                    {(['sim', 'nao', 'na'] as Resposta[]).map(r => (
                      <button
                        key={r}
                        onClick={() => update(c.id, 'resposta', r)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium border transition-colors ${
                          estado.resposta === r
                            ? r === 'sim'
                              ? 'bg-green-600 text-white border-green-600'
                              : r === 'nao'
                              ? 'bg-red-500 text-white border-red-500'
                              : 'bg-slate-400 text-white border-slate-400'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {r === 'sim' ? 'Sim' : r === 'nao' ? 'Não' : 'N/A'}
                      </button>
                    ))}
                  </div>

                  {estado.resposta && (
                    <input
                      type="text"
                      value={estado.observacao}
                      onChange={e => update(c.id, 'observacao', e.target.value)}
                      placeholder="Observação (opcional)"
                      className="w-full text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-cacau-500"
                    />
                  )}
                </div>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
