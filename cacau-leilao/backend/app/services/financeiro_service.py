"""
Módulo Financeiro MVP — split proporcional via conta única LoteForte.

Fluxo:
  1. Admin chama calcular_repasse() após entrega validada.
  2. Sistema cria RepasseLote + SplitProdutor para cada produtor do lote.
  3. Comprador paga PIX para a conta LoteForte; admin confirma com confirmar_pagamento().
  4. Admin executa PIX individual para cada produtor e registra com confirmar_pix_produtor().
  5. Quando todos os splits estão pagos, repasse → status "distribuido".

Taxa anual = 1 arroba de cacau (15 kg) pelo preço médio do ano anterior no Brasil.
  Fácil para o produtor entender: "pago 1 arroba pelo serviço no ano."
  Admin registra o preço médio anual via POST /admin/tarifas/arroba;
  o sistema deriva e persiste a taxa_anual_produtor automaticamente.

Comissão: percentual sobre o valor total cobrado do comprador (configurável em tarifas).
"""
import uuid
from datetime import datetime, timezone, date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException

from app.models.pagamento import Tarifa, Pagamento, RepasseLote, SplitProdutor
from app.models.lote import Lote, LoteProdutor
from app.models.entrega import Entrega
from app.models.produtor import Produtor

ARROBA_KG = 15.0          # 1 arroba = 15 kg (padrão brasileiro)
_COMISSAO_PCT_DEFAULT = 2.5
_TAXA_ANUAL_DEFAULT = 150.0  # fallback se nenhuma arroba cadastrada


async def registrar_preco_arroba(
    db: AsyncSession, preco_arroba: float, ano_referencia: int
) -> dict:
    """
    Admin informa o preço médio da arroba (15 kg) do cacau no ano de referência.
    A taxa anual para o ano seguinte = 1 arroba = esse valor.
    Desativa registros anteriores do mesmo tipo/ano antes de inserir.
    """
    hoje = date.today()

    # Desativa tarifas anteriores do mesmo ano
    rows = await db.scalars(
        select(Tarifa).where(
            Tarifa.tipo == "preco_medio_arroba",
            Tarifa.ano_referencia == ano_referencia,
            Tarifa.ativo == True,  # noqa: E712
        )
    )
    for t in rows:
        t.ativo = False

    rows2 = await db.scalars(
        select(Tarifa).where(
            Tarifa.tipo == "taxa_anual_produtor",
            Tarifa.ano_referencia == ano_referencia + 1,
            Tarifa.ativo == True,  # noqa: E712
        )
    )
    for t in rows2:
        t.ativo = False

    # Persiste o preço médio de referência
    db.add(Tarifa(
        tipo="preco_medio_arroba",
        valor=preco_arroba,
        ano_referencia=ano_referencia,
        descricao=f"Preço médio da arroba de cacau em {ano_referencia} (CEPEA/ESALQ)",
        vigente_de=hoje,
    ))

    # Persiste a taxa anual derivada (vigente no ano seguinte)
    db.add(Tarifa(
        tipo="taxa_anual_produtor",
        valor=preco_arroba,   # 1 arroba = esse valor em R$
        ano_referencia=ano_referencia + 1,
        descricao=f"Taxa anual {ano_referencia + 1} = 1 arroba ({ARROBA_KG} kg) "
                  f"@ preço médio {ano_referencia} (R$ {preco_arroba:.2f})",
        vigente_de=date(ano_referencia + 1, 1, 1),
    ))

    await db.commit()
    return {
        "ano_referencia": ano_referencia,
        "preco_arroba": preco_arroba,
        "taxa_anual_ano_seguinte": preco_arroba,
        "equivalencia": f"1 arroba ({ARROBA_KG} kg) @ R$ {preco_arroba / ARROBA_KG:.2f}/kg",
    }


async def _tarifa_vigente(db: AsyncSession, tipo: str) -> float:
    hoje = date.today()
    row = await db.scalar(
        select(Tarifa).where(
            Tarifa.tipo == tipo,
            Tarifa.ativo == True,  # noqa: E712
            Tarifa.vigente_de <= hoje,
        ).order_by(Tarifa.vigente_de.desc()).limit(1)
    )
    if row:
        return float(row.valor)
    return _COMISSAO_PCT_DEFAULT if tipo == "comissao_comprador_pct" else _TAXA_ANUAL_DEFAULT


async def get_taxa_anual_vigente(db: AsyncSession) -> dict:
    """Retorna a taxa anual vigente e sua origem (arroba de referência)."""
    hoje = date.today()
    taxa_row = await db.scalar(
        select(Tarifa).where(
            Tarifa.tipo == "taxa_anual_produtor",
            Tarifa.ativo == True,  # noqa: E712
            Tarifa.vigente_de <= hoje,
        ).order_by(Tarifa.vigente_de.desc()).limit(1)
    )
    arroba_row = await db.scalar(
        select(Tarifa).where(
            Tarifa.tipo == "preco_medio_arroba",
            Tarifa.ativo == True,  # noqa: E712
        ).order_by(Tarifa.vigente_de.desc()).limit(1)
    )

    taxa = float(taxa_row.valor) if taxa_row else _TAXA_ANUAL_DEFAULT
    return {
        "taxa_anual_rs": taxa,
        "equivalencia_arroba": f"1 arroba ({ARROBA_KG} kg)",
        "preco_arroba_referencia": float(arroba_row.valor) if arroba_row else None,
        "ano_referencia_arroba": arroba_row.ano_referencia if arroba_row else None,
        "fonte": taxa_row.descricao if taxa_row else "Valor padrão (sem arroba cadastrada)",
    }


async def _taxa_anual_devida(db: AsyncSession, produtor: Produtor, ano: int, taxa_valor: float) -> float:
    """Retorna o valor da taxa anual a deduzir. Zero se já paga neste ano."""
    pago = await db.scalar(
        select(Pagamento).where(
            Pagamento.user_id == produtor.user_id,
            Pagamento.tipo == "taxa_anual_produtor",
            Pagamento.ano_referencia == ano,
            Pagamento.status == "pago",
        )
    )
    return 0.0 if pago else taxa_valor


async def calcular_repasse(db: AsyncSession, lote_id: uuid.UUID) -> RepasseLote:
    """Cria RepasseLote + SplitProdutor para cada produtor após entrega validada."""
    lote = await db.get(Lote, lote_id)
    if not lote:
        raise HTTPException(status_code=404, detail="Lote não encontrado")
    if lote.status != "validado":
        raise HTTPException(status_code=409, detail=f"Lote ainda não validado (status: {lote.status})")
    if not lote.preco_final_kg:
        raise HTTPException(status_code=409, detail="Lote sem preço final — leilão não encerrado corretamente")

    existente = await db.scalar(select(RepasseLote).where(RepasseLote.lote_id == lote_id))
    if existente:
        raise HTTPException(status_code=409, detail="Repasse já calculado para este lote")

    entrega = await db.scalar(select(Entrega).where(Entrega.lote_id == lote_id))
    if not entrega or not entrega.volume_recebido_kg:
        raise HTTPException(status_code=409, detail="Entrega não possui peso registrado na balança")
    if entrega.status != "validada":
        raise HTTPException(status_code=409, detail="Entrega ainda não validada pelo admin")

    volume_total = float(entrega.volume_recebido_kg)
    preco_kg = float(lote.preco_final_kg)
    valor_total = round(volume_total * preco_kg, 2)

    comissao_pct = await _tarifa_vigente(db, "comissao_comprador_pct")
    comissao_valor = round(valor_total * comissao_pct / 100, 2)
    valor_liquido_produtores = round(valor_total - comissao_valor, 2)

    repasse = RepasseLote(
        lote_id=lote_id,
        entrega_id=entrega.id,
        comprador_id=lote.comprador_id,
        volume_recebido_kg=volume_total,
        preco_final_kg=preco_kg,
        valor_total=valor_total,
        comissao_pct=comissao_pct,
        comissao_valor=comissao_valor,
        valor_liquido_produtores=valor_liquido_produtores,
        status="aguardando_pagamento",
    )
    db.add(repasse)
    await db.flush()  # garante repasse.id antes dos splits

    # Busca os produtores do lote e seus volumes declarados
    lp_rows = await db.scalars(
        select(LoteProdutor).where(LoteProdutor.lote_id == lote_id)
    )
    lote_produtores = list(lp_rows)

    # Volume total declarado para calcular proporção
    volume_declarado_total = sum(float(lp.volume_kg) for lp in lote_produtores)
    if volume_declarado_total == 0:
        raise HTTPException(status_code=500, detail="Volume declarado do lote é zero")

    taxa_anual = await _tarifa_vigente(db, "taxa_anual_produtor")
    ano_atual = date.today().year

    for lp in lote_produtores:
        produtor = await db.get(Produtor, lp.produtor_id)
        if not produtor:
            continue

        percentual = float(lp.volume_kg) / volume_declarado_total
        volume_produtor = round(volume_total * percentual, 2)
        valor_bruto = round(valor_liquido_produtores * percentual, 2)

        taxa_deduzida = await _taxa_anual_devida(db, produtor, ano_atual, taxa_anual)
        # Nunca deduz mais do que o valor bruto
        taxa_deduzida = min(taxa_deduzida, valor_bruto)
        valor_liquido = round(valor_bruto - taxa_deduzida, 2)

        split = SplitProdutor(
            repasse_id=repasse.id,
            produtor_id=produtor.id,
            lote_produtor_id=lp.id,
            volume_kg=volume_produtor,
            percentual_lote=round(percentual * 100, 4),
            valor_bruto=valor_bruto,
            taxa_anual_deduzida=taxa_deduzida,
            valor_liquido=valor_liquido,
            pix_status="pendente",
        )
        db.add(split)

        # Registra pagamento de taxa anual se foi deduzida
        if taxa_deduzida > 0:
            db.add(Pagamento(
                user_id=produtor.user_id,
                tipo="taxa_anual_produtor",
                valor=taxa_deduzida,
                status="pago",
                referencia=str(lote_id),
                ano_referencia=ano_atual,
                pago_em=datetime.now(timezone.utc),
            ))

    await db.commit()
    await db.refresh(repasse)
    return repasse


async def confirmar_pagamento_comprador(
    db: AsyncSession, repasse_id: uuid.UUID, pix_id: str, observacoes: str | None
) -> RepasseLote:
    repasse = await db.get(RepasseLote, repasse_id)
    if not repasse:
        raise HTTPException(status_code=404, detail="Repasse não encontrado")
    if repasse.status != "aguardando_pagamento":
        raise HTTPException(status_code=409, detail=f"Repasse já está em status '{repasse.status}'")

    repasse.status = "pago"
    repasse.pago_em = datetime.now(timezone.utc)
    repasse.pix_id_comprador = pix_id
    repasse.observacoes = observacoes
    await db.commit()
    await db.refresh(repasse)
    return repasse


async def confirmar_pix_produtor(
    db: AsyncSession, split_id: uuid.UUID, chave_pix: str, pix_id: str
) -> SplitProdutor:
    split = await db.get(SplitProdutor, split_id)
    if not split:
        raise HTTPException(status_code=404, detail="Split não encontrado")

    repasse = await db.get(RepasseLote, split.repasse_id)
    if not repasse or repasse.status != "pago":
        raise HTTPException(status_code=409, detail="Repasse ainda não foi pago pelo comprador")
    if split.pix_status == "pago":
        raise HTTPException(status_code=409, detail="PIX já confirmado para este produtor")

    agora = datetime.now(timezone.utc)
    split.chave_pix = chave_pix
    split.pix_id_transacao = pix_id
    split.pix_status = "pago"
    split.pix_pago_em = agora

    # Verifica se todos os splits foram pagos → fecha repasse como distribuido
    splits_pendentes = await db.scalar(
        select(func.count()).where(
            SplitProdutor.repasse_id == repasse.id,
            SplitProdutor.pix_status != "pago",
        )
    )
    if splits_pendentes == 0:
        repasse.status = "distribuido"

    await db.commit()
    await db.refresh(split)
    return split


async def get_repasse_detalhe(db: AsyncSession, repasse_id: uuid.UUID) -> dict | None:
    repasse = await db.get(RepasseLote, repasse_id)
    if not repasse:
        return None

    splits_rows = await db.scalars(
        select(SplitProdutor).where(SplitProdutor.repasse_id == repasse_id)
    )
    splits = list(splits_rows)

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
        "num_splits": len(splits),
        "splits": [
            {
                "id": str(s.id),
                "repasse_id": str(s.repasse_id),
                "produtor_id": str(s.produtor_id),
                "volume_kg": float(s.volume_kg),
                "percentual_lote": float(s.percentual_lote),
                "valor_bruto": float(s.valor_bruto),
                "taxa_anual_deduzida": float(s.taxa_anual_deduzida),
                "valor_liquido": float(s.valor_liquido),
                "chave_pix": s.chave_pix,
                "pix_status": s.pix_status,
                "pix_pago_em": s.pix_pago_em,
                "pix_id_transacao": s.pix_id_transacao,
                "criado_em": s.criado_em,
            }
            for s in splits
        ],
    }
