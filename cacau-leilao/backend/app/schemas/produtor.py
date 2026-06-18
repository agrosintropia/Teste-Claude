from pydantic import BaseModel, field_validator
import re


class ProdutorCreate(BaseModel):
    cpf: str
    propriedade_nome: str
    municipio: str
    estado: str
    latitude: float
    longitude: float
    propriedade_hectares: float | None = None
    car_numero: str | None = None
    dap_caf: str | None = None

    @field_validator("cpf")
    @classmethod
    def cpf_digits_only(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) != 11:
            raise ValueError("CPF inválido")
        return digits

    @field_validator("estado")
    @classmethod
    def estado_upper(cls, v: str) -> str:
        if len(v) != 2:
            raise ValueError("Estado deve ser a sigla com 2 letras (ex: BA)")
        return v.upper()


class ProdutorResponse(BaseModel):
    id: str
    user_id: str
    cpf: str
    propriedade_nome: str
    municipio: str
    estado: str
    latitude: float | None
    longitude: float | None
    propriedade_hectares: float | None
    car_numero: str | None
    audit_status: str
    compliance_status: str
    regiao_id: int | None

    model_config = {"from_attributes": True}
