from pydantic import BaseModel
from datetime import date
from typing import Literal


class AuditoriaCreate(BaseModel):
    produtor_id: str
    data_agendada: date
    tipo: Literal["inicial", "anual", "extraordinaria"] = "inicial"


class ChecklistItemInput(BaseModel):
    criterio_id: int
    resposta: Literal["sim", "nao", "parcial", "na"]
    observacao: str | None = None
    evidencia_url: str | None = None


class ChecklistSync(BaseModel):
    """Suporte offline-first: envia lote de respostas de uma vez."""
    itens: list[ChecklistItemInput]


class CriterioResponse(BaseModel):
    id: int
    codigo: str
    area: str
    titulo: str
    descricao: str | None
    pontos_max: int
    obrigatorio: bool

    model_config = {"from_attributes": True}


class AuditoriaResponse(BaseModel):
    id: str
    produtor_id: str
    auditor_id: str
    tipo: str
    data_agendada: date
    data_realizada: date | None
    status: str
    resultado: str | None

    model_config = {"from_attributes": True}


class ScoreResponse(BaseModel):
    id: int
    produtor_id: str
    score_gestao_producao: int
    score_gestao_ambiental: int
    score_gestao_social: int
    score_total: int
    faixa: str
    valido_de: date
    valido_ate: date
    ativo: bool

    model_config = {"from_attributes": True}


class FinalizarAuditoriaResponse(BaseModel):
    resultado: str
    score_total: int
    faixa: str
    score_producao: int
    score_ambiental: int
    score_social: int
    reprovado_por: list[str]
    message: str
