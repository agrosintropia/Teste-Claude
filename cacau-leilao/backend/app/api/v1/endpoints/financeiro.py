import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.api.v1.deps import get_current_user, require_role
from app.schemas.financeiro import (
    RepasseResponse, RepasseDetalheResponse, SplitResponse,
    ConfirmarPagamento, ConfirmarPixProdutor,
    PrecoArrobaInput, PrecoArrobaResponse, TaxaAnualVigenteResponse,
)
from app.models.pagamento import RepasseLote, SplitProdutor
from app.services import financeiro_service
from app.services.produtor_service import get_produtor_by_user

router = APIRouter(tags=["financeiro"])
_admin = require_role("admin")
_comprador = require_role("atravessador", "moageira")
_produtor_role = require_role("produtor")


# ---------------------------------------------------------------------------
# Taxa anual — preço médio da arroba
# ---------------------------------------------------------------------------

@router.get("/tarifas/taxa-anual", response_model=TaxaAnualVigenteResponse)
async def taxa_anual_vigente(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Taxa anual vigente = 1 arroba de cacau pelo preço médio do ano anterior."""
    return await financeiro_service.get_taxa_anual_vigente(db)


@router.post("/admin/tarifas/arroba", response_model=PrecoArrobaResponse)
async def registrar_preco_arroba(
    body: PrecoArrobaInput,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(_admin),
):
    """
    Admin registra o preço médio da arroba (15 kg) de cacau do ano de referência.
    A taxa anual do ano seguinte é derivada automaticamente: 1 arroba = esse valor.

    Exemplo: arroba 2024 = R$ 200,00 → taxa anual 2025 = R$ 200,00
    Fonte recomendada: CEPEA/ESALQ (média anual cacau em amêndoa, Bahia).
    """
    return await financeiro_service.registrar_preco_arroba(db, body.preco_arroba, body.ano_referencia)


# ---------------------------------------------------------------------------
# Repasse — cálculo e acompanhamento
# ---------------------------------------------------------------------------

@router.post("/lotes/{lote_id}/repasse", response_model=RepasseResponse, status_code=201)
async def calcular_repasse(
    lote_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(_admin),
):
    """
    Calcula e cria o repasse financeiro do lote após entrega validada.
    Gera automaticamente os splits por produtor com taxa anual deduzida na primeira venda.
    """
    repasse = await financeiro_service.calcular_repasse(db, lote_id)
    return await _repasse_resumo(db, repasse)


@router.get("/lotes/{lote_id}/repasse", response_model=RepasseDetalheResponse)
async def detalhe_repasse_por_lote(
    lote_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    repasse = await db.scalar(select(RepasseLote).where(RepasseLote.lote_id == lote_id))
    if not repasse:
        raise HTTPException(status_code=404, detail="Repasse não encontrado para este lote")

    detalhe = await financeiro_service.get_repasse_detalhe(db, repasse.id)

    # Compradores veem apenas o próprio repasse
    role = current_user["role"]
    if role in ("atravessador", "moageira"):
        from app.models.comprador import Comprador
        comp = await db.scalar(
            select(Comprador).where(Comprador.user_id == uuid.UUID(current_user["user_id"]))
        )
        if not comp or str(repasse.comprador_id) != str(comp.id):
            raise HTTPException(status_code=403, detail="Acesso negado")
        # Comprador não vê splits detalhados
        detalhe["splits"] = []

    return detalhe


@router.get("/repasses/{repasse_id}", response_model=RepasseDetalheResponse)
async def detalhe_repasse(
    repasse_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(_admin),
):
    detalhe = await financeiro_service.get_repasse_detalhe(db, repasse_id)
    if not detalhe:
        raise HTTPException(status_code=404, detail="Repasse não encontrado")
    return detalhe


# ---------------------------------------------------------------------------
# Confirmação de recebimento do comprador
# ---------------------------------------------------------------------------

@router.post("/repasses/{repasse_id}/confirmar-pagamento", response_model=RepasseResponse)
async def confirmar_pagamento(
    repasse_id: uuid.UUID,
    body: ConfirmarPagamento,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(_admin),
):
    """Admin confirma que o PIX do comprador chegou na conta LoteForte."""
    repasse = await financeiro_service.confirmar_pagamento_comprador(
        db, repasse_id, body.pix_id_comprador, body.observacoes
    )
    return await _repasse_resumo(db, repasse)


# ---------------------------------------------------------------------------
# Splits — execução dos PIX para produtores
# ---------------------------------------------------------------------------

@router.get("/repasses/{repasse_id}/splits", response_model=list[SplitResponse])
async def listar_splits(
    repasse_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(_admin),
):
    rows = await db.scalars(
        select(SplitProdutor)
        .where(SplitProdutor.repasse_id == repasse_id)
        .order_by(SplitProdutor.criado_em)
    )
    return list(rows)


@router.post("/splits/{split_id}/confirmar-pix", response_model=SplitResponse)
async def confirmar_pix_produtor(
    split_id: uuid.UUID,
    body: ConfirmarPixProdutor,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(_admin),
):
    """Admin confirma que o PIX foi enviado para o produtor."""
    split = await financeiro_service.confirmar_pix_produtor(
        db, split_id, body.chave_pix, body.pix_id_transacao
    )
    return split


# ---------------------------------------------------------------------------
# Produtor — extrato de recebimentos
# ---------------------------------------------------------------------------

@router.get("/produtores/me/recebimentos", response_model=list[SplitResponse])
async def meus_recebimentos(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(_produtor_role),
):
    produtor = await get_produtor_by_user(db, uuid.UUID(current_user["user_id"]))
    if not produtor:
        return []
    rows = await db.scalars(
        select(SplitProdutor)
        .where(SplitProdutor.produtor_id == produtor.id)
        .order_by(SplitProdutor.criado_em.desc())
    )
    return list(rows)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

async def _repasse_resumo(db: AsyncSession, repasse: RepasseLote) -> dict:
    from sqlalchemy import func
    count = await db.scalar(
        select(func.count()).where(SplitProdutor.repasse_id == repasse.id)
    )
    return {
        "id": str(repasse.id),
        "lote_id": str(repasse.lote_id),
        "entrega_id": str(repasse.entrega_id),
        "comprador_id": str(repasse.comprador_id),
        "volume_recebido_kg": float(repasse.volume_recebido_kg),
        "preco_final_kg": float(repasse.preco_final_kg),
        "valor_total": float(repasse.valor_total),
        "comissao_pct": float(repasse.comissao_pct),
        "comissao_valor": float(repasse.comissao_valor),
        "valor_liquido_produtores": float(repasse.valor_liquido_produtores),
        "status": repasse.status,
        "pago_em": repasse.pago_em,
        "pix_id_comprador": repasse.pix_id_comprador,
        "observacoes": repasse.observacoes,
        "criado_em": repasse.criado_em,
        "num_splits": count or 0,
    }
