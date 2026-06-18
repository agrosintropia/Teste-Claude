"""
Painel Admin — ativação de contas e aprovação de pontos de entrega.
Todos os endpoints exigem role='admin'.
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.api.v1.deps import require_role
from app.models.user import User
from app.models.produtor import Produtor
from app.models.comprador import Comprador
from app.models.ponto_entrega import PontoEntrega
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/admin", tags=["admin"])
_admin_only = require_role("admin")


@router.get("/pendentes/produtores")
async def listar_produtores_pendentes(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(_admin_only),
):
    """Produtores com audit_status='pendente' aguardando agendamento de auditoria."""
    rows = await db.scalars(
        select(Produtor).where(Produtor.audit_status == "pendente")
    )
    return [
        {
            "produtor_id": str(p.id),
            "user_id": str(p.user_id),
            "propriedade_nome": p.propriedade_nome,
            "municipio": p.municipio,
            "estado": p.estado,
            "car_numero": p.car_numero,
            "criado_em": p.criado_em.isoformat(),
        }
        for p in rows
    ]


@router.patch("/produtores/{produtor_id}/ativar")
async def ativar_produtor(
    produtor_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(_admin_only),
):
    """Ativa o produtor após auditoria aprovada (simplificado; Fase 3 terá fluxo completo)."""
    produtor = await db.get(Produtor, produtor_id)
    if not produtor:
        raise HTTPException(status_code=404, detail="Produtor não encontrado")

    produtor.audit_status = "aprovada"
    produtor.data_ultima_auditoria = datetime.now(timezone.utc).date()
    produtor.data_proxima_auditoria = (datetime.now(timezone.utc) + timedelta(days=365)).date()

    # Ativa o user para conseguir fazer login
    user = await db.get(User, produtor.user_id)
    if user:
        user.ativo = True

    await db.commit()
    return {"message": "Produtor ativado com sucesso"}


@router.get("/pendentes/compradores")
async def listar_compradores_pendentes(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(_admin_only),
):
    rows = await db.scalars(select(Comprador).where(Comprador.aprovado == False))  # noqa: E712
    return [
        {
            "comprador_id": str(c.id),
            "razao_social": c.razao_social,
            "cnpj": c.cnpj,
            "tipo": c.tipo,
            "municipio": c.municipio,
            "estado": c.estado,
        }
        for c in rows
    ]


@router.patch("/compradores/{comprador_id}/aprovar")
async def aprovar_comprador(
    comprador_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(_admin_only),
):
    comprador = await db.get(Comprador, comprador_id)
    if not comprador:
        raise HTTPException(status_code=404, detail="Comprador não encontrado")

    comprador.aprovado = True
    user = await db.get(User, comprador.user_id)
    if user:
        user.ativo = True

    await db.commit()
    return {"message": "Comprador aprovado"}


@router.get("/pendentes/pontos-entrega")
async def listar_pontos_pendentes(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(_admin_only),
):
    rows = await db.scalars(
        select(PontoEntrega).where(PontoEntrega.aprovado == False, PontoEntrega.ativo == True)  # noqa: E712
    )
    return [
        {
            "ponto_id": str(p.id),
            "comprador_id": str(p.comprador_id),
            "nome": p.nome,
            "municipio": p.municipio,
            "estado": p.estado,
            "latitude": float(p.latitude),
            "longitude": float(p.longitude),
            "raio_km": p.raio_km,
        }
        for p in rows
    ]


@router.patch("/pontos-entrega/{ponto_id}/aprovar")
async def aprovar_ponto_entrega(
    ponto_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(_admin_only),
):
    ponto = await db.get(PontoEntrega, ponto_id)
    if not ponto:
        raise HTTPException(status_code=404, detail="Ponto de entrega não encontrado")

    ponto.aprovado = True
    await db.commit()
    return {"message": "Ponto de entrega aprovado — produtores no raio já podem ser agrupados aqui"}
