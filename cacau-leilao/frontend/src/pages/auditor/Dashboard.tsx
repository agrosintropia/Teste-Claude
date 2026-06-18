import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../../api/client'
import { StatusBadge } from '../../components/StatusBadge'
import type { AuditoriaResponse } from '../../api/auditoria-types'

export function AuditorDashboard() {
  const navigate = useNavigate()

  const { data: auditorias, isLoading } = useQuery({
    queryKey: ['auditorias-minhas'],
    queryFn: () => apiGet<AuditoriaResponse[]>('/auditorias'),
  })

  const pendentes = auditorias?.filter(a => a.status === 'agendada' || a.status === 'em_andamento') ?? []
  const concluidas = auditorias?.filter(a => a.status === 'aprovada' || a.status === 'reprovada') ?? []

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-cacau-700">Painel do Auditor</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Pendentes" value={pendentes.length} warn={pendentes.length > 0} />
        <Stat label="Concluídas" value={concluidas.length} />
        <Stat label="Total" value={auditorias?.length ?? 0} />
      </div>

      {isLoading && <p className="text-slate-400 text-sm">Carregando...</p>}

      {pendentes.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Pendentes
          </h3>
          <div className="space-y-2">
            {pendentes.map(a => (
              <AuditoriaCard key={a.id} a={a} onOpen={() => navigate(`/auditor/checklist/${a.id}`)} />
            ))}
          </div>
        </section>
      )}

      {concluidas.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Concluídas
          </h3>
          <div className="space-y-2">
            {concluidas.map(a => (
              <AuditoriaCard key={a.id} a={a} />
            ))}
          </div>
        </section>
      )}

      {!isLoading && !auditorias?.length && (
        <p className="text-slate-400 text-sm">Nenhuma auditoria atribuída.</p>
      )}
    </div>
  )
}

function AuditoriaCard({ a, onOpen }: { a: AuditoriaResponse; onOpen?: () => void }) {
  return (
    <div className="bg-white border rounded-xl p-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-800">
          Produtor: <span className="font-mono text-cacau-700">{a.produtor_id.slice(0, 8)}…</span>
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          Agendada: {new Date(a.data_agendada).toLocaleDateString('pt-BR')}
          {a.data_realizada && ` · Realizada: ${new Date(a.data_realizada).toLocaleDateString('pt-BR')}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={a.status} />
        {onOpen && (
          <button
            onClick={onOpen}
            className="text-xs bg-cacau-700 text-white px-3 py-1.5 rounded-lg hover:bg-cacau-900"
          >
            Iniciar checklist
          </button>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={`rounded-xl p-5 border ${warn ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${warn ? 'text-amber-600' : 'text-cacau-700'}`}>{value}</p>
    </div>
  )
}
