from pydantic import BaseModel, field_validator
from typing import Literal
import re


class CompradorCreate(BaseModel):
    cnpj: str
    tipo: Literal["atravessador", "moageira"]
    razao_social: str
    municipio: str
    estado: str

    @field_validator("cnpj")
    @classmethod
    def cnpj_digits_only(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) != 14:
            raise ValueError("CNPJ inválido")
        return digits

    @field_validator("estado")
    @classmethod
    def estado_upper(cls, v: str) -> str:
        return v.upper()


class CompradorResponse(BaseModel):
    id: str
    user_id: str
    cnpj: str
    tipo: str
    razao_social: str
    municipio: str
    estado: str
    aprovado: bool

    model_config = {"from_attributes": True}


class PontoEntregaCreate(BaseModel):
    nome: str
    endereco: str
    municipio: str
    estado: str
    latitude: float
    longitude: float
    raio_km: int = 50
    capacidade_kg: float | None = None
    contato_nome: str | None = None
    contato_tel: str | None = None

    @field_validator("estado")
    @classmethod
    def estado_upper(cls, v: str) -> str:
        return v.upper()

    @field_validator("raio_km")
    @classmethod
    def raio_valido(cls, v: int) -> int:
        if not (10 <= v <= 200):
            raise ValueError("Raio deve estar entre 10 e 200 km")
        return v


class PontoEntregaResponse(BaseModel):
    id: str
    comprador_id: str
    nome: str
    municipio: str
    estado: str
    latitude: float
    longitude: float
    raio_km: int
    capacidade_kg: float | None
    aprovado: bool
    ativo: bool

    model_config = {"from_attributes": True}
