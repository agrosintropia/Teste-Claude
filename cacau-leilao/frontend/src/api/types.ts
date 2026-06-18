export type Role = 'produtor' | 'atravessador' | 'moageira' | 'auditor' | 'admin'

export interface User {
  id: string
  nome: string
  email: string
  role: Role
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

export interface TokenPayload {
  sub: string
  role: Role
  exp: number
}

export interface ExpectativaResponse {
  id: string
  produtor_id: string
  entrega_inicio: string
  entrega_fim: string
  volume_kg: number
  status: string
  lote_id: string | null
  observacoes: string | null
}

export interface LoteResponse {
  id: string
  codigo: string
  semana_iso: string
  faixa_score: string
  ponto_entrega_id: string
  ponto_entrega_nome: string
  municipio_ponto: string
  estado_ponto: string
  entrega_inicio: string
  entrega_fim: string
  volume_declarado_kg: number
  volume_minimo_kg: number
  status: string
  preco_base_kg: number | null
  bonificacao_pct: number | null
  preco_referencia_kg: number | null
  num_produtores: number
  score_medio: number | null
  regiao_nome: string
  lance_atual_kg: number | null
  leilao_id: string | null
}

export interface LanceResponse {
  id: string
  leilao_id: string
  comprador_id: string
  comprador_nome: string
  valor_kg: number
  status: string
  criado_em: string
  created_at: string
}

export interface LeilaoResponse {
  id: string
  lote_id: string
  inicio: string
  fim: string
  preco_minimo_kg: number
  preco_atual_kg: number | null
  status: string
  vencedor_id: string | null
  lance_final_kg: number | null
  encerrado_em: string | null
  criado_em: string
  num_lances: number
}

export interface LeilaoDetalheResponse extends LeilaoResponse {
  lances: LanceResponse[]
  lote_codigo: string
  lote_volume_kg: number | null
  lote_regiao: string | null
  lote_faixa_score: string | null
  lance_minimo_kg: number | null
  lance_atual_kg: number | null
  encerra_em: string | null
  score_medio: number | null
  vencedor_nome: string | null
}

export interface EntregaResponse {
  id: string
  lote_id: string
  lote_codigo: string
  comprador_id: string
  ponto_entrega_id: string
  data_prevista: string
  data_recebimento: string | null
  volume_declarado_kg: number
  volume_recebido_kg: number | null
  umidade_pct: number | null
  fermentacao_pct: number | null
  qualidade_obs: string | null
  nfe_status: string
  nfe_numero: string | null
  nfe_url: string | null
  nfe_tipo: string | null
  nfe_prazo: string | null
  nfe_enviada_em: string | null
  qr_code_token: string | null
  qr_token: string | null
  qr_code_gerado_em: string | null
  status: string
  validado_em: string | null
  observacoes: string | null
  criado_em: string
  municipio_ponto: string
  preco_final_kg: number | null
}

export interface DefesaResponse {
  id: string
  produtor_id: string
  entrega_id: string | null
  lote_codigo: string
  motivo: string
  motivo_bloqueio: string
  descricao: string
  evidencias_urls: string[]
  status: string
  decisao: string | null
  multa_valor: number | null
  resposta_produtor: string | null
  criado_em: string
  created_at: string
}

export interface SplitResponse {
  id: string
  repasse_id: string
  produtor_id: string
  produtor_nome: string
  volume_kg: number
  percentual_lote: number
  valor_bruto: number
  taxa_anual_deduzida: number
  valor_liquido: number
  chave_pix: string | null
  pix_status: string
  pix_pago_em: string | null
  pix_id_transacao: string | null
  criado_em: string
}

export interface RepasseResponse {
  id: string
  lote_id: string
  entrega_id: string
  comprador_id: string
  volume_recebido_kg: number
  preco_final_kg: number
  valor_total: number
  comissao_pct: number
  comissao_valor: number
  valor_liquido_produtores: number
  status: string
  pago_em: string | null
  pix_id_comprador: string | null
  observacoes: string | null
  criado_em: string
  num_splits: number
}

export interface RepasseDetalheResponse extends RepasseResponse {
  splits: SplitResponse[]
  lote_codigo: string
}

export interface TaxaAnualVigenteResponse {
  taxa_anual_rs: number
  equivalencia_arroba: string
  preco_arroba_referencia: number | null
  ano_referencia_arroba: number | null
  fonte: string
}

export interface PrecoArrobaResponse {
  ano_referencia: number
  preco_arroba: number
  taxa_anual_ano_seguinte: number
  equivalencia: string
}

export interface FormacaoResultado {
  lotes_criados: number
  expectativas_alocadas: number
}
