from pydantic import BaseModel
from datetime import date


class ProdutorNoLoteResponse(BaseModel):
    produtor_id: str
    nome: str
    municipio: str
    estado: str
    volume_kg: float
    # dados rastreáveis incluídos para o comprador
    latitude: float | None
    longitude: float | None
    car_numero: str | None
    score_total: int | None
    faixa_score: str


class LoteResponse(BaseModel):
    id: str
    codigo: str
    semana_iso: str
    faixa_score: str
    ponto_entrega_id: str
    ponto_entrega_nome: str
    municipio_ponto: str
    estado_ponto: str
    entrega_inicio: date
    entrega_fim: date
    volume_declarado_kg: float
    volume_minimo_kg: float
    status: str
    preco_base_kg: float | None
    bonificacao_pct: float | None
    preco_referencia_kg: float | None
    num_produtores: int


class LoteDetalheResponse(LoteResponse):
    """Detalhe completo — inclui lista de produtores (rastreabilidade)."""
    produtores: list[ProdutorNoLoteResponse]


class FormacaoResultado(BaseModel):
    lotes_criados: int
    lotes_com_volume_insuficiente: int
    expectativas_alocadas: int
    detalhes: list[str]
