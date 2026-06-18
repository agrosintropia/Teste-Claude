import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../api/client'
import { StatusBadge } from '../../components/StatusBadge'
import type { EntregaResponse } from '../../api/types'

export function EntregasComprador() {
  const { data: entregas, isLoading } = useQuery({
    queryKey: ['entregas-comprador'],
    queryFn: () => apiGet<EntregaResponse[]>('/compradores/me/entregas'),
  })

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-cacau-700">Minhas Entregas</h2>

      {isLoading && <p className="text-slate-400 text-sm">Carregando...</p>}
      {entregas?.length === 0 && (
        <p className="text-slate-400 text-sm">Nenhuma entrega registrada.</p>
      )}

      <div className="space-y-3">
        {entregas?.map(e => (
          <div key={e.id} className="bg-white border rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-mono text-sm font-semibold text-cacau-700">{e.lote_codigo}</p>
                <p className="text-xs text-slate-500 mt-0.5">{e.municipio_ponto}</p>
              </div>
              <StatusBadge status={e.status} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-500">Volume declarado</p>
                <p className="font-medium">{e.volume_declarado_kg?.toLocaleString('pt-BR')} kg</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Volume recebido</p>
                <p className="font-medium">{e.volume_recebido_kg?.toLocaleString('pt-BR') ?? '—'} kg</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Preço final</p>
                <p className="font-medium">
                  {e.preco_final_kg
                    ? e.preco_final_kg.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + '/kg'
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">NF-e prazo</p>
                <p className="font-medium">
                  {e.nfe_prazo ? new Date(e.nfe_prazo).toLocaleDateString('pt-BR') : '—'}
                </p>
              </div>
            </div>

            {e.qr_token && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-700">
                QR Code liberado — token: <code className="font-mono">{e.qr_token}</code>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
