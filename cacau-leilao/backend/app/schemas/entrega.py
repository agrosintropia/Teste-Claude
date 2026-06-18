import uuid
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field


class NfeUpload(BaseModel):
    nfe_numero: str = Field(..., min_length=1)
    nfe_url: str = Field(..., min_length=1)
    nfe_tipo: str = Field(..., pattern="^(emissao_produtor|contra_nota_comprador)$")


class BalancaRegistro(BaseModel):
    volume_recebido_kg: float = Field(..., gt=0)
    umidade_pct: Optional[float] = Field(None, ge=0, le=100)
    fermentacao_pct: Optional[float] = Field(None, ge=0, le=100)
    qualidade_obs: Optional[str] = None


class EntregaResponse(BaseModel):
    id: uuid.UUID
    lote_id: uuid.UUID
    comprador_id: uuid.UUID
    ponto_entrega_id: uuid.UUID
    data_prevista: date
    data_recebimento: Optional[date]
    volume_declarado_kg: float
    volume_recebido_kg: Optional[float]
    umidade_pct: Optional[float]
    fermentacao_pct: Optional[float]
    qualidade_obs: Optional[str]
    nfe_status: str
    nfe_numero: Optional[str]
    nfe_url: Optional[str]
    nfe_tipo: Optional[str]
    nfe_prazo: Optional[datetime]
    nfe_enviada_em: Optional[datetime]
    qr_code_token: Optional[str]
    qr_code_gerado_em: Optional[datetime]
    qr_code_url: Optional[str]
    status: str
    validado_em: Optional[datetime]
    observacoes: Optional[str]
    criado_em: datetime

    model_config = {"from_attributes": True}


class DefesaCreate(BaseModel):
    descricao: str = Field(..., min_length=20)
    evidencias_urls: list[str] = Field(default_factory=list)


class JulgamentoDefesa(BaseModel):
    decisao: str = Field(..., min_length=10)
    aprovado: bool
    multa_valor: Optional[float] = Field(None, ge=0)
    novo_status_compliance: Optional[str] = Field(
        None, pattern="^(ok|bloqueado|em_defesa|multado|banido)$"
    )


class DefesaResponse(BaseModel):
    id: uuid.UUID
    produtor_id: uuid.UUID
    entrega_id: Optional[uuid.UUID]
    motivo_bloqueio: str
    descricao: str
    evidencias_urls: list[str]
    status: str
    decisao: Optional[str]
    multa_valor: Optional[float]
    criado_em: datetime

    model_config = {"from_attributes": True}
