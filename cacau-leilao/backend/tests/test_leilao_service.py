"""
Testes do Motor de Leilão — funções puras e lógica de negócio sem banco.
"""
import pytest
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.leilao_service import (
    fazer_lance,
    encerrar_leilao,
    encerrar_leiloes_abertos,
)
from app.models.leilao import Leilao, Lance
from app.models.comprador import Comprador
from app.models.lote import Lote
from app.models.ponto_entrega import PontoEntrega


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_now = datetime.now(timezone.utc)
_LOTE_ID = uuid.uuid4()
_LEILAO_ID = uuid.uuid4()
_COMPRADOR_ID = uuid.uuid4()
_PONTO_ID = uuid.uuid4()


def _lote(ponto_id=_PONTO_ID) -> Lote:
    l = Lote()
    l.id = _LOTE_ID
    l.ponto_entrega_id = ponto_id
    l.status = "em_leilao"
    l.faixa_score = "A"
    l.codigo = "BA-ILHEUS-A-2025-W25"
    l.semana_iso = "2025-W25"
    l.entrega_inicio = _now.date()
    l.entrega_fim = _now.date()
    l.volume_declarado_kg = 1000
    l.volume_minimo_kg = 500
    l.preco_base_kg = 10.0
    l.bonificacao_pct = 5.0
    l.preco_referencia_kg = 10.5
    l.preco_final_kg = None
    l.comprador_id = None
    return l


def _leilao(status="aberto", preco_atual=None) -> Leilao:
    l = Leilao()
    l.id = _LEILAO_ID
    l.lote_id = _LOTE_ID
    l.inicio = _now - timedelta(hours=1)
    l.fim = _now + timedelta(hours=23)
    l.preco_minimo_kg = 10.0
    l.preco_atual_kg = preco_atual
    l.status = status
    l.vencedor_id = None
    l.lance_final_kg = None
    l.encerrado_em = None
    return l


def _comprador(tipo="moageira", aprovado=True, ponto_id=_PONTO_ID) -> Comprador:
    c = Comprador()
    c.id = _COMPRADOR_ID
    c.user_id = uuid.uuid4()
    c.tipo = tipo
    c.aprovado = aprovado
    return c


def _ponto(comprador_id=_COMPRADOR_ID) -> PontoEntrega:
    p = PontoEntrega()
    p.id = _PONTO_ID
    p.comprador_id = comprador_id
    return p


def _db_mock(leilao=None, lote=None, comprador=None, ponto=None, lances=None):
    db = AsyncMock()

    async def fake_get(model, pk):
        if model is Leilao:
            return leilao
        if model is Lote:
            return lote
        if model is Comprador:
            return comprador
        if model is PontoEntrega:
            return ponto
        return None

    db.get = fake_get
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    execute_result = AsyncMock()
    db.execute = AsyncMock(return_value=execute_result)

    scalar_result = AsyncMock()
    if lances:
        scalar_result.__aiter__ = lambda s: iter(lances)
    db.scalar = AsyncMock(return_value=lances[0] if lances else None)
    db.scalars = AsyncMock(return_value=MagicMock(__iter__=lambda s: iter(lances or [])))

    return db


# ---------------------------------------------------------------------------
# Testes
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_lance_abaixo_do_minimo_rejeitado():
    leilao = _leilao(status="aberto")
    db = _db_mock(leilao=leilao, lote=_lote(), comprador=_comprador())

    with pytest.raises(Exception) as exc_info:
        await fazer_lance(db, _LEILAO_ID, _COMPRADOR_ID, valor_kg=5.0)
    assert "preço mínimo" in str(exc_info.value.detail).lower()


@pytest.mark.asyncio
async def test_lance_abaixo_do_atual_rejeitado():
    leilao = _leilao(status="aberto", preco_atual=12.0)
    db = _db_mock(leilao=leilao, lote=_lote(), comprador=_comprador())

    with pytest.raises(Exception) as exc_info:
        await fazer_lance(db, _LEILAO_ID, _COMPRADOR_ID, valor_kg=11.0)
    assert "lance atual" in str(exc_info.value.detail).lower()


@pytest.mark.asyncio
async def test_lance_em_leilao_nao_aberto_rejeitado():
    leilao = _leilao(status="encerrado")
    db = _db_mock(leilao=leilao, lote=_lote(), comprador=_comprador())

    with pytest.raises(Exception) as exc_info:
        await fazer_lance(db, _LEILAO_ID, _COMPRADOR_ID, valor_kg=15.0)
    assert "aberto" in str(exc_info.value.detail).lower()


@pytest.mark.asyncio
async def test_comprador_nao_aprovado_rejeitado():
    leilao = _leilao(status="aberto")
    db = _db_mock(leilao=leilao, lote=_lote(), comprador=_comprador(aprovado=False))

    with pytest.raises(Exception) as exc_info:
        await fazer_lance(db, _LEILAO_ID, _COMPRADOR_ID, valor_kg=15.0)
    assert "habilitado" in str(exc_info.value.detail).lower()


@pytest.mark.asyncio
async def test_atravessador_fora_do_ponto_rejeitado():
    outro_comprador_id = uuid.uuid4()
    leilao = _leilao(status="aberto")
    comprador = _comprador(tipo="atravessador")
    ponto = _ponto(comprador_id=outro_comprador_id)  # ponto pertence a outro comprador
    db = _db_mock(leilao=leilao, lote=_lote(), comprador=comprador, ponto=ponto)

    with pytest.raises(Exception) as exc_info:
        await fazer_lance(db, _LEILAO_ID, _COMPRADOR_ID, valor_kg=15.0)
    assert "ponto de entrega" in str(exc_info.value.detail).lower()


@pytest.mark.asyncio
async def test_atravessador_no_proprio_ponto_aceito():
    leilao = _leilao(status="aberto")
    comprador = _comprador(tipo="atravessador")
    ponto = _ponto(comprador_id=_COMPRADOR_ID)  # ponto pertence ao comprador
    db = _db_mock(leilao=leilao, lote=_lote(), comprador=comprador, ponto=ponto)

    lance = await fazer_lance(db, _LEILAO_ID, _COMPRADOR_ID, valor_kg=15.0)
    assert lance.valor_kg == 15.0
    assert lance.status == "ativo"


@pytest.mark.asyncio
async def test_encerrar_sem_lances_retorna_sem_lances():
    leilao = _leilao(status="aberto")
    lote = _lote()
    db = _db_mock(leilao=leilao, lote=lote, lances=[])

    resultado = await encerrar_leilao(db, _LEILAO_ID)
    assert resultado["resultado"] == "sem_lances"
    assert leilao.status == "encerrado"
    assert lote.status == "aberto"  # volta para aberto


@pytest.mark.asyncio
async def test_encerrar_com_lance_vencedor():
    leilao = _leilao(status="aberto", preco_atual=15.0)
    lote = _lote()

    lance = Lance()
    lance.id = uuid.uuid4()
    lance.leilao_id = _LEILAO_ID
    lance.comprador_id = _COMPRADOR_ID
    lance.valor_kg = 15.0
    lance.status = "ativo"

    db = _db_mock(leilao=leilao, lote=lote, lances=[lance])

    resultado = await encerrar_leilao(db, _LEILAO_ID)
    assert resultado["resultado"] == "vendido"
    assert resultado["lance_final_kg"] == 15.0
    assert leilao.vencedor_id == _COMPRADOR_ID
    assert lote.status == "vendido"
