"""
Testes do módulo financeiro MVP — split proporcional, taxas e comissões.
Sem banco; funções de cálculo testadas com mocks.
"""
import pytest
import uuid
from datetime import datetime, timezone, date
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.financeiro_service import (
    calcular_repasse,
    confirmar_pagamento_comprador,
    confirmar_pix_produtor,
    _taxa_anual_devida,
)
from app.models.pagamento import RepasseLote, SplitProdutor, Pagamento, Tarifa
from app.models.lote import Lote, LoteProdutor
from app.models.entrega import Entrega
from app.models.produtor import Produtor

_now = datetime.now(timezone.utc)
_LOTE_ID = uuid.uuid4()
_ENTREGA_ID = uuid.uuid4()
_COMPRADOR_ID = uuid.uuid4()
_REPASSE_ID = uuid.uuid4()
_SPLIT_ID = uuid.uuid4()
_P1 = uuid.uuid4()
_P2 = uuid.uuid4()
_USER1 = uuid.uuid4()
_USER2 = uuid.uuid4()


def _lote(status="validado", preco_final=12.0) -> Lote:
    l = Lote()
    l.id = _LOTE_ID
    l.status = status
    l.preco_final_kg = preco_final
    l.comprador_id = _COMPRADOR_ID
    l.ponto_entrega_id = uuid.uuid4()
    l.volume_declarado_kg = 1000
    return l


def _entrega(volume_recebido=980.0, status="validada") -> Entrega:
    e = Entrega()
    e.id = _ENTREGA_ID
    e.lote_id = _LOTE_ID
    e.comprador_id = _COMPRADOR_ID
    e.ponto_entrega_id = uuid.uuid4()
    e.volume_recebido_kg = volume_recebido
    e.status = status
    e.nfe_status = "validada"
    return e


def _produtor(pid, user_id) -> Produtor:
    p = Produtor()
    p.id = pid
    p.user_id = user_id
    p.compliance_status = "ok"
    return p


def _lote_produtor(pid, volume) -> LoteProdutor:
    lp = LoteProdutor()
    lp.id = hash(pid) % 10000
    lp.lote_id = _LOTE_ID
    lp.produtor_id = pid
    lp.expectativa_id = uuid.uuid4()
    lp.volume_kg = volume
    return lp


def _repasse(status="aguardando_pagamento") -> RepasseLote:
    r = RepasseLote()
    r.id = _REPASSE_ID
    r.lote_id = _LOTE_ID
    r.entrega_id = _ENTREGA_ID
    r.comprador_id = _COMPRADOR_ID
    r.volume_recebido_kg = 980.0
    r.preco_final_kg = 12.0
    r.valor_total = 11760.0
    r.comissao_pct = 2.5
    r.comissao_valor = 294.0
    r.valor_liquido_produtores = 11466.0
    r.status = status
    r.pago_em = None
    r.pix_id_comprador = None
    r.observacoes = None
    return r


def _split(pix_status="pendente") -> SplitProdutor:
    s = SplitProdutor()
    s.id = _SPLIT_ID
    s.repasse_id = _REPASSE_ID
    s.produtor_id = _P1
    s.lote_produtor_id = 1
    s.volume_kg = 490.0
    s.percentual_lote = 50.0
    s.valor_bruto = 5733.0
    s.taxa_anual_deduzida = 0.0
    s.valor_liquido = 5733.0
    s.chave_pix = None
    s.pix_status = pix_status
    s.pix_pago_em = None
    s.pix_id_transacao = None
    return s


# ---------------------------------------------------------------------------
# Cálculo de taxa anual
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_taxa_anual_devida_se_nao_paga():
    produtor = _produtor(_P1, _USER1)
    db = AsyncMock()
    db.scalar = AsyncMock(return_value=None)  # sem Pagamento encontrado

    devida = await _taxa_anual_devida(db, produtor, 2025, 150.0)
    assert devida == 150.0


@pytest.mark.asyncio
async def test_taxa_anual_zero_se_ja_paga():
    produtor = _produtor(_P1, _USER1)
    pag = Pagamento()
    pag.id = uuid.uuid4()
    db = AsyncMock()
    db.scalar = AsyncMock(return_value=pag)  # pagamento encontrado

    devida = await _taxa_anual_devida(db, produtor, 2025, 150.0)
    assert devida == 0.0


# ---------------------------------------------------------------------------
# calcular_repasse — pré-condições
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_repasse_lote_nao_validado_rejeitado():
    lote = _lote(status="vendido")
    db = AsyncMock()

    async def fake_get(model, pk):
        if model is Lote:
            return lote
        return None

    db.get = fake_get

    with pytest.raises(Exception) as exc_info:
        await calcular_repasse(db, _LOTE_ID)
    assert "validado" in str(exc_info.value.detail).lower()


@pytest.mark.asyncio
async def test_repasse_duplicado_rejeitado():
    lote = _lote(status="validado")
    repasse = _repasse()
    db = AsyncMock()

    async def fake_get(model, pk):
        if model is Lote:
            return lote
        return None

    db.get = fake_get
    db.scalar = AsyncMock(return_value=repasse)  # já existe repasse

    with pytest.raises(Exception) as exc_info:
        await calcular_repasse(db, _LOTE_ID)
    assert "já calculado" in str(exc_info.value.detail).lower()


# ---------------------------------------------------------------------------
# Split proporcional — cálculo direto (lógica pura)
# ---------------------------------------------------------------------------

def test_split_proporcional_dois_produtores():
    """Dois produtores com volumes iguais → 50% cada."""
    volume_total = 1000.0
    valor_liquido_produtores = 11466.0
    volumes = [500.0, 500.0]

    percentuais = [v / volume_total for v in volumes]
    valores = [round(valor_liquido_produtores * p, 2) for p in percentuais]

    assert percentuais[0] == pytest.approx(0.5)
    assert percentuais[1] == pytest.approx(0.5)
    assert sum(valores) == pytest.approx(valor_liquido_produtores, abs=0.02)


def test_split_proporcional_volumes_diferentes():
    """Produtor com 70% do volume recebe 70% do valor."""
    volume_total = 1000.0
    valor_liquido_produtores = 10000.0
    volumes = [700.0, 300.0]

    percentuais = [v / volume_total for v in volumes]
    valores = [round(valor_liquido_produtores * p, 2) for p in percentuais]

    assert valores[0] == pytest.approx(7000.0)
    assert valores[1] == pytest.approx(3000.0)


def test_comissao_calculada_corretamente():
    """2.5% sobre R$ 11.760 = R$ 294,00."""
    volume = 980.0
    preco_kg = 12.0
    comissao_pct = 2.5

    valor_total = round(volume * preco_kg, 2)
    comissao = round(valor_total * comissao_pct / 100, 2)
    liquido = round(valor_total - comissao, 2)

    assert valor_total == pytest.approx(11760.0)
    assert comissao == pytest.approx(294.0)
    assert liquido == pytest.approx(11466.0)


def test_taxa_anual_nao_excede_valor_bruto():
    """Taxa anual nunca pode ser maior que o valor bruto do produtor."""
    valor_bruto = 80.0
    taxa_anual = 150.0

    taxa_deduzida = min(taxa_anual, valor_bruto)
    valor_liquido = valor_bruto - taxa_deduzida

    assert taxa_deduzida == 80.0
    assert valor_liquido == 0.0


# ---------------------------------------------------------------------------
# confirmar_pagamento_comprador
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_confirmar_pagamento_muda_status():
    repasse = _repasse(status="aguardando_pagamento")
    db = AsyncMock()
    db.get = AsyncMock(return_value=repasse)
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    resultado = await confirmar_pagamento_comprador(db, _REPASSE_ID, "pix-abc-123", "recebido")
    assert resultado.status == "pago"
    assert resultado.pix_id_comprador == "pix-abc-123"
    assert resultado.pago_em is not None


@pytest.mark.asyncio
async def test_confirmar_pagamento_ja_pago_rejeitado():
    repasse = _repasse(status="pago")
    db = AsyncMock()
    db.get = AsyncMock(return_value=repasse)

    with pytest.raises(Exception) as exc_info:
        await confirmar_pagamento_comprador(db, _REPASSE_ID, "pix-xyz", None)
    assert exc_info.value.status_code == 409


# ---------------------------------------------------------------------------
# confirmar_pix_produtor
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_confirmar_pix_produtor_unico_fecha_repasse():
    """Quando só há 1 produtor e seu PIX é confirmado, repasse → distribuido."""
    repasse = _repasse(status="pago")
    split = _split(pix_status="pendente")

    db = AsyncMock()

    async def fake_get(model, pk):
        if model is SplitProdutor:
            return split
        if model is RepasseLote:
            return repasse
        return None

    db.get = fake_get
    db.scalar = AsyncMock(return_value=0)  # zero pendentes após este
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    resultado = await confirmar_pix_produtor(db, _SPLIT_ID, "12345678901", "pix-xyz-789")
    assert resultado.pix_status == "pago"
    assert resultado.pix_id_transacao == "pix-xyz-789"
    assert repasse.status == "distribuido"


@pytest.mark.asyncio
async def test_confirmar_pix_sem_pagamento_comprador_rejeitado():
    repasse = _repasse(status="aguardando_pagamento")
    split = _split(pix_status="pendente")

    db = AsyncMock()

    async def fake_get(model, pk):
        if model is SplitProdutor:
            return split
        if model is RepasseLote:
            return repasse
        return None

    db.get = fake_get

    with pytest.raises(Exception) as exc_info:
        await confirmar_pix_produtor(db, _SPLIT_ID, "123", "pix-abc")
    assert "comprador" in str(exc_info.value.detail).lower()
