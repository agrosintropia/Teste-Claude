import { useState, FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../api/client'
import type { TaxaAnualVigenteResponse, PrecoArrobaResponse } from '../../api/types'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function AdminTarifas() {
  const qc = useQueryClient()
  const [preco, setPreco] = useState('')
  const [ano, setAno] = useState(String(new Date().getFullYear()))
  const [resultado, setResultado] = useState<PrecoArrobaResponse | null>(null)
  const [erro, setErro] = useState('')

  const { data: taxa } = useQuery({
    queryKey: ['taxa-anual'],
    queryFn: () => apiGet<TaxaAnualVigenteResponse>('/tarifas/taxa-anual'),
  })

  const registrar = useMutation({
    mutationFn: (body: object) => apiPost('/admin/tarifas/arroba', body),
    onSuccess: (data: unknown) => {
      setResultado(data as PrecoArrobaResponse)
      qc.invalidateQueries({ queryKey: ['taxa-anual'] })
      setPreco('')
    },
    onError: (e: Error) => setErro(e.message),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault(); setErro(''); setResultado(null)
    registrar.mutate({ preco_arroba: parseFloat(preco), ano_referencia: parseInt(ano) })
  }

  return (
    <div className="space-y-6 max-w-xl">
      <h2 className="text-xl font-bold text-cacau-700">Tarifas & Preço da Arroba</h2>

      {taxa && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">
            Taxa Anual Vigente
          </p>
          <p className="text-3xl font-bold text-amber-700">{brl(taxa.taxa_anual_rs)}</p>
          <p className="text-sm text-amber-600 mt-1">{taxa.equivalencia_arroba}</p>
          <div className="mt-3 text-xs text-slate-500 space-y-0.5">
            <p>Preço de referência: {taxa.preco_arroba_referencia ? brl(taxa.preco_arroba_referencia) : '—'}/arroba</p>
            <p>Ano de referência: {taxa.ano_referencia_arroba ?? '—'}</p>
            <p>Fonte: {taxa.fonte}</p>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-xl p-5">
        <h3 className="font-semibold text-slate-700 mb-4">Registrar preço médio da arroba</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Preço médio (R$/arroba)
              </label>
              <input
                type="number" step="0.01" min="1" required
                value={preco} onChange={e => setPreco(e.target.value)}
                placeholder="ex: 450.00"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cacau-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ano de referência
              </label>
              <input
                type="number" min="2020" required
                value={ano} onChange={e => setAno(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cacau-500"
              />
            </div>
          </div>

          <p className="text-xs text-slate-500">
            A taxa anual do próximo ano será definida como o valor informado acima
            (1 arroba = 15 kg de referência ao serviço anual).
          </p>

          {erro && <p className="text-red-600 text-sm">{erro}</p>}

          {resultado && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              <p>Preço registrado: <strong>{brl(resultado.preco_arroba)}/arroba</strong></p>
              <p>Taxa {resultado.ano_referencia + 1}: <strong>{brl(resultado.taxa_anual_ano_seguinte)}</strong></p>
              <p className="text-xs text-green-600 mt-0.5">{resultado.equivalencia}</p>
            </div>
          )}

          <button
            type="submit" disabled={registrar.isPending}
            className="bg-cacau-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-cacau-900 disabled:opacity-60"
          >
            {registrar.isPending ? 'Registrando...' : 'Registrar preço'}
          </button>
        </form>
      </div>
    </div>
  )
}
