const colors: Record<string, string> = {
  A: 'bg-green-100 text-green-800',
  B: 'bg-yellow-100 text-yellow-800',
  C: 'bg-orange-100 text-orange-800',
  D: 'bg-red-100 text-red-800',
}

export function FaixaBadge({ faixa }: { faixa: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${colors[faixa] ?? 'bg-slate-100 text-slate-600'}`}>
      Faixa {faixa}
    </span>
  )
}
