"""
Motor Fiscal — NF-e, QR Code logístico, Módulo de Balança e Tribunal de Entregas.
"""
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from app.models.entrega import Entrega, ProcessoDefesa
from app.models.lote import Lote
from app.models.produtor import Produtor


# ---------------------------------------------------------------------------
# Criação automática (chamada pelo encerrar_leilao quando há vencedor)
# ---------------------------------------------------------------------------

async def criar_entrega_pos_leilao(
    db: AsyncSession,
    lote_id: uuid.UUID,
    comprador_id: uuid.UUID,
    encerrado_em: datetime,
) -> Entrega:
    lote = await db.get(Lote, lote_id)
    if not lote:
        raise ValueError(f"Lote {lote_id} não encontrado")

    existente = await db.scalar(select(Entrega).where(Entrega.lote_id == lote_id))
    if existente:
        return existente

    entrega = Entrega(
        lote_id=lote_id,
        comprador_id=comprador_id,
        ponto_entrega_id=lote.ponto_entrega_id,
        data_prevista=lote.entrega_fim,
        volume_declarado_kg=float(lote.volume_declarado_kg),
        nfe_status="pendente",
        nfe_prazo=encerrado_em + timedelta(hours=24),
        status="pendente",
    )
    db.add(entrega)
    await db.commit()
    await db.refresh(entrega)
    return entrega


# ---------------------------------------------------------------------------
# Upload de NF-e pelo comprador
# ---------------------------------------------------------------------------

async def upload_nfe(
    db: AsyncSession,
    entrega_id: uuid.UUID,
    comprador_id: uuid.UUID,
    nfe_numero: str,
    nfe_url: str,
    nfe_tipo: str,
) -> Entrega:
    entrega = await db.get(Entrega, entrega_id)
    if not entrega:
        raise HTTPException(status_code=404, detail="Entrega não encontrada")
    if entrega.comprador_id != comprador_id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    if entrega.nfe_status not in ("pendente", "upload_produtor", "upload_comprador"):
        raise HTTPException(status_code=409, detail=f"NF-e já está em status '{entrega.nfe_status}'")
    if entrega.nfe_status == "expirada":
        raise HTTPException(status_code=409, detail="Prazo de envio da NF-e expirado")

    agora = datetime.now(timezone.utc)
    if entrega.nfe_prazo and agora > entrega.nfe_prazo:
        entrega.nfe_status = "expirada"
        await db.commit()
        raise HTTPException(status_code=409, detail="Prazo de envio da NF-e expirado")

    entrega.nfe_numero = nfe_numero
    entrega.nfe_url = nfe_url
    entrega.nfe_tipo = nfe_tipo
    entrega.nfe_enviada_em = agora
    entrega.nfe_status = "upload_comprador" if nfe_tipo == "contra_nota_comprador" else "upload_produtor"
    await db.commit()
    await db.refresh(entrega)
    return entrega


# ---------------------------------------------------------------------------
# Validação da NF-e pelo admin → libera QR Code
# ---------------------------------------------------------------------------

async def validar_nfe(db: AsyncSession, entrega_id: uuid.UUID, admin_user_id: uuid.UUID) -> Entrega:
    entrega = await db.get(Entrega, entrega_id)
    if not entrega:
        raise HTTPException(status_code=404, detail="Entrega não encontrada")
    if entrega.nfe_status not in ("upload_produtor", "upload_comprador"):
        raise HTTPException(status_code=409, detail=f"NF-e não está pronta para validação (status: {entrega.nfe_status})")

    agora = datetime.now(timezone.utc)
    entrega.nfe_status = "validada"

    token = str(uuid.uuid4())
    entrega.qr_code_token = token
    entrega.qr_code_gerado_em = agora
    entrega.qr_code_url = f"/entregas/qr/{token}"

    await db.commit()
    await db.refresh(entrega)
    return entrega


# ---------------------------------------------------------------------------
# Módulo de Balança — comprador informa peso real ao receber a carga
# ---------------------------------------------------------------------------

async def registrar_peso(
    db: AsyncSession,
    qr_token: str,
    comprador_id: uuid.UUID,
    volume_recebido_kg: float,
    umidade_pct: float | None,
    fermentacao_pct: float | None,
    qualidade_obs: str | None,
) -> Entrega:
    entrega = await db.scalar(select(Entrega).where(Entrega.qr_code_token == qr_token))
    if not entrega:
        raise HTTPException(status_code=404, detail="QR Code inválido ou não encontrado")
    if entrega.comprador_id != comprador_id:
        raise HTTPException(status_code=403, detail="QR Code pertence a outra empresa")
    if entrega.nfe_status != "validada":
        raise HTTPException(status_code=409, detail="NF-e ainda não validada — pesagem não permitida")
    if entrega.status != "pendente":
        raise HTTPException(status_code=409, detail=f"Entrega já está em status '{entrega.status}'")

    entrega.volume_recebido_kg = volume_recebido_kg
    entrega.umidade_pct = umidade_pct
    entrega.fermentacao_pct = fermentacao_pct
    entrega.qualidade_obs = qualidade_obs
    entrega.data_recebimento = datetime.now(timezone.utc).date()
    entrega.status = "recebida"
    await db.commit()
    await db.refresh(entrega)
    return entrega


# ---------------------------------------------------------------------------
# Validação final da entrega pelo admin → lote "validado"
# ---------------------------------------------------------------------------

async def validar_entrega(
    db: AsyncSession, entrega_id: uuid.UUID, admin_user_id: uuid.UUID, observacoes: str | None = None
) -> Entrega:
    entrega = await db.get(Entrega, entrega_id)
    if not entrega:
        raise HTTPException(status_code=404, detail="Entrega não encontrada")
    if entrega.status != "recebida":
        raise HTTPException(status_code=409, detail=f"Entrega não está pronta para validação (status: {entrega.status})")

    agora = datetime.now(timezone.utc)
    entrega.status = "validada"
    entrega.validado_por = admin_user_id
    entrega.validado_em = agora
    entrega.observacoes = observacoes

    lote = await db.get(Lote, entrega.lote_id)
    if lote:
        lote.status = "validado"

    await db.commit()
    await db.refresh(entrega)
    return entrega


# ---------------------------------------------------------------------------
# Verificação de NF-e expiradas (Celery daily 08h)
# ---------------------------------------------------------------------------

async def verificar_nfe_expiradas(db: AsyncSession) -> dict:
    agora = datetime.now(timezone.utc)
    rows = await db.scalars(
        select(Entrega).where(
            Entrega.nfe_status == "pendente",
            Entrega.nfe_prazo <= agora,
        )
    )
    expiradas = list(rows)
    bloqueios = 0

    for entrega in expiradas:
        entrega.nfe_status = "expirada"

        # Bloqueia todos os produtores do lote
        from app.models.lote import LoteProdutor
        lp_rows = await db.scalars(
            select(LoteProdutor).where(LoteProdutor.lote_id == entrega.lote_id)
        )
        for lp in lp_rows:
            produtor = await db.get(Produtor, lp.produtor_id)
            if produtor and produtor.compliance_status == "ok":
                produtor.compliance_status = "bloqueado"
                produtor.bloqueado_em = agora
                produtor.bloqueio_motivo = f"NF-e não enviada no prazo para o lote — entrega {entrega.id}"

                # Abre processo de defesa automaticamente
                processo = ProcessoDefesa(
                    produtor_id=produtor.id,
                    entrega_id=entrega.id,
                    motivo_bloqueio="NF-e não enviada no prazo de 24h após encerramento do leilão",
                    descricao="Processo aberto automaticamente. Produtor pode apresentar defesa.",
                    evidencias_urls=[],
                    status="aberto",
                )
                db.add(processo)
                bloqueios += 1

    await db.commit()
    return {"expiradas": len(expiradas), "produtores_bloqueados": bloqueios}


# ---------------------------------------------------------------------------
# Tribunal de Entregas — defesa do produtor
# ---------------------------------------------------------------------------

async def submeter_defesa(
    db: AsyncSession,
    produtor_id: uuid.UUID,
    processo_id: uuid.UUID,
    descricao: str,
    evidencias_urls: list[str],
) -> ProcessoDefesa:
    processo = await db.get(ProcessoDefesa, processo_id)
    if not processo or processo.produtor_id != produtor_id:
        raise HTTPException(status_code=404, detail="Processo não encontrado")
    if processo.status != "aberto":
        raise HTTPException(status_code=409, detail=f"Processo já está em status '{processo.status}'")

    processo.descricao = descricao
    processo.evidencias_urls = evidencias_urls
    processo.status = "em_analise"

    produtor = await db.get(Produtor, produtor_id)
    if produtor:
        produtor.compliance_status = "em_defesa"

    await db.commit()
    await db.refresh(processo)
    return processo


async def julgar_defesa(
    db: AsyncSession,
    processo_id: uuid.UUID,
    admin_user_id: uuid.UUID,
    decisao: str,
    aprovado: bool,
    multa_valor: float | None,
    novo_status_compliance: str | None,
) -> ProcessoDefesa:
    processo = await db.get(ProcessoDefesa, processo_id)
    if not processo:
        raise HTTPException(status_code=404, detail="Processo não encontrado")
    if processo.status not in ("aberto", "em_analise"):
        raise HTTPException(status_code=409, detail=f"Processo já julgado (status: {processo.status})")

    agora = datetime.now(timezone.utc)
    processo.status = "aprovado" if aprovado else "rejeitado"
    processo.julgado_por = admin_user_id
    processo.julgado_em = agora
    processo.decisao = decisao
    processo.multa_valor = multa_valor

    produtor = await db.get(Produtor, processo.produtor_id)
    if produtor:
        if aprovado:
            produtor.compliance_status = "ok"
            produtor.bloqueio_motivo = None
        else:
            status = novo_status_compliance or ("multado" if multa_valor else "bloqueado")
            produtor.compliance_status = status

    await db.commit()
    await db.refresh(processo)
    return processo
