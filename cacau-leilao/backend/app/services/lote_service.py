"""
Algoritmo de Formação de Lotes — LoteForte

Lógica de agrupamento:
  Para cada PontoEntrega ativo e aprovado:
    Para cada faixa de score elegível (A, B, C — D não participa):
      Para cada semana ISO com expectativas publicadas nessa faixa/ponto:
        Agrupar produtores dentro do raio do ponto
        Se volume_total >= volume_minimo → cria Lote e agenda leilão
        Caso contrário → registra como volume insuficiente (não cria lote ainda)

Chamado pelo job semanal (Celery) ou manualmente pelo admin via endpoint.
"""
import uuid
from datetime import date, timedelta
from dataclasses import dataclass, field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.lote import Lote, LoteProdutor
from app.models.expectativa import ExpectativaProducao
from app.models.produtor import Produtor
from app.models.ponto_entrega import PontoEntrega
from app.models.score import Score
from app.services.geo import produtor_dentro_do_raio
from app.core.config import settings


FAIXAS_ELEGIVEIS = ("A", "B", "C")  # faixa D não acessa o leilão


@dataclass
class GrupoLote:
    ponto: PontoEntrega
    faixa: str
    semana_iso: str
    entrega_inicio: date
    entrega_fim: date
    itens: list[tuple[ExpectativaProducao, Produtor, Score]] = field(default_factory=list)

    @property
    def volume_total(self) -> float:
        return sum(float(i[0].volume_kg) for i in self.itens)


def _semana_iso(d: date) -> str:
    """Retorna string 'YYYY-Www' para a data fornecida."""
    iso = d.isocalendar()
    return f"{iso[0]}-W{iso[1]:02d}"


def _inicio_semana(semana_iso: str) -> date:
    """Segunda-feira da semana ISO."""
    year, week = semana_iso.split("-W")
    return date.fromisocalendar(int(year), int(week), 1)


def _fim_semana(semana_iso: str) -> date:
    """Domingo da semana ISO."""
    return _inicio_semana(semana_iso) + timedelta(days=6)


def _codigo_lote(ponto: PontoEntrega, faixa: str, semana_iso: str) -> str:
    mun = ponto.municipio[:6].upper().replace(" ", "")
    return f"{ponto.estado}-{mun}-{faixa}-{semana_iso}"


async def _carregar_dados(db: AsyncSession):
    """Carrega pontos de entrega, expectativas publicadas e scores ativos em memória."""
    pontos = list(await db.scalars(
        select(PontoEntrega).where(PontoEntrega.ativo == True, PontoEntrega.aprovado == True)  # noqa: E712
    ))

    # Expectativas publicadas ainda não alocadas
    expectativas = list(await db.scalars(
        select(ExpectativaProducao).where(ExpectativaProducao.status == "publicado")
    ))
    if not expectativas:
        return pontos, []

    produtor_ids = list({e.produtor_id for e in expectativas})

    # Produtores ativos com compliance ok
    produtores_map: dict[uuid.UUID, Produtor] = {
        p.id: p for p in await db.scalars(
            select(Produtor).where(
                Produtor.id.in_(produtor_ids),
                Produtor.audit_status == "aprovada",
                Produtor.compliance_status == "ok",
            )
        )
    }

    # Scores ativos
    scores_map: dict[uuid.UUID, Score] = {
        s.produtor_id: s for s in await db.scalars(
            select(Score).where(
                Score.produtor_id.in_(produtor_ids),
                Score.ativo == True,  # noqa: E712
                Score.valido_ate >= date.today(),
            )
        )
    }

    # Filtra expectativas cujos produtores estão ativos e com score válido
    expectativas_validas = [
        (e, produtores_map[e.produtor_id], scores_map[e.produtor_id])
        for e in expectativas
        if e.produtor_id in produtores_map and e.produtor_id in scores_map
    ]

    return pontos, expectativas_validas


def _agrupar(
    pontos: list[PontoEntrega],
    expectativas_validas: list[tuple[ExpectativaProducao, Produtor, Score]],
) -> list[GrupoLote]:
    """Agrupa expectativas em grupos candidatos a lote (sem tocar no banco)."""
    grupos: dict[tuple, GrupoLote] = {}

    for exp, produtor, score in expectativas_validas:
        faixa = score.faixa
        if faixa not in FAIXAS_ELEGIVEIS:
            continue
        if not produtor.latitude or not produtor.longitude:
            continue

        semana = _semana_iso(exp.entrega_inicio)

        for ponto in pontos:
            if not produtor_dentro_do_raio(
                float(produtor.latitude), float(produtor.longitude),
                float(ponto.latitude), float(ponto.longitude),
                ponto.raio_km,
            ):
                continue

            chave = (str(ponto.id), faixa, semana)
            if chave not in grupos:
                grupos[chave] = GrupoLote(
                    ponto=ponto,
                    faixa=faixa,
                    semana_iso=semana,
                    entrega_inicio=_inicio_semana(semana),
                    entrega_fim=_fim_semana(semana),
                )
            grupos[chave].itens.append((exp, produtor, score))
            break  # um produtor vai para o ponto mais próximo apenas

    return list(grupos.values())


async def _persistir_lote(db: AsyncSession, grupo: GrupoLote) -> Lote:
    codigo = _codigo_lote(grupo.ponto, grupo.faixa, grupo.semana_iso)

    lote = Lote(
        codigo=codigo,
        semana_iso=grupo.semana_iso,
        ponto_entrega_id=grupo.ponto.id,
        regiao_id=grupo.ponto.regiao_id,
        faixa_score=grupo.faixa,
        entrega_inicio=grupo.entrega_inicio,
        entrega_fim=grupo.entrega_fim,
        volume_declarado_kg=grupo.volume_total,
        volume_minimo_kg=settings.LOTE_VOLUME_MINIMO_KG,
        status="aberto",
    )
    db.add(lote)
    await db.flush()  # gera o ID do lote antes de criar os registros filhos

    for exp, produtor, _ in grupo.itens:
        db.add(LoteProdutor(
            lote_id=lote.id,
            produtor_id=produtor.id,
            expectativa_id=exp.id,
            volume_kg=float(exp.volume_kg),
        ))

    # Marca expectativas como alocadas
    exp_ids = [exp.id for exp, _, _ in grupo.itens]
    await db.execute(
        update(ExpectativaProducao)
        .where(ExpectativaProducao.id.in_(exp_ids))
        .values(status="alocado", lote_id=lote.id)
    )

    return lote


async def formar_lotes(db: AsyncSession) -> dict:
    """
    Entry point do job semanal. Retorna resumo da execução.
    Idempotente: ignora expectativas já alocadas.
    """
    pontos, expectativas_validas = await _carregar_dados(db)

    if not expectativas_validas:
        return {"lotes_criados": 0, "lotes_com_volume_insuficiente": 0,
                "expectativas_alocadas": 0, "detalhes": ["Nenhuma expectativa publicada."]}

    grupos = _agrupar(pontos, expectativas_validas)

    criados = 0
    insuficientes = 0
    alocadas = 0
    detalhes = []

    for grupo in grupos:
        codigo = _codigo_lote(grupo.ponto, grupo.faixa, grupo.semana_iso)

        # Verifica se lote com mesmo código já existe (idempotência)
        existe = await db.scalar(select(Lote).where(Lote.codigo == codigo))
        if existe:
            detalhes.append(f"[JÁ EXISTE] {codigo}")
            continue

        if grupo.volume_total < settings.LOTE_VOLUME_MINIMO_KG:
            insuficientes += 1
            detalhes.append(
                f"[INSUFICIENTE] {codigo} — {grupo.volume_total:.0f}kg "
                f"(mín. {settings.LOTE_VOLUME_MINIMO_KG:.0f}kg, "
                f"{len(grupo.itens)} produtor(es))"
            )
            continue

        await _persistir_lote(db, grupo)
        criados += 1
        alocadas += len(grupo.itens)
        detalhes.append(
            f"[CRIADO] {codigo} — {grupo.volume_total:.0f}kg, "
            f"{len(grupo.itens)} produtor(es), faixa {grupo.faixa}"
        )

    await db.commit()

    return {
        "lotes_criados": criados,
        "lotes_com_volume_insuficiente": insuficientes,
        "expectativas_alocadas": alocadas,
        "detalhes": detalhes,
    }


async def get_lote_detalhe(db: AsyncSession, lote_id: uuid.UUID) -> dict | None:
    """Retorna lote com lista de produtores e seus dados de rastreabilidade."""
    lote = await db.get(Lote, lote_id)
    if not lote:
        return None

    rows = await db.scalars(
        select(LoteProdutor).where(LoteProdutor.lote_id == lote_id)
    )
    lote_produtores = list(rows)

    produtores_info = []
    for lp in lote_produtores:
        produtor = await db.get(Produtor, lp.produtor_id)
        score = await db.scalar(
            select(Score).where(Score.produtor_id == lp.produtor_id, Score.ativo == True)  # noqa: E712
        )
        from app.models.user import User
        user = await db.get(User, produtor.user_id) if produtor else None
        produtores_info.append({
            "produtor_id": str(lp.produtor_id),
            "nome": user.nome_completo if user else "—",
            "municipio": produtor.municipio if produtor else "—",
            "estado": produtor.estado if produtor else "—",
            "volume_kg": float(lp.volume_kg),
            "latitude": float(produtor.latitude) if produtor and produtor.latitude else None,
            "longitude": float(produtor.longitude) if produtor and produtor.longitude else None,
            "car_numero": produtor.car_numero if produtor else None,
            "score_total": score.score_total if score else None,
            "faixa_score": score.faixa if score else lote.faixa_score,
        })

    ponto = await db.get(PontoEntrega, lote.ponto_entrega_id)

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
        "num_produtores": len(produtores_info),
        "produtores": produtores_info,
    }
