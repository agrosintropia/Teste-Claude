from pydantic import BaseModel, field_validator
from datetime import date
from typing import Literal


class ExpectativaCreate(BaseModel):
    entrega_inicio: date
    entrega_fim: date
    volume_kg: float
    observacoes: str | None = None

    @field_validator("volume_kg")
    @classmethod
    def volume_positivo(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Volume deve ser maior que zero")
        return v

    @field_validator("entrega_fim")
    @classmethod
    def fim_apos_inicio(cls, v: date, info) -> date:
        inicio = info.data.get("entrega_inicio")
        if inicio and v <= inicio:
            raise ValueError("entrega_fim deve ser posterior a entrega_inicio")
        return v


class ExpectativaResponse(BaseModel):
    id: str
    produtor_id: str
    entrega_inicio: date
    entrega_fim: date
    volume_kg: float
    status: str
    lote_id: str | None
    observacoes: str | None

    model_config = {"from_attributes": True}
