import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../api/client'
import { FaixaBadge } from '../../components/FaixaBadge'
import { StatusBadge } from '../../components/StatusBadge'
import { useWebSocket } from '../../hooks/useWebSocket'
import type { LeilaoDetalheResponse, LanceResponse } from '../../api/types'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function SalaLeilao() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [lance, setLance] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const feedRef = useRef<HTMLDivElement>(null)

  const { data: leilao, refetch } = useQuery({
    queryKey: ['leilao', id],
    queryFn: () => apiGet<LeilaoDetalheResponse>(`/leiloes/${id}`),
    refetchInterval: 10_000,
  })

  useWebSocket(`/leiloes/${id ?? ''}`, (_msg) => {
    refetch()
    qc.invalidateQueries({ queryKey: ['lances', id] })
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight
  })

  const { data: lances } = useQuery({
    queryKey: ['lances', id],
    queryFn: () => apiGet<LanceResponse[]>(`/leiloes/${id}/lances`),
    enabled: !!id,
  })

  const handleLance = async () => {
    const valor = parseFloat(lance)
    if (!valor || valor <= 0) { setErro('Valor inválido'); return }
    setErro(''); setEnviando(true)
    try {
      await apiPost(`/leiloes/${id}/lances`, { valor_kg: valor })
      setLance('')
      refetch()
      qc.invalidateQueries({ queryKey: ['lances', id] })
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao enviar lance')
    } finally {
      setEnviando(false)
    }
  }

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight
  }, [lances])

  const encerrado = leilao?.status === 'encerrado' || leilao?.status === 'cancelado'
  const minLance = leilao?.lance_atual_kg ? leilao.lance_atual_kg + 0.01 : leilao?.lance_minimo_kg

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-cacau-700">Sala de Leilão</h2>
          <p className="text-sm text-slate-500 font-mono">{leilao?.lote_codigo}</p>
        </div>
        {leilao && <StatusBadge status={leilao.status} />}
      </div>

      {leilao && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <InfoCard label="Volume" value={`${leilao.lote_volume_kg?.toLocaleString('pt-BR')} kg`} />
          <InfoCard label="Região" value={leilao.lote_regiao ?? '—'} />
          <InfoCard
            label="Lance mínimo"
            value={leilao.lance_minimo_kg ? brl(leilao.lance_minimo_kg) + '/kg' : '—'}
          />
          <InfoCard
            label="Lance atual"
            value={leilao.lance_atual_kg ? brl(leilao.lance_atual_kg) + '/kg' : 'Nenhum'}
            accent
          />
        </div>
      )}

      {leilao && (
        <div className="bg-white border rounded-xl p-4 flex items-center gap-3">
          <FaixaBadge faixa={leilao.lote_faixa_score ?? 'D'} />
          <div className="text-sm">
            <span className="text-slate-500">Score médio: </span>
            <span className="font-medium">{leilao.score_medio?.toFixed(1) ?? '—'}</span>
          </div>
          {leilao.encerra_em && (
            <div className="ml-auto text-sm">
              <span className="text-slate-500">Encerra: </span>
              <span className="font-medium text-red-600">
                {new Date(leilao.encerra_em).toLocaleString('pt-BR')}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Feed de lances
          </div>
          <div ref={feedRef} className="flex-1 overflow-y-auto max-h-72 divide-y divide-slate-50">
            {!lances?.length && (
              <p className="text-slate-400 text-sm p-4">Nenhum lance ainda.</p>
            )}
            {lances?.map(l => (
              <div key={l.id} className="px-4 py-2 flex items-center justify-between text-sm">
                <span className="text-slate-600">{l.comprador_nome}</span>
                <span className="font-bold text-cacau-700">{brl(l.valor_kg)}/kg</span>
                <span className="text-xs text-slate-400">
                  {new Date(l.created_at).toLocaleTimeString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {!encerrado && (
          <div className="bg-white border rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-slate-700">Fazer lance</h3>
            {minLance && (
              <p className="text-xs text-slate-500">
                Lance mínimo: <strong>{brl(minLance)}/kg</strong>
              </p>
            )}
            <div className="flex gap-2">
              <input
                type="number" step="0.01" min={minLance ?? 0}
                value={lance}
                onChange={e => setLance(e.target.value)}
                placeholder="R$/kg"
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cacau-500"
              />
              <button
                onClick={handleLance}
                disabled={enviando || !lance}
                className="bg-amber-500 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-amber-600 disabled:opacity-60"
              >
                {enviando ? '...' : 'Lançar'}
              </button>
            </div>
            {erro && <p className="text-red-600 text-sm">{erro}</p>}
          </div>
        )}

        {encerrado && leilao?.vencedor_nome && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5">
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Leilão encerrado</p>
            <p className="font-bold text-green-800">{leilao.vencedor_nome}</p>
            <p className="text-2xl font-bold text-green-700 mt-1">
              {brl(leilao.lance_atual_kg!)}/kg
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function InfoCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${accent ? 'bg-amber-50 border border-amber-200' : 'bg-white border'}`}>
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`font-bold mt-0.5 ${accent ? 'text-amber-700' : 'text-cacau-700'}`}>{value}</p>
    </div>
  )
}
