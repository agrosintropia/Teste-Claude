// Tipos para o módulo de auditoria

export interface CriterioResponse {
  id: number
  codigo: string
  area: string
  titulo: string
  descricao: string | null
  pontos_max: number
  obrigatorio: boolean
}

export interface AuditoriaResponse {
  id: string
  produtor_id: string
  auditor_id: string
  tipo: string
  data_agendada: string
  data_realizada: string | null
  status: string
  resultado: string | null
}

export interface FinalizarAuditoriaResponse {
  resultado: string
  score_total: number
  faixa: string
  score_producao: number
  score_ambiental: number
  score_social: number
  reprovado_por: string[]
  message: string
}

export interface ProdutorListItem {
  id: string
  user_id: string
  nome: string
  municipio: string
  estado: string
  ativo: boolean
}
