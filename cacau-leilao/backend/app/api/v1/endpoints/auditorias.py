import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.v1.deps import get_current_user, require_role
from app.schemas.auditoria import (
    AuditoriaCreate, AuditoriaResponse, ChecklistSync,
    CriterioResponse, ScoreResponse, FinalizarAuditoriaResponse,
)
from app.services import auditoria_service, score_service

router = APIRouter(prefix="/auditorias", tags=["auditorias"])

_auditor_admin = require_role("auditor", "admin")
_produtor = require_role("produtor")


# ------------------------------------
# Critérios (referência — qualquer usuário autenticado)
# ------------------------------------

@router.get("/criterios", response_model=list[CriterioResponse])
async def listar_criterios(
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Lista todos os critérios CSCacau ativos — usado pelo app do auditor offline."""
    criterios = await auditoria_service.get_criterios_ativos(db)
    return criterios


# ------------------------------------
# Agendamento (admin/auditor)
# ------------------------------------

@router.post("", response_model=AuditoriaResponse, status_code=status.HTTP_201_CREATED)
async def agendar(
    body: AuditoriaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(_auditor_admin),
):
    auditoria = await auditoria_service.agendar_auditoria(
        db,
        produtor_id=uuid.UUID(body.produtor_id),
        auditor_id=uuid.UUID(current_user["user_id"]),
        tipo=body.tipo,
        data_agendada=body.data_agendada,
    )
    return _to_response(auditoria)


# ------------------------------------
# Checklist (auditor — offline-first)
# ------------------------------------

@router.post("/{auditoria_id}/checklist", status_code=status.HTTP_200_OK)
async def sincronizar_checklist(
    auditoria_id: uuid.UUID,
    body: ChecklistSync,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(_auditor_admin),
):
    """
    Recebe lote de respostas (suporte offline-first).
    Pode ser chamado múltiplas vezes — faz upsert por criterio_id.
    """
    auditoria = await db.get(__import__("app.models.auditoria", fromlist=["Auditoria"]).Auditoria, auditoria_id)
    if not auditoria:
        raise HTTPException(status_code=404, detail="Auditoria não encontrada")
    if auditoria.status in ("aprovada", "reprovada"):
        raise HTTPException(status_code=409, detail="Auditoria já finalizada")

    await auditoria_service.salvar_checklist(
        db, auditoria_id, [i.model_dump() for i in body.itens]
    )
    return {"message": f"{len(body.itens)} item(ns) sincronizado(s)"}


# ------------------------------------
# Finalizar (auditor/admin) → calcula score
# ------------------------------------

@router.post("/{auditoria_id}/finalizar", response_model=FinalizarAuditoriaResponse)
async def finalizar(
    auditoria_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(_auditor_admin),
):
    try:
        result = await score_service.finalizar_auditoria(db, auditoria_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    msg = {
        "aprovado": "Produtor ativado na plataforma com score calculado.",
        "aprovado_com_ressalvas": "Produtor ativo, mas há pontos de melhoria.",
        "reprovado": f"Produtor reprovado. Critérios obrigatórios não atendidos: {', '.join(result.reprovado_por)}",
    }[result.resultado]

    return FinalizarAuditoriaResponse(
        resultado=result.resultado,
        score_total=result.score_total,
        faixa=result.faixa,
        score_producao=result.score_producao,
        score_ambiental=result.score_ambiental,
        score_social=result.score_social,
        reprovado_por=result.reprovado_por,
        message=msg,
    )


# ------------------------------------
# Score do produtor (produtor vê o próprio)
# ------------------------------------

@router.get("/me/score", response_model=ScoreResponse)
async def meu_score(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(_produtor),
):
    from app.services.produtor_service import get_produtor_by_user
    produtor = await get_produtor_by_user(db, uuid.UUID(current_user["user_id"]))
    if not produtor:
        raise HTTPException(status_code=404, detail="Perfil de produtor não encontrado")

    score = await auditoria_service.get_score_ativo(db, produtor.id)
    if not score:
        raise HTTPException(status_code=404, detail="Nenhum score ativo — aguarde auditoria")
    return score


def _to_response(a) -> dict:
    return {
        "id": str(a.id),
        "produtor_id": str(a.produtor_id),
        "auditor_id": str(a.auditor_id),
        "tipo": a.tipo,
        "data_agendada": a.data_agendada,
        "data_realizada": a.data_realizada,
        "status": a.status,
        "resultado": a.resultado,
    }
