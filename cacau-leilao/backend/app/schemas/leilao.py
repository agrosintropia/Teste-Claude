import uuid
from datetime import datetime
from pydantic import BaseModel, Field, model_validator
from typing import Optional


class LeilaoCreate(BaseModel):
    lote_id: uuid.UUID
    inicio: datetime
    fim: datetime
    preco_minimo_kg: float = Field(..., gt=0)

    @model_validator(mode="after")
    def fim_after_inicio(self):
        if self.fim <= self.inicio:
            raise ValueError("fim deve ser posterior a inicio")
        return self


class LanceCreate(BaseModel):
    valor_kg: float = Field(..., gt=0)


class LanceResponse(BaseModel):
    id: uuid.UUID
    leilao_id: uuid.UUID
    comprador_id: uuid.UUID
    valor_kg: float
    status: str
    criado_em: datetime

    model_config = {"from_attributes": True}


class LeilaoResponse(BaseModel):
    id: uuid.UUID
    lote_id: uuid.UUID
    inicio: datetime
    fim: datetime
    preco_minimo_kg: float
    preco_atual_kg: Optional[float]
    status: str
    vencedor_id: Optional[uuid.UUID]
    lance_final_kg: Optional[float]
    encerrado_em: Optional[datetime]
    criado_em: datetime
    num_lances: int = 0

    model_config = {"from_attributes": True}


class LeilaoDetalheResponse(LeilaoResponse):
    lances: list[LanceResponse] = []
