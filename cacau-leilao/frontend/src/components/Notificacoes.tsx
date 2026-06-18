import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../api/client'

interface Notificacao {
  id: string
  tipo: string
  titulo: string
  mensagem: string
  lida: boolean
  created_at: string
  link?: string
}

export function Notificacoes() {
  const [open, setOpen] = useState(false)

  const { data: notifs } = useQuery({
    queryKey: ['notificacoes'],
    queryFn: () => apiGet<Notificacao[]>('/me/notificacoes'),
    refetchInterval: 30_000,
    // Silencia erros se o endpoint ainda não existe
    retry: false,
  })

  const naoLidas = notifs?.filter(n => !n.lida).length ?? 0

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative text-white/70 hover:text-white transition-colors"
        title="Notificações"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {naoLidas > 0 && (
          <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-8 w-80 bg-white border rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Notificações</p>
            {naoLidas > 0 && (
              <span className="text-xs text-amber-600 font-medium">{naoLidas} nova(s)</span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {!notifs?.length && (
              <p className="text-slate-400 text-sm p-4 text-center">Nenhuma notificação.</p>
            )}
            {notifs?.slice(0, 20).map(n => (
              <div
                key={n.id}
                className={`px-4 py-3 text-sm ${!n.lida ? 'bg-amber-50' : ''}`}
              >
                <p className="font-medium text-slate-800">{n.titulo}</p>
                <p className="text-slate-500 text-xs mt-0.5">{n.mensagem}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(n.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
