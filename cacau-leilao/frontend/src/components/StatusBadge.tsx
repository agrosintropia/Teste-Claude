interface StatusBadgeProps {
  status: string
}

const statusMap: Record<string, { label: string; className: string }> = {
  rascunho: { label: 'Rascunho', className: 'bg-gray-100 text-gray-700' },
  publicada: { label: 'Publicada', className: 'bg-blue-100 text-blue-700' },
  alocada: { label: 'Alocada', className: 'bg-green-100 text-green-700' },
  formado: { label: 'Formado', className: 'bg-blue-100 text-blue-700' },
  em_leilao: { label: 'Em Leilão', className: 'bg-amber-100 text-amber-700' },
  arrematado: { label: 'Arrematado', className: 'bg-green-100 text-green-700' },
  entregue: { label: 'Entregue', className: 'bg-green-100 text-green-700' },
  cancelado: { label: 'Cancelado', className: 'bg-red-100 text-red-700' },
  agendado: { label: 'Agendado', className: 'bg-gray-100 text-gray-700' },
  aberto: { label: 'Aberto', className: 'bg-green-100 text-green-700' },
  encerrado: { label: 'Encerrado', className: 'bg-gray-100 text-gray-700' },
  pendente: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-700' },
  confirmado: { label: 'Confirmado', className: 'bg-green-100 text-green-700' },
  falhou: { label: 'Falhou', className: 'bg-red-100 text-red-700' },
  aberta: { label: 'Aberta', className: 'bg-blue-100 text-blue-700' },
  em_analise: { label: 'Em Análise', className: 'bg-yellow-100 text-yellow-700' },
  resolvida: { label: 'Resolvida', className: 'bg-green-100 text-green-700' },
  encerrada: { label: 'Encerrada', className: 'bg-gray-100 text-gray-700' },
  aguardando_nfe: { label: 'Aguardando NF-e', className: 'bg-yellow-100 text-yellow-700' },
  nfe_enviada: { label: 'NF-e Enviada', className: 'bg-blue-100 text-blue-700' },
  nfe_validada: { label: 'NF-e Validada', className: 'bg-green-100 text-green-700' },
  peso_registrado: { label: 'Peso Registrado', className: 'bg-green-100 text-green-700' },
  concluida: { label: 'Concluída', className: 'bg-green-100 text-green-700' },
  calculado: { label: 'Calculado', className: 'bg-blue-100 text-blue-700' },
  pagamento_confirmado: { label: 'Pagamento Confirmado', className: 'bg-green-100 text-green-700' },
  splits_executados: { label: 'Splits Executados', className: 'bg-green-100 text-green-700' },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusMap[status] ?? { label: status, className: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded ${config.className}`}>
      {config.label}
    </span>
  )
}
