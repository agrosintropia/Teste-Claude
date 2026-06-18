"""
Cálculo de score CSCacau a partir das respostas do checklist de auditoria.

Fórmula:
  score_area = (pontos_obtidos_area / pontos_max_area) * 100
  score_total = (producao * 0.40) + (ambiental * 0.35) + (social * 0.25)

Faixas:
  A: 75-100  B: 50-74  C: 25-49  D: 0-24

Critério obrigatório com resposta 'nao' → resultado = 'reprovado' direto.
"""
import uuid
from datetime import date, timedelta, timezone, datetime
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.auditoria import Auditoria, AuditoriaChecklist
from app.models.cscacau_criterio import CscacauCriterio
from app.models.score import Score
from app.models.produtor import Produtor
from app.core.config import settings


@dataclass
class ScoreResult:
    score_producao: int
    score_ambiental: int
    score_social: int
    score_total: int
    faixa: str
    resultado: str          # 'aprovado' | 'reprovado' | 'aprovado_com_ressalvas'
    reprovado_por: list[str]  # códigos dos critérios obrigatórios reprovados


def _faixa(total: int) -> str:
    if total >= 75:
        return "A"
    if total >= 50:
        return "B"
    if total >= 25:
        return "C"
    return "D"


def _pontos_por_resposta(resposta: str, pontos_max: int) -> int:
    return {
        "sim": pontos_max,
        "parcial": pontos_max // 2,
        "nao": 0,
        "na": pontos_max,   # não se aplica conta como cumprido
    }.get(resposta, 0)


def calcular_score(itens: list[tuple[AuditoriaChecklist, CscacauCriterio]]) -> ScoreResult:
    """
    Recebe lista de (checklist_item, criterio) e calcula o score.
    Não acessa banco — puro cálculo.
    """
    por_area: dict[str, dict] = {
        "gestao_producao":  {"obtidos": 0, "max": 0},
        "gestao_ambiental": {"obtidos": 0, "max": 0},
        "gestao_social":    {"obtidos": 0, "max": 0},
    }
    reprovado_por: list[str] = []

    for item, criterio in itens:
        area = criterio.area
        pontos = _pontos_por_resposta(item.resposta, criterio.pontos_max)
        item.pontos_obtidos = pontos

        por_area[area]["obtidos"] += pontos
        por_area[area]["max"] += criterio.pontos_max

        if criterio.obrigatorio and item.resposta == "nao":
            reprovado_por.append(criterio.codigo)

    def pct(area_key: str) -> int:
        a = por_area[area_key]
        return round((a["obtidos"] / a["max"]) * 100) if a["max"] > 0 else 0

    s_prod = pct("gestao_producao")
    s_amb  = pct("gestao_ambiental")
    s_soc  = pct("gestao_social")

    total = round(
        s_prod * settings.PESO_GESTAO_PRODUCAO
        + s_amb  * settings.PESO_GESTAO_AMBIENTAL
        + s_soc  * settings.PESO_GESTAO_SOCIAL
    )

    if reprovado_por:
        resultado = "reprovado"
    elif total >= 75:
        resultado = "aprovado"
    else:
        resultado = "aprovado_com_ressalvas"

    return ScoreResult(
        score_producao=s_prod,
        score_ambiental=s_amb,
        score_social=s_soc,
        score_total=total,
        faixa=_faixa(total),
        resultado=resultado,
        reprovado_por=reprovado_por,
    )


async def finalizar_auditoria(db: AsyncSession, auditoria_id: uuid.UUID) -> ScoreResult:
    """
    Fecha a auditoria, calcula o score e persiste.
    Chamado pelo auditor após preencher todo o checklist.
    """
    auditoria = await db.get(Auditoria, auditoria_id)
    if not auditoria:
        raise ValueError("Auditoria não encontrada")
    if auditoria.status not in ("agendada", "realizada"):
        raise ValueError(f"Auditoria já finalizada (status={auditoria.status})")

    # Carrega checklist com critérios
    rows = await db.execute(
        select(AuditoriaChecklist, CscacauCriterio)
        .join(CscacauCriterio, AuditoriaChecklist.criterio_id == CscacauCriterio.id)
        .where(AuditoriaChecklist.auditoria_id == auditoria_id)
    )
    itens = rows.all()
    if not itens:
        raise ValueError("Checklist vazio — preencha antes de finalizar")

    result = calcular_score(itens)

    # Salva pontos calculados no checklist
    for item, _ in itens:
        await db.merge(item)

    # Atualiza auditoria
    auditoria.status = "aprovada" if result.resultado != "reprovado" else "reprovada"
    auditoria.resultado = result.resultado
    auditoria.data_realizada = date.today()

    # Desativa score anterior do produtor
    await db.execute(
        update(Score)
        .where(Score.produtor_id == auditoria.produtor_id, Score.ativo == True)  # noqa: E712
        .values(ativo=False)
    )

    # Cria novo score (apenas se aprovado ou aprovado_com_ressalvas)
    if result.resultado != "reprovado":
        hoje = date.today()
        score = Score(
            produtor_id=auditoria.produtor_id,
            auditoria_id=auditoria_id,
            score_gestao_producao=result.score_producao,
            score_gestao_ambiental=result.score_ambiental,
            score_gestao_social=result.score_social,
            score_total=result.score_total,
            faixa=result.faixa,
            valido_de=hoje,
            valido_ate=hoje + timedelta(days=365),
            ativo=True,
        )
        db.add(score)

        # Ativa o produtor na plataforma (se era a auditoria inicial)
        produtor = await db.get(Produtor, auditoria.produtor_id)
        if produtor and produtor.audit_status in ("pendente", "agendada"):
            produtor.audit_status = "aprovada"
            from app.models.user import User
            user = await db.get(User, produtor.user_id)
            if user:
                user.ativo = True

    await db.commit()
    return result
