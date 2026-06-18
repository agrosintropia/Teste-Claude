import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.api.v1.deps import get_current_user, require_role
from app.schemas.entrega import (
    NfeUpload, BalancaRegistro, EntregaResponse,
    DefesaCreate, JulgamentoDefesa, DefesaResponse,
)
from app.models.entrega import Entrega, ProcessoDefesa
from app.models.comprador import Comprador
from app.models.produtor import Produtor
from app.services import entrega_service
from app.services.produtor_service import get_produtor_by_user

router = APIRouter(tags=["entregas"])
_admin = require_role("admin")
_comprador = require_role("atravessador", "moageira")
_produtor_role = require_role("produtor")


# ---------------------------------------------------------------------------
# Entrega — leitura
# ---------------------------------------------------------------------------

@router.get("/entregas/{entrega_id}", response_model=EntregaResponse)
async def detalhe_entrega(
    entrega_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    entrega = await db.get(Entrega, entrega_id)
    if not entrega:
        raise HTTPException(status_code=404, detail="Entrega não encontrada")

    role = current_user["role"]
    if role in ("atravessador", "moageira"):
        comprador = await db.scalar(
            select(Comprador).where(Comprador.user_id == uuid.UUID(current_user["user_id"]))
        )
        if not comprador or entrega.comprador_id != comprador.id:
            raise HTTPException(status_code=403, detail="Acesso negado")

    return entrega


@router.get("/lotes/{lote_id}/entrega", response_model=EntregaResponse)
async def entrega_do_lote(
    lote_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    entrega = await db.scalar(select(Entrega).where(Entrega.lote_id == lote_id))
    if not entrega:
        raise HTTPException(status_code=404, detail="Entrega não encontrada para este lote")
    return entrega


# ---------------------------------------------------------------------------
# Motor Fiscal — NF-e
# ---------------------------------------------------------------------------

@router.post("/entregas/{entrega_id}/nfe", response_model=EntregaResponse)
async def upload_nfe(
    entrega_id: uuid.UUID,
    body: NfeUpload,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(_comprador),
):
    comprador = await db.scalar(
        select(Comprador).where(Comprador.user_id == uuid.UUID(current_user["user_id"]))
    )
    if not comprador:
        raise HTTPException(status_code=404, detail="Perfil de comprador não encontrado")

    entrega = await entrega_service.upload_nfe(
        db, entrega_id, comprador.id, body.nfe_numero, body.nfe_url, body.nfe_tipo
    )
    return entrega


@router.post("/entregas/{entrega_id}/validar-nfe", response_model=EntregaResponse)
async def validar_nfe(
    entrega_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(_admin),
):
    entrega = await entrega_service.validar_nfe(db, entrega_id, uuid.UUID(current_user["user_id"]))
    return entrega


# ---------------------------------------------------------------------------
# Módulo de Balança — registro de peso via QR Code
# ---------------------------------------------------------------------------

@router.post("/entregas/qr/{qr_token}/balanca", response_model=EntregaResponse)
async def registrar_peso(
    qr_token: str,
    body: BalancaRegistro,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(_comprador),
):
    comprador = await db.scalar(
        select(Comprador).where(Comprador.user_id == uuid.UUID(current_user["user_id"]))
    )
    if not comprador:
        raise HTTPException(status_code=404, detail="Perfil de comprador não encontrado")

    entrega = await entrega_service.registrar_peso(
        db, qr_token, comprador.id,
        body.volume_recebido_kg, body.umidade_pct, body.fermentacao_pct, body.qualidade_obs
    )
    return entrega


@router.post("/entregas/{entrega_id}/validar", response_model=EntregaResponse)
async def validar_entrega(
    entrega_id: uuid.UUID,
    observacoes: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(_admin),
):
    entrega = await entrega_service.validar_entrega(
        db, entrega_id, uuid.UUID(current_user["user_id"]), observacoes
    )
    return entrega


# ---------------------------------------------------------------------------
# Tribunal de Entregas — defesa do produtor
# ---------------------------------------------------------------------------

@router.get("/produtores/me/defesas", response_model=list[DefesaResponse])
async def listar_defesas(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(_produtor_role),
):
    produtor = await get_produtor_by_user(db, uuid.UUID(current_user["user_id"]))
    if not produtor:
        return []
    rows = await db.scalars(
        select(ProcessoDefesa)
        .where(ProcessoDefesa.produtor_id == produtor.id)
        .order_by(ProcessoDefesa.criado_em.desc())
    )
    return list(rows)


@router.post("/defesas/{processo_id}/submeter", response_model=DefesaResponse)
async def submeter_defesa(
    processo_id: uuid.UUID,
    body: DefesaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(_produtor_role),
):
    produtor = await get_produtor_by_user(db, uuid.UUID(current_user["user_id"]))
    if not produtor:
        raise HTTPException(status_code=404, detail="Perfil de produtor não encontrado")

    processo = await entrega_service.submeter_defesa(
        db, produtor.id, processo_id, body.descricao, body.evidencias_urls
    )
    return processo


@router.get("/admin/defesas", response_model=list[DefesaResponse])
async def listar_defesas_admin(
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(_admin),
):
    query = select(ProcessoDefesa).order_by(ProcessoDefesa.criado_em.desc())
    if status:
        query = query.where(ProcessoDefesa.status == status)
    rows = await db.scalars(query)
    return list(rows)


@router.post("/admin/defesas/{processo_id}/julgar", response_model=DefesaResponse)
async def julgar_defesa(
    processo_id: uuid.UUID,
    body: JulgamentoDefesa,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(_admin),
):
    processo = await entrega_service.julgar_defesa(
        db, processo_id, uuid.UUID(current_user["user_id"]),
        body.decisao, body.aprovado, body.multa_valor, body.novo_status_compliance
    )
    return processo
