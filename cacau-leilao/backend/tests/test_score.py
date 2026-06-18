from app.services.score_service import calcular_score, ScoreResult
from app.models.auditoria import AuditoriaChecklist
from app.models.cscacau_criterio import CscacauCriterio


def _criterio(area: str, pontos_max: int, obrigatorio: bool = False) -> CscacauCriterio:
    c = CscacauCriterio()
    c.area = area
    c.pontos_max = pontos_max
    c.obrigatorio = obrigatorio
    c.codigo = f"test.{area[:3]}.{pontos_max}"
    return c


def _item(resposta: str) -> AuditoriaChecklist:
    i = AuditoriaChecklist()
    i.resposta = resposta
    i.pontos_obtidos = 0
    return i


def test_score_perfeito():
    itens = [
        (_item("sim"), _criterio("gestao_producao", 10)),
        (_item("sim"), _criterio("gestao_producao", 10)),
        (_item("sim"), _criterio("gestao_ambiental", 10)),
        (_item("sim"), _criterio("gestao_ambiental", 10)),
        (_item("sim"), _criterio("gestao_social", 10)),
        (_item("sim"), _criterio("gestao_social", 10)),
    ]
    r = calcular_score(itens)
    assert r.score_total == 100
    assert r.faixa == "A"
    assert r.resultado == "aprovado"


def test_score_parcial_faixa_b():
    itens = [
        (_item("sim"), _criterio("gestao_producao", 10)),   # 100% producao
        (_item("nao"), _criterio("gestao_ambiental", 10)),  # 0% ambiental
        (_item("sim"), _criterio("gestao_social", 10)),     # 100% social
    ]
    r = calcular_score(itens)
    # total = 100*0.40 + 0*0.35 + 100*0.25 = 65 → faixa B
    assert r.score_total == 65
    assert r.faixa == "B"
    assert r.resultado == "aprovado_com_ressalvas"


def test_criterio_obrigatorio_reprovado():
    itens = [
        (_item("sim"),  _criterio("gestao_producao", 10)),
        (_item("nao"),  _criterio("gestao_producao", 10, obrigatorio=True)),
        (_item("sim"),  _criterio("gestao_ambiental", 10)),
        (_item("sim"),  _criterio("gestao_social", 10)),
    ]
    r = calcular_score(itens)
    assert r.resultado == "reprovado"
    assert len(r.reprovado_por) == 1


def test_resposta_na_conta_como_sim():
    itens = [(_item("na"), _criterio("gestao_producao", 10))]
    r = calcular_score(itens)
    assert r.score_producao == 100


def test_resposta_parcial_metade():
    itens = [(_item("parcial"), _criterio("gestao_producao", 10))]
    r = calcular_score(itens)
    assert r.score_producao == 50


def test_faixas():
    def score_com_total(total: int) -> str:
        from app.services.score_service import _faixa
        return _faixa(total)

    assert score_com_total(100) == "A"
    assert score_com_total(75)  == "A"
    assert score_com_total(74)  == "B"
    assert score_com_total(50)  == "B"
    assert score_com_total(49)  == "C"
    assert score_com_total(25)  == "C"
    assert score_com_total(24)  == "D"
    assert score_com_total(0)   == "D"
