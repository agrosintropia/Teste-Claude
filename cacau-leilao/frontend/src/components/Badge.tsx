interface BadgeProps {
  faixa: 'A' | 'B' | 'C' | 'D'
  size?: 'sm' | 'md' | 'lg'
}

const faixaColors = {
  A: 'bg-green-100 text-green-800 border-green-300',
  B: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  C: 'bg-orange-100 text-orange-800 border-orange-300',
  D: 'bg-red-100 text-red-800 border-red-300',
}

const sizes = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
}

export function Badge({ faixa, size = 'md' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center font-bold rounded border ${faixaColors[faixa]} ${sizes[size]}`}>
      Faixa {faixa}
    </span>
  )
}
