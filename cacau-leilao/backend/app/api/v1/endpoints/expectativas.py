import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.api.v1.deps import require_role
from app.schemas.expectativa import ExpectativaCreate, ExpectativaResponse
from app.models.expectativa import ExpectativaProducao
from app.services.produtor_service import get_produtor_by_user

router = APIRouter(prefix="/produtores/me/expectativas", tags=["expectativas"])
_produtor = require_role("produtor")


@router.post("", response_model=ExpectativaResponse, status_code=status.HTTP_201_CREATED)
async def criar_expectativa(
    body: ExpectativaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(_produtor),
):
    """
    Produtor anuncia: "terei X kg para a janela do dia A ao dia B".
    Começa como 'rascunho'. Produtor publica explicitamente para entrar nos lotes.
    """
    produtor = await get_produtor_by_user(db, uuid.UUID(current_user["user_id"]))
    if not produtor:
        raise HTTPException(status_code=404, detail="Perfil de produtor não encontrado")
    if produtor.audit_status != "aprovada":
        raise HTTPException(status_code=403, detail="Aguarde a auditoria ser aprovada para lançar expectativas")
    if produtor.compliance_status != "ok":
        raise HTTPException(status_code=403, detail="Produtor bloqueado por não conformidade")

    exp = ExpectativaProducao(
        produtor_id=produtor.id,
        entrega_inicio=body.entrega_inicio,
        entrega_fim=body.entrega_fim,
        volume_kg=body.volume_kg,
        observacoes=body.observacoes,
        status="rascunho",
    )
    db.add(exp)
    await db.commit()
    await db.refresh(exp)
    return _to_response(exp)


@router.post("/{expectativa_id}/publicar", response_model=ExpectativaResponse)
async def publicar_expectativa(
    expectativa_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(_produtor),
):
    """Produtor confirma a expectativa — ela passa a ser elegível para compor lotes."""
    produtor = await get_produtor_by_user(db, uuid.UUID(current_user["user_id"]))
    exp = await db.get(ExpectativaProducao, expectativa_id)

    if not exp or exp.produtor_id != produtor.id:
        raise HTTPException(status_code=404, detail="Expectativa não encontrada")
    if exp.status != "rascunho":
        raise HTTPException(status_code=409, detail=f"Expectativa já está em status '{exp.status}'")

    exp.status = "publicado"
    await db.commit()
    await db.refresh(exp)
    return _to_response(exp)


@router.get("", response_model=list[ExpectativaResponse])
async def listar_expectativas(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(_produtor),
):
    produtor = await get_produtor_by_user(db, uuid.UUID(current_user["user_id"]))
    if not produtor:
        return []

    rows = await db.scalars(
        select(ExpectativaProducao)
        .where(ExpectativaProducao.produtor_id == produtor.id)
        .order_by(ExpectativaProducao.criado_em.desc())
    )
    return [_to_response(e) for e in rows]


def _to_response(e) -> dict:
    return {
        "id": str(e.id),
        "produtor_id": str(e.produtor_id),
        "entrega_inicio": e.entrega_inicio,
        "entrega_fim": e.entrega_fim,
        "volume_kg": float(e.volume_kg),
        "status": e.status,
        "lote_id": str(e.lote_id) if e.lote_id else None,
        "observacoes": e.observacoes,
    }
