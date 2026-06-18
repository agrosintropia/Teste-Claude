import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class RepasseResponse(BaseModel):
    id: uuid.UUID
    lote_id: uuid.UUID
    entrega_id: uuid.UUID
    comprador_id: uuid.UUID
    volume_recebido_kg: float
    preco_final_kg: float
    valor_total: float
    comissao_pct: float
    comissao_valor: float
    valor_liquido_produtores: float
    status: str
    pago_em: Optional[datetime]
    pix_id_comprador: Optional[str]
    observacoes: Optional[str]
    criado_em: datetime
    num_splits: int = 0

    model_config = {"from_attributes": True}


class RepasseDetalheResponse(RepasseResponse):
    splits: list["SplitResponse"] = []


class SplitResponse(BaseModel):
    id: uuid.UUID
    repasse_id: uuid.UUID
    produtor_id: uuid.UUID
    volume_kg: float
    percentual_lote: float
    valor_bruto: float
    taxa_anual_deduzida: float
    valor_liquido: float
    chave_pix: Optional[str]
    pix_status: str
    pix_pago_em: Optional[datetime]
    pix_id_transacao: Optional[str]
    criado_em: datetime

    model_config = {"from_attributes": True}


class ConfirmarPagamento(BaseModel):
    pix_id_comprador: str = Field(..., min_length=1)
    observacoes: Optional[str] = None


class ConfirmarPixProdutor(BaseModel):
    chave_pix: str = Field(..., min_length=5)
    pix_id_transacao: str = Field(..., min_length=1)


RepasseDetalheResponse.model_rebuild()
