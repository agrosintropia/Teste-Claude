import uuid
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.auditoria import Auditoria, AuditoriaChecklist
from app.models.cscacau_criterio import CscacauCriterio
from app.models.score import Score


async def agendar_auditoria(
    db: AsyncSession,
    produtor_id: uuid.UUID,
    auditor_id: uuid.UUID,
    tipo: str,
    data_agendada: date,
) -> Auditoria:
    auditoria = Auditoria(
        produtor_id=produtor_id,
        auditor_id=auditor_id,
        tipo=tipo,
        data_agendada=data_agendada,
        status="agendada",
    )
    db.add(auditoria)
    await db.commit()
    await db.refresh(auditoria)
    return auditoria


async def salvar_checklist(
    db: AsyncSession,
    auditoria_id: uuid.UUID,
    respostas: list[dict],  # [{"criterio_id": int, "resposta": str, "observacao": str, "evidencia_url": str}]
) -> list[AuditoriaChecklist]:
    """
    Upsert das respostas do checklist. Pode ser chamado múltiplas vezes
    (suporte offline-first: sincroniza em blocos).
    """
    salvos = []
    for r in respostas:
        existing = await db.scalar(
            select(AuditoriaChecklist).where(
                AuditoriaChecklist.auditoria_id == auditoria_id,
                AuditoriaChecklist.criterio_id == r["criterio_id"],
            )
        )
        if existing:
            existing.resposta = r["resposta"]
            existing.observacao = r.get("observacao")
            existing.evidencia_url = r.get("evidencia_url")
            salvos.append(existing)
        else:
            item = AuditoriaChecklist(
                auditoria_id=auditoria_id,
                criterio_id=r["criterio_id"],
                resposta=r["resposta"],
                observacao=r.get("observacao"),
                evidencia_url=r.get("evidencia_url"),
            )
            db.add(item)
            salvos.append(item)

    await db.commit()
    return salvos


async def get_criterios_ativos(db: AsyncSession) -> list[CscacauCriterio]:
    result = await db.scalars(
        select(CscacauCriterio).where(CscacauCriterio.ativo == True).order_by(CscacauCriterio.codigo)  # noqa: E712
    )
    return list(result)


async def get_score_ativo(db: AsyncSession, produtor_id: uuid.UUID) -> Score | None:
    return await db.scalar(
        select(Score).where(Score.produtor_id == produtor_id, Score.ativo == True)  # noqa: E712
    )
