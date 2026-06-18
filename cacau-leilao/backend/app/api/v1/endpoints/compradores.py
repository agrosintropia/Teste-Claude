import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.v1.deps import require_role
from app.schemas.comprador import CompradorCreate, CompradorResponse, PontoEntregaCreate, PontoEntregaResponse
from app.services import comprador_service

router = APIRouter(prefix="/compradores", tags=["compradores"])

_comprador_only = require_role("atravessador", "moageira")


@router.post("", response_model=CompradorResponse, status_code=status.HTTP_201_CREATED)
async def completar_cadastro(
    body: CompradorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(_comprador_only),
):
    user_id = uuid.UUID(current_user["user_id"])
    existente = await comprador_service.get_comprador_by_user(db, user_id)
    if existente:
        raise HTTPException(status_code=409, detail="Cadastro de comprador já existe")

    comprador = await comprador_service.criar_comprador(db, user_id, body)
    return _to_response(comprador)


@router.get("/me", response_model=CompradorResponse)
async def meu_perfil(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(_comprador_only),
):
    user_id = uuid.UUID(current_user["user_id"])
    comprador = await comprador_service.get_comprador_by_user(db, user_id)
    if not comprador:
        raise HTTPException(status_code=404, detail="Perfil de comprador não encontrado")
    return _to_response(comprador)


@router.post("/me/pontos-entrega", response_model=PontoEntregaResponse, status_code=status.HTTP_201_CREATED)
async def adicionar_ponto(
    body: PontoEntregaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(_comprador_only),
):
    user_id = uuid.UUID(current_user["user_id"])
    comprador = await comprador_service.get_comprador_by_user(db, user_id)
    if not comprador:
        raise HTTPException(status_code=404, detail="Complete o cadastro da empresa primeiro")

    ponto = await comprador_service.adicionar_ponto_entrega(db, comprador.id, body)
    return _ponto_to_response(ponto)


@router.get("/me/pontos-entrega", response_model=list[PontoEntregaResponse])
async def listar_pontos(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(_comprador_only),
):
    user_id = uuid.UUID(current_user["user_id"])
    comprador = await comprador_service.get_comprador_by_user(db, user_id)
    if not comprador:
        return []

    pontos = await comprador_service.listar_pontos_entrega(db, comprador.id)
    return [_ponto_to_response(p) for p in pontos]


def _to_response(c) -> dict:
    return {
        "id": str(c.id),
        "user_id": str(c.user_id),
        "cnpj": c.cnpj,
        "tipo": c.tipo,
        "razao_social": c.razao_social,
        "municipio": c.municipio,
        "estado": c.estado,
        "aprovado": c.aprovado,
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
