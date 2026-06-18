"""
Testes do algoritmo de formação de lotes.
Usa apenas funções puras (_agrupar) — sem banco.
"""
from datetime import date
from app.services.lote_service import _agrupar, _semana_iso, _codigo_lote, GrupoLote
from app.models.expectativa import ExpectativaProducao
from app.models.produtor import Produtor
from app.models.ponto_entrega import PontoEntrega
from app.models.score import Score
import uuid


def _ponto(lat: float, lon: float, raio: int = 50, estado: str = "BA", mun: str = "Ilheus") -> PontoEntrega:
    p = PontoEntrega()
    p.id = uuid.uuid4()
    p.latitude = lat
    p.longitude = lon
    p.raio_km = raio
    p.estado = estado
    p.municipio = mun
    p.ativo = True
    p.aprovado = True
    p.regiao_id = None
    return p


def _produtor(lat: float, lon: float) -> Produtor:
    p = Produtor()
    p.id = uuid.uuid4()
    p.user_id = uuid.uuid4()
    p.latitude = lat
    p.longitude = lon
    p.municipio = "Uruçuca"
    p.estado = "BA"
    p.audit_status = "aprovada"
    p.compliance_status = "ok"
    return p


def _score(produtor_id: uuid.UUID, faixa: str = "A") -> Score:
    s = Score()
    s.produtor_id = produtor_id
    s.faixa = faixa
    s.score_total = 80
    s.valido_ate = date(2099, 12, 31)
    s.ativo = True
    return s


def _exp(produtor_id: uuid.UUID, volume: float, inicio: date) -> ExpectativaProducao:
    e = ExpectativaProducao()
    e.id = uuid.uuid4()
    e.produtor_id = produtor_id
    e.volume_kg = volume
    e.entrega_inicio = inicio
    e.entrega_fim = date(inicio.year, inicio.month, inicio.day + 6)
    e.status = "publicado"
    e.lote_id = None
    return e


ILHEUS = (-14.789, -39.049)
SALVADOR = (-12.971, -38.501)  # ~400km de Ilhéus


def test_agrupa_produtores_dentro_do_raio():
    ponto = _ponto(*ILHEUS)
    prod1 = _produtor(-14.80, -39.10)   # ~2km de Ilhéus
    prod2 = _produtor(-14.75, -39.00)   # ~5km

    semana_inicio = date(2025, 6, 16)   # segunda-feira
    dados = [
        (_exp(prod1.id, 300, semana_inicio), prod1, _score(prod1.id, "A")),
        (_exp(prod2.id, 400, semana_inicio), prod2, _score(prod2.id, "A")),
    ]

    grupos = _agrupar([ponto], dados)
    assert len(grupos) == 1
    assert grupos[0].volume_total == 700
    assert grupos[0].faixa == "A"
    assert len(grupos[0].itens) == 2


def test_exclui_produtor_fora_do_raio():
    ponto = _ponto(*ILHEUS)
    prod_fora = _produtor(*SALVADOR)

    dados = [(_exp(prod_fora.id, 500, date(2025, 6, 16)), prod_fora, _score(prod_fora.id))]
    grupos = _agrupar([ponto], dados)
    assert len(grupos) == 0


def test_faixa_d_excluida():
    ponto = _ponto(*ILHEUS)
    prod = _produtor(-14.80, -39.10)

    dados = [(_exp(prod.id, 600, date(2025, 6, 16)), prod, _score(prod.id, faixa="D"))]
    grupos = _agrupar([ponto], dados)
    assert len(grupos) == 0


def test_grupos_separados_por_faixa():
    ponto = _ponto(*ILHEUS)
    prod_a = _produtor(-14.80, -39.10)
    prod_b = _produtor(-14.78, -39.05)

    semana = date(2025, 6, 16)
    dados = [
        (_exp(prod_a.id, 500, semana), prod_a, _score(prod_a.id, "A")),
        (_exp(prod_b.id, 600, semana), prod_b, _score(prod_b.id, "B")),
    ]
    grupos = _agrupar([ponto], dados)
    assert len(grupos) == 2
    faixas = {g.faixa for g in grupos}
    assert faixas == {"A", "B"}


def test_grupos_separados_por_semana():
    ponto = _ponto(*ILHEUS)
    prod = _produtor(-14.80, -39.10)

    dados = [
        (_exp(prod.id, 300, date(2025, 6, 16)), prod, _score(prod.id)),  # W25
        (_exp(prod.id, 400, date(2025, 6, 23)), prod, _score(prod.id)),  # W26
    ]
    grupos = _agrupar([ponto], dados)
    assert len(grupos) == 2


def test_semana_iso():
    assert _semana_iso(date(2025, 6, 16)) == "2025-W25"
    assert _semana_iso(date(2025, 6, 22)) == "2025-W25"
    assert _semana_iso(date(2025, 6, 23)) == "2025-W26"


def test_codigo_lote():
    ponto = _ponto(*ILHEUS)
    codigo = _codigo_lote(ponto, "A", "2025-W25")
    assert codigo == "BA-ILHEUS-A-2025-W25"
