"""
Motor de Leilão — criação, lances e encerramento.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi import HTTPException

from app.models.leilao import Leilao, Lance
from app.models.lote import Lote
from app.models.comprador import Comprador
from app.models.ponto_entrega import PontoEntrega


async def criar_leilao(db: AsyncSession, lote_id: uuid.UUID, inicio: datetime,
                       fim: datetime, preco_minimo_kg: float) -> Leilao:
    lote = await db.get(Lote, lote_id)
    if not lote:
        raise HTTPException(status_code=404, detail="Lote não encontrado")
    if lote.status not in ("formando", "aberto"):
        raise HTTPException(status_code=409, detail=f"Lote já está em status '{lote.status}'")

    existente = await db.scalar(select(Leilao).where(Leilao.lote_id == lote_id))
    if existente:
        raise HTTPException(status_code=409, detail="Já existe leilão para este lote")

    leilao = Leilao(
        lote_id=lote_id,
        inicio=inicio,
        fim=fim,
        preco_minimo_kg=preco_minimo_kg,
        status="agendado",
    )
    lote.status = "em_leilao"
    db.add(leilao)
    await db.commit()
    await db.refresh(leilao)
    return leilao


async def abrir_leilao(db: AsyncSession, leilao_id: uuid.UUID) -> Leilao:
    leilao = await db.get(Leilao, leilao_id)
    if not leilao:
        raise HTTPException(status_code=404, detail="Leilão não encontrado")
    if leilao.status != "agendado":
        raise HTTPException(status_code=409, detail=f"Leilão já está em status '{leilao.status}'")
    leilao.status = "aberto"
    await db.commit()
    await db.refresh(leilao)
    return leilao


async def fazer_lance(db: AsyncSession, leilao_id: uuid.UUID,
                      comprador_id: uuid.UUID, valor_kg: float) -> Lance:
    leilao = await db.get(Leilao, leilao_id)
    if not leilao:
        raise HTTPException(status_code=404, detail="Leilão não encontrado")
    if leilao.status != "aberto":
        raise HTTPException(status_code=409, detail="Leilão não está aberto para lances")

    agora = datetime.now(timezone.utc)
    if agora < leilao.inicio:
        raise HTTPException(status_code=409, detail="Leilão ainda não começou")
    if agora > leilao.fim:
        raise HTTPException(status_code=409, detail="Leilão já encerrou")

    if valor_kg <= leilao.preco_minimo_kg:
        raise HTTPException(
            status_code=422,
            detail=f"Lance deve ser superior ao preço mínimo de R$ {leilao.preco_minimo_kg:.4f}/kg"
        )
    if leilao.preco_atual_kg and valor_kg <= leilao.preco_atual_kg:
        raise HTTPException(
            status_code=422,
            detail=f"Lance deve ser superior ao lance atual de R$ {leilao.preco_atual_kg:.4f}/kg"
        )

    comprador = await db.get(Comprador, comprador_id)
    if not comprador or not comprador.aprovado:
        raise HTTPException(status_code=403, detail="Comprador não habilitado para lances")

    # Atravessadores só podem dar lance em lotes dentro dos seus pontos de entrega
    if comprador.tipo == "atravessador":
        lote = await db.get(Lote, leilao.lote_id)
        ponto = await db.get(PontoEntrega, lote.ponto_entrega_id)
        if ponto.comprador_id != comprador_id:
            raise HTTPException(status_code=403, detail="Atravessador só pode dar lance em lotes do seu ponto de entrega")

    # Marca lances anteriores como superados
    await db.execute(
        update(Lance)
        .where(Lance.leilao_id == leilao_id, Lance.status == "ativo")
        .values(status="superado")
    )

    lance = Lance(
        leilao_id=leilao_id,
        comprador_id=comprador_id,
        valor_kg=valor_kg,
        status="ativo",
    )
    leilao.preco_atual_kg = valor_kg
    db.add(lance)
    await db.commit()
    await db.refresh(lance)
    return lance


async def encerrar_leilao(db: AsyncSession, leilao_id: uuid.UUID) -> dict:
    leilao = await db.get(Leilao, leilao_id)
    if not leilao:
        raise HTTPException(status_code=404, detail="Leilão não encontrado")
    if leilao.status not in ("aberto", "agendado"):
        raise HTTPException(status_code=409, detail=f"Leilão já está em status '{leilao.status}'")

    agora = datetime.now(timezone.utc)
    leilao.encerrado_em = agora
    leilao.status = "encerrado"

    lote = await db.get(Lote, leilao.lote_id)

    # Busca lance vencedor (mais alto)
    lance_vencedor = await db.scalar(
        select(Lance)
        .where(Lance.leilao_id == leilao_id, Lance.status == "ativo")
        .order_by(Lance.valor_kg.desc())
        .limit(1)
    )

    if lance_vencedor:
        lance_vencedor.status = "vencedor"
        leilao.vencedor_id = lance_vencedor.comprador_id
        leilao.lance_final_kg = lance_vencedor.valor_kg
        lote.preco_final_kg = lance_vencedor.valor_kg
        lote.comprador_id = lance_vencedor.comprador_id
        lote.status = "vendido"

        # Marca demais lances como perdedores
        await db.execute(
            update(Lance)
            .where(Lance.leilao_id == leilao_id, Lance.status == "superado")
            .values(status="perdedor")
        )
        resultado = "vendido"
    else:
        lote.status = "aberto"  # volta para aberto para novo ciclo
        resultado = "sem_lances"

    await db.commit()
    return {"leilao_id": str(leilao_id), "resultado": resultado,
            "lance_final_kg": float(leilao.lance_final_kg) if leilao.lance_final_kg else None,
            "vencedor_id": str(leilao.vencedor_id) if leilao.vencedor_id else None}


async def encerrar_leiloes_abertos(db: AsyncSession) -> dict:
    """Encerra todos os leilões cujo fim já passou. Chamado pelo Celery beat."""
    agora = datetime.now(timezone.utc)
    rows = await db.scalars(
        select(Leilao).where(
            Leilao.status.in_(["aberto", "agendado"]),
            Leilao.fim <= agora,
        )
    )
    leiloes = list(rows)
    encerrados = 0
    vendidos = 0
    for leilao in leiloes:
        res = await encerrar_leilao(db, leilao.id)
        encerrados += 1
        if res["resultado"] == "vendido":
            vendidos += 1
    return {"encerrados": encerrados, "vendidos": vendidos}


async def get_leilao_detalhe(db: AsyncSession, leilao_id: uuid.UUID) -> dict | None:
    leilao = await db.get(Leilao, leilao_id)
    if not leilao:
        return None

    lances_rows = await db.scalars(
        select(Lance)
        .where(Lance.leilao_id == leilao_id)
        .order_by(Lance.criado_em.desc())
    )
    lances = list(lances_rows)

    return {
        "id": str(leilao.id),
        "lote_id": str(leilao.lote_id),
        "inicio": leilao.inicio,
        "fim": leilao.fim,
        "preco_minimo_kg": float(leilao.preco_minimo_kg),
        "preco_atual_kg": float(leilao.preco_atual_kg) if leilao.preco_atual_kg else None,
        "status": leilao.status,
        "vencedor_id": str(leilao.vencedor_id) if leilao.vencedor_id else None,
        "lance_final_kg": float(leilao.lance_final_kg) if leilao.lance_final_kg else None,
        "encerrado_em": leilao.encerrado_em,
        "criado_em": leilao.criado_em,
        "num_lances": len(lances),
        "lances": [
            {
                "id": str(l.id),
                "leilao_id": str(l.leilao_id),
                "comprador_id": str(l.comprador_id),
                "valor_kg": float(l.valor_kg),
                "status": l.status,
                "criado_em": l.criado_em,
            }
            for l in lances
        ],
    }
