import { useState, FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiPost } from '../../api/client'

export function Balanca() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ qr_token: '', volume_recebido_kg: '', observacoes: '' })
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  const registrar = useMutation({
    mutationFn: (body: object) => apiPost('/entregas/balanca', body),
    onSuccess: () => {
      setSucesso(true)
      setForm({ qr_token: '', volume_recebido_kg: '', observacoes: '' })
      qc.invalidateQueries({ queryKey: ['entregas-comprador'] })
    },
    onError: (e: Error) => setErro(e.message),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault(); setErro(''); setSucesso(false)
    registrar.mutate({ ...form, volume_recebido_kg: parseFloat(form.volume_recebido_kg) })
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-xl font-bold text-cacau-700">Balança</h2>
        <p className="text-sm text-slate-500 mt-1">
          Registre o peso recebido na plataforma após pesagem física.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Token QR Code</label>
          <input
            type="text" required value={form.qr_token}
            onChange={e => setForm(f => ({ ...f, qr_token: e.target.value }))}
            placeholder="Cole o token do QR Code da entrega"
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cacau-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Volume recebido (kg)</label>
          <input
            type="number" step="0.1" min="0" required value={form.volume_recebido_kg}
            onChange={e => setForm(f => ({ ...f, volume_recebido_kg: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cacau-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
          <textarea
            rows={2} value={form.observacoes}
            onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cacau-500"
          />
        </div>

        {erro && <p className="text-red-600 text-sm">{erro}</p>}
        {sucesso && (
          <p className="text-green-700 text-sm bg-green-50 rounded-lg px-3 py-2">
            Pesagem registrada com sucesso!
          </p>
        )}

        <button
          type="submit" disabled={registrar.isPending}
          className="w-full bg-cacau-700 text-white py-2 rounded-lg text-sm font-medium hover:bg-cacau-900 disabled:opacity-60 transition-colors"
        >
          {registrar.isPending ? 'Registrando...' : 'Confirmar pesagem'}
        </button>
      </form>
    </div>
  )
}
