import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.api.v1.deps import get_current_user, require_role
from app.schemas.lote import LoteResponse, LoteDetalheResponse, FormacaoResultado
from app.models.lote import Lote, LoteProdutor
from app.models.ponto_entrega import PontoEntrega
from app.services import lote_service

router = APIRouter(prefix="/lotes", tags=["lotes"])
_admin = require_role("admin")
_comprador = require_role("atravessador", "moageira")


@router.get("", response_model=list[LoteResponse])
async def listar_lotes(
    status: str | None = Query(None, description="Filtrar por status"),
    faixa: str | None = Query(None, description="Faixa de score: A, B ou C"),
    estado: str | None = Query(None, description="UF do ponto de entrega"),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Vitrine de lotes — qualquer usuário autenticado pode consultar."""
    query = select(Lote)
    if status:
        query = query.where(Lote.status == status)
    if faixa:
        query = query.where(Lote.faixa_score == faixa.upper())
    rows = await db.scalars(query.order_by(Lote.criado_em.desc()))
    lotes = list(rows)

    result = []
    for lote in lotes:
        ponto = await db.get(PontoEntrega, lote.ponto_entrega_id)
        if estado and ponto and ponto.estado != estado.upper():
            continue
        num = await db.scalar(
            select(LoteProdutor).where(LoteProdutor.lote_id == lote.id)
        )
        result.append(_to_resumo(lote, ponto, num or 0))

    return result


@router.get("/{lote_id}", response_model=LoteDetalheResponse)
async def detalhe_lote(
    lote_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Detalhe com lista de produtores.
    Compradores veem os dados ESG completos após vencer o leilão.
    Admins e auditores veem sempre.
    """
    detalhe = await lote_service.get_lote_detalhe(db, lote_id)
    if not detalhe:
        raise HTTPException(status_code=404, detail="Lote não encontrado")

    role = current_user["role"]
    # Produtores só veem se fizerem parte do lote
    if role == "produtor":
        user_id = current_user["user_id"]
        ids = [p["produtor_id"] for p in detalhe["produtores"]]
        from app.services.produtor_service import get_produtor_by_user
        prod = await get_produtor_by_user(db, uuid.UUID(user_id))
        if not prod or str(prod.id) not in ids:
            raise HTTPException(status_code=403, detail="Acesso negado")

    # Compradores só veem lista de produtores se o lote estiver vendido/entregue
    if role in ("atravessador", "moageira") and detalhe["status"] not in ("vendido", "entregue", "validado"):
        detalhe["produtores"] = []  # oculta até fechar o leilão

    return detalhe


@router.post("/formar", response_model=FormacaoResultado)
async def formar_lotes_manual(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(_admin),
):
    """
    Dispara a formação de lotes manualmente (admin).
    Em produção, o Celery executa isso toda segunda-feira.
    """
    resultado = await lote_service.formar_lotes(db)
    return resultado


def _to_resumo(lote: Lote, ponto: PontoEntrega | None, num_produtores: int) -> dict:
    return {
        "id": str(lote.id),
        "codigo": lote.codigo,
        "semana_iso": lote.semana_iso,
        "faixa_score": lote.faixa_score,
        "ponto_entrega_id": str(lote.ponto_entrega_id),
        "ponto_entrega_nome": ponto.nome if ponto else "—",
        "municipio_ponto": ponto.municipio if ponto else "—",
        "estado_ponto": ponto.estado if ponto else "—",
        "entrega_inicio": lote.entrega_inicio,
        "entrega_fim": lote.entrega_fim,
        "volume_declarado_kg": float(lote.volume_declarado_kg),
        "volume_minimo_kg": float(lote.volume_minimo_kg),
        "status": lote.status,
        "preco_base_kg": float(lote.preco_base_kg) if lote.preco_base_kg else None,
        "bonificacao_pct": float(lote.bonificacao_pct) if lote.bonificacao_pct else None,
        "preco_referencia_kg": float(lote.preco_referencia_kg) if lote.preco_referencia_kg else None,
        "num_produtores": num_produtores,
    }
