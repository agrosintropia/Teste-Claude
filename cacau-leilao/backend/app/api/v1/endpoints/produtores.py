import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.v1.deps import get_current_user, require_role
from app.schemas.produtor import ProdutorCreate, ProdutorResponse
from app.schemas.comprador import PontoEntregaResponse
from app.services import produtor_service

router = APIRouter(prefix="/produtores", tags=["produtores"])

_produtor_only = require_role("produtor")


@router.post("", response_model=ProdutorResponse, status_code=status.HTTP_201_CREATED)
async def completar_cadastro(
    body: ProdutorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(_produtor_only),
):
    """Produtor preenche dados da propriedade após o registro."""
    user_id = uuid.UUID(current_user["user_id"])
    existente = await produtor_service.get_produtor_by_user(db, user_id)
    if existente:
        raise HTTPException(status_code=409, detail="Cadastro de produtor já existe")

    produtor = await produtor_service.criar_produtor(db, user_id, body)
    return _to_response(produtor)


@router.get("/me", response_model=ProdutorResponse)
async def meu_perfil(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(_produtor_only),
):
    user_id = uuid.UUID(current_user["user_id"])
    produtor = await produtor_service.get_produtor_by_user(db, user_id)
    if not produtor:
        raise HTTPException(status_code=404, detail="Perfil de produtor não encontrado")
    return _to_response(produtor)


@router.get("/me/pontos-entrega", response_model=list[PontoEntregaResponse])
async def pontos_elegiveis(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(_produtor_only),
):
    """Lista pontos de entrega dentro do raio do produtor (para saber onde pode entregar)."""
    user_id = uuid.UUID(current_user["user_id"])
    produtor = await produtor_service.get_produtor_by_user(db, user_id)
    if not produtor or not produtor.latitude or not produtor.longitude:
        raise HTTPException(status_code=404, detail="Cadastro incompleto: GPS necessário")

    pontos = await produtor_service.pontos_entrega_elegiveis(
        db, float(produtor.latitude), float(produtor.longitude)
    )
    return [_ponto_to_response(p) for p in pontos]


def _to_response(p) -> dict:
    return {
        "id": str(p.id),
        "user_id": str(p.user_id),
        "cpf": p.cpf,
        "propriedade_nome": p.propriedade_nome,
        "municipio": p.municipio,
        "estado": p.estado,
        "latitude": float(p.latitude) if p.latitude else None,
        "longitude": float(p.longitude) if p.longitude else None,
        "propriedade_hectares": float(p.propriedade_hectares) if p.propriedade_hectares else None,
        "car_numero": p.car_numero,
        "audit_status": p.audit_status,
        "compliance_status": p.compliance_status,
        "regiao_id": p.regiao_id,
    }


def _ponto_to_response(p) -> dict:
    return {
        "id": str(p.id),
        "comprador_id": str(p.comprador_id),
        "nome": p.nome,
        "municipio": p.municipio,
        "estado": p.estado,
        "latitude": float(p.latitude),
        "longitude": float(p.longitude),
        "raio_km": p.raio_km,
        "capacidade_kg": float(p.capacidade_kg) if p.capacidade_kg else None,
        "aprovado": p.aprovado,
        "ativo": p.ativo,
    }
