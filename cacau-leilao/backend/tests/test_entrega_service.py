"""
Testes do Motor Fiscal — NF-e, QR Code, balança e tribunal de entregas.
"""
import pytest
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock

from app.services.entrega_service import (
    upload_nfe,
    validar_nfe,
    registrar_peso,
    validar_entrega,
    submeter_defesa,
    julgar_defesa,
)
from app.models.entrega import Entrega, ProcessoDefesa
from app.models.lote import Lote
from app.models.produtor import Produtor

_now = datetime.now(timezone.utc)
_ENTREGA_ID = uuid.uuid4()
_LOTE_ID = uuid.uuid4()
_COMPRADOR_ID = uuid.uuid4()
_PRODUTOR_ID = uuid.uuid4()
_PONTO_ID = uuid.uuid4()
_ADMIN_ID = uuid.uuid4()
_QR_TOKEN = "qr-abc-123"


def _entrega(
    nfe_status="pendente",
    status="pendente",
    nfe_prazo=None,
    qr_token=None,
    comprador_id=_COMPRADOR_ID,
) -> Entrega:
    e = Entrega()
    e.id = _ENTREGA_ID
    e.lote_id = _LOTE_ID
    e.comprador_id = comprador_id
    e.ponto_entrega_id = _PONTO_ID
    e.data_prevista = _now.date()
    e.data_recebimento = None
    e.volume_declarado_kg = 800.0
    e.volume_recebido_kg = None
    e.nfe_status = nfe_status
    e.nfe_numero = None
    e.nfe_url = None
    e.nfe_tipo = None
    e.nfe_prazo = nfe_prazo or (_now + timedelta(hours=20))
    e.nfe_enviada_em = None
    e.qr_code_token = qr_token
    e.qr_code_gerado_em = None
    e.qr_code_url = None
    e.status = status
    e.validado_por = None
    e.validado_em = None
    e.observacoes = None
    return e


def _lote() -> Lote:
    l = Lote()
    l.id = _LOTE_ID
    l.status = "vendido"
    l.ponto_entrega_id = _PONTO_ID
    l.volume_declarado_kg = 800.0
    return l


def _produtor() -> Produtor:
    p = Produtor()
    p.id = _PRODUTOR_ID
    p.compliance_status = "bloqueado"
    p.bloqueado_em = _now
    p.bloqueio_motivo = "teste"
    return p


def _processo(produtor_id=_PRODUTOR_ID, status="aberto") -> ProcessoDefesa:
    pr = ProcessoDefesa()
    pr.id = uuid.uuid4()
    pr.produtor_id = produtor_id
    pr.entrega_id = _ENTREGA_ID
    pr.motivo_bloqueio = "NF-e não enviada"
    pr.descricao = "Processo aberto automaticamente."
    pr.evidencias_urls = []
    pr.status = status
    pr.julgado_por = None
    pr.julgado_em = None
    pr.decisao = None
    pr.multa_valor = None
    return pr


def _db_mock(entrega=None, lote=None, produtor=None, processo=None, scalar_val=None):
    db = AsyncMock()

    async def fake_get(model, pk):
        if model is Entrega:
            return entrega
        if model is Lote:
            return lote
        if model is Produtor:
            return produtor
        if model is ProcessoDefesa:
            return processo
        return None

    db.get = fake_get
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.execute = AsyncMock()

    if scalar_val is not None:
        db.scalar = AsyncMock(return_value=scalar_val)
    else:
        db.scalar = AsyncMock(return_value=entrega)

    db.scalars = AsyncMock(return_value=MagicMock(__iter__=lambda s: iter([])))
    return db


# ---------------------------------------------------------------------------
# NF-e upload
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_upload_nfe_valido():
    entrega = _entrega(nfe_status="pendente")
    db = _db_mock(entrega=entrega)

    resultado = await upload_nfe(
        db, _ENTREGA_ID, _COMPRADOR_ID,
        "35250000000000000000000000000000000000000000", "https://storage/nfe.xml", "contra_nota_comprador"
    )
    assert resultado.nfe_status == "upload_comprador"
    assert resultado.nfe_numero is not None


@pytest.mark.asyncio
async def test_upload_nfe_prazo_expirado_rejeitado():
    entrega = _entrega(nfe_status="pendente", nfe_prazo=_now - timedelta(hours=1))
    db = _db_mock(entrega=entrega)

    with pytest.raises(Exception) as exc_info:
        await upload_nfe(db, _ENTREGA_ID, _COMPRADOR_ID, "123", "url", "contra_nota_comprador")
    assert "expirado" in str(exc_info.value.detail).lower()


@pytest.mark.asyncio
async def test_upload_nfe_status_invalido_rejeitado():
    entrega = _entrega(nfe_status="validada")
    db = _db_mock(entrega=entrega)

    with pytest.raises(Exception) as exc_info:
        await upload_nfe(db, _ENTREGA_ID, _COMPRADOR_ID, "123", "url", "contra_nota_comprador")
    assert "validada" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_upload_nfe_comprador_errado_rejeitado():
    outro = uuid.uuid4()
    entrega = _entrega(nfe_status="pendente", comprador_id=outro)
    db = _db_mock(entrega=entrega)

    with pytest.raises(Exception) as exc_info:
        await upload_nfe(db, _ENTREGA_ID, _COMPRADOR_ID, "123", "url", "contra_nota_comprador")
    assert exc_info.value.status_code == 403


# ---------------------------------------------------------------------------
# Validação NF-e → gera QR Code
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_validar_nfe_gera_qr_code():
    entrega = _entrega(nfe_status="upload_comprador")
    db = _db_mock(entrega=entrega)

    resultado = await validar_nfe(db, _ENTREGA_ID, _ADMIN_ID)
    assert resultado.nfe_status == "validada"
    assert resultado.qr_code_token is not None
    assert resultado.qr_code_url is not None
    assert resultado.qr_code_gerado_em is not None


@pytest.mark.asyncio
async def test_validar_nfe_status_errado_rejeitado():
    entrega = _entrega(nfe_status="pendente")
    db = _db_mock(entrega=entrega)

    with pytest.raises(Exception) as exc_info:
        await validar_nfe(db, _ENTREGA_ID, _ADMIN_ID)
    assert "validação" in str(exc_info.value.detail).lower()


# ---------------------------------------------------------------------------
# Módulo de Balança
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_registrar_peso_via_qr():
    entrega = _entrega(nfe_status="validada", status="pendente", qr_token=_QR_TOKEN)
    db = _db_mock(entrega=None, scalar_val=entrega)

    resultado = await registrar_peso(
        db, _QR_TOKEN, _COMPRADOR_ID, 780.0, 7.5, 85.0, "Boa fermentação"
    )
    assert resultado.status == "recebida"
    assert resultado.volume_recebido_kg == 780.0
    assert resultado.data_recebimento is not None


@pytest.mark.asyncio
async def test_registrar_peso_qr_invalido():
    db = _db_mock(entrega=None, scalar_val=None)

    with pytest.raises(Exception) as exc_info:
        await registrar_peso(db, "token-invalido", _COMPRADOR_ID, 500.0, None, None, None)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_registrar_peso_sem_nfe_validada():
    entrega = _entrega(nfe_status="pendente", status="pendente", qr_token=_QR_TOKEN)
    db = _db_mock(entrega=None, scalar_val=entrega)

    with pytest.raises(Exception) as exc_info:
        await registrar_peso(db, _QR_TOKEN, _COMPRADOR_ID, 500.0, None, None, None)
    assert "NF-e" in str(exc_info.value.detail)


# ---------------------------------------------------------------------------
# Validação final da entrega
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_validar_entrega_muda_lote_para_validado():
    entrega = _entrega(nfe_status="validada", status="recebida")
    lote = _lote()
    db = _db_mock(entrega=entrega, lote=lote)

    resultado = await validar_entrega(db, _ENTREGA_ID, _ADMIN_ID)
    assert resultado.status == "validada"
    assert lote.status == "validado"


@pytest.mark.asyncio
async def test_validar_entrega_status_errado_rejeitado():
    entrega = _entrega(status="pendente")
    db = _db_mock(entrega=entrega)

    with pytest.raises(Exception) as exc_info:
        await validar_entrega(db, _ENTREGA_ID, _ADMIN_ID)
    assert exc_info.value.status_code == 409


# ---------------------------------------------------------------------------
# Tribunal de Entregas
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_submeter_defesa_muda_status_produtor():
    processo = _processo(produtor_id=_PRODUTOR_ID, status="aberto")
    produtor = _produtor()
    db = _db_mock(produtor=produtor, processo=processo)

    resultado = await submeter_defesa(
        db, _PRODUTOR_ID, processo.id,
        "Não consegui enviar a NF-e pois o sistema estava fora.", ["https://evidencia.jpg"]
    )
    assert resultado.status == "em_analise"
    assert produtor.compliance_status == "em_defesa"


@pytest.mark.asyncio
async def test_julgar_defesa_aprovada_desbloqueia_produtor():
    processo = _processo(status="em_analise")
    produtor = _produtor()
    db = _db_mock(produtor=produtor, processo=processo)

    resultado = await julgar_defesa(
        db, processo.id, _ADMIN_ID,
        "Defesa aceita — problema técnico comprovado.", True, None, None
    )
    assert resultado.status == "aprovado"
    assert produtor.compliance_status == "ok"


@pytest.mark.asyncio
async def test_julgar_defesa_rejeitada_multa_produtor():
    processo = _processo(status="em_analise")
    produtor = _produtor()
    db = _db_mock(produtor=produtor, processo=processo)

    resultado = await julgar_defesa(
        db, processo.id, _ADMIN_ID,
        "Defesa insuficiente — produtor não apresentou evidências.", False, 500.0, "multado"
    )
    assert resultado.status == "rejeitado"
    assert resultado.multa_valor == 500.0
    assert produtor.compliance_status == "multado"
