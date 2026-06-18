import uuid
import json
from datetime import timezone
from fastapi import APIRouter, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.api.v1.deps import get_current_user, require_role
from app.schemas.leilao import LeilaoCreate, LanceCreate, LeilaoResponse, LeilaoDetalheResponse
from app.models.leilao import Leilao
from app.models.comprador import Comprador
from app.services import leilao_service
from app.core.security import decode_access_token
from app.main import limiter

router = APIRouter(prefix="/leiloes", tags=["leiloes"])
_admin = require_role("admin")
_comprador = require_role("atravessador", "moageira")


# ---------------------------------------------------------------------------
# WebSocket connection manager (in-memory — single process)
# ---------------------------------------------------------------------------

class _ConnectionManager:
    def __init__(self):
        self._rooms: dict[str, list[WebSocket]] = {}

    async def connect(self, leilao_id: str, ws: WebSocket):
        await ws.accept()
        self._rooms.setdefault(leilao_id, []).append(ws)

    def disconnect(self, leilao_id: str, ws: WebSocket):
        room = self._rooms.get(leilao_id, [])
        if ws in room:
            room.remove(ws)

    async def broadcast(self, leilao_id: str, payload: dict):
        msg = json.dumps(payload, default=str)
        for ws in list(self._rooms.get(leilao_id, [])):
            try:
                await ws.send_text(msg)
            except Exception:
                self.disconnect(leilao_id, ws)


_manager = _ConnectionManager()


# ---------------------------------------------------------------------------
# REST endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=list[LeilaoResponse])
async def listar_leiloes(
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    query = select(Leilao)
    if status:
        query = query.where(Leilao.status == status)
    rows = await db.scalars(query.order_by(Leilao.inicio.desc()))
    leiloes = list(rows)

    result = []
    for l in leiloes:
        num = len(l.lances) if hasattr(l, "lances") else 0
        # Count via subquery would be better in prod; for MVP we fetch inline
        from sqlalchemy import func
        from app.models.leilao import Lance
        count = await db.scalar(
            select(func.count()).where(Lance.leilao_id == l.id)
        )
        result.append({
            "id": str(l.id),
            "lote_id": str(l.lote_id),
            "inicio": l.inicio,
            "fim": l.fim,
            "preco_minimo_kg": float(l.preco_minimo_kg),
            "preco_atual_kg": float(l.preco_atual_kg) if l.preco_atual_kg else None,
            "status": l.status,
            "vencedor_id": str(l.vencedor_id) if l.vencedor_id else None,
            "lance_final_kg": float(l.lance_final_kg) if l.lance_final_kg else None,
            "encerrado_em": l.encerrado_em,
            "criado_em": l.criado_em,
            "num_lances": count or 0,
        })
    return result


@router.post("", response_model=LeilaoResponse, status_code=201)
async def criar_leilao(
    body: LeilaoCreate,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(_admin),
):
    leilao = await leilao_service.criar_leilao(
        db, body.lote_id, body.inicio, body.fim, body.preco_minimo_kg
    )
    return {
        "id": str(leilao.id),
        "lote_id": str(leilao.lote_id),
        "inicio": leilao.inicio,
        "fim": leilao.fim,
        "preco_minimo_kg": float(leilao.preco_minimo_kg),
        "preco_atual_kg": None,
        "status": leilao.status,
        "vencedor_id": None,
        "lance_final_kg": None,
        "encerrado_em": None,
        "criado_em": leilao.criado_em,
        "num_lances": 0,
    }


@router.get("/{leilao_id}", response_model=LeilaoDetalheResponse)
async def detalhe_leilao(
    leilao_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    detalhe = await leilao_service.get_leilao_detalhe(db, leilao_id)
    if not detalhe:
        raise HTTPException(status_code=404, detail="Leilão não encontrado")
    return detalhe


@router.post("/{leilao_id}/abrir", response_model=LeilaoResponse)
async def abrir_leilao(
    leilao_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(_admin),
):
    leilao = await leilao_service.abrir_leilao(db, leilao_id)
    await _manager.broadcast(str(leilao_id), {"evento": "leilao_aberto", "leilao_id": str(leilao_id)})
    return await leilao_service.get_leilao_detalhe(db, leilao_id)


@router.post("/{leilao_id}/lances", status_code=201)
@limiter.limit("30/minute")
async def fazer_lance(
    request: Request,
    leilao_id: uuid.UUID,
    body: LanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(_comprador),
):
    comprador = await db.scalar(
        select(Comprador).where(Comprador.user_id == uuid.UUID(current_user["user_id"]))
    )
    if not comprador:
        raise HTTPException(status_code=404, detail="Perfil de comprador não encontrado")

    lance = await leilao_service.fazer_lance(db, leilao_id, comprador.id, body.valor_kg)

    payload = {
        "evento": "novo_lance",
        "leilao_id": str(leilao_id),
        "valor_kg": float(lance.valor_kg),
        "criado_em": lance.criado_em.isoformat(),
    }
    await _manager.broadcast(str(leilao_id), payload)

    return {
        "id": str(lance.id),
        "leilao_id": str(lance.leilao_id),
        "comprador_id": str(lance.comprador_id),
        "valor_kg": float(lance.valor_kg),
        "status": lance.status,
        "criado_em": lance.criado_em,
    }


@router.post("/{leilao_id}/encerrar")
async def encerrar_leilao(
    leilao_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(_admin),
):
    resultado = await leilao_service.encerrar_leilao(db, leilao_id)
    await _manager.broadcast(str(leilao_id), {"evento": "leilao_encerrado", **resultado})
    return resultado


# ---------------------------------------------------------------------------
# WebSocket — canal de lances em tempo real
# ---------------------------------------------------------------------------

@router.websocket("/{leilao_id}/ws")
async def ws_leilao(leilao_id: uuid.UUID, websocket: WebSocket, token: str = Query(...)):
    try:
        decode_access_token(token)  # valida JWT; 401 fecha conexão
    except Exception:
        await websocket.close(code=4001)
        return

    room = str(leilao_id)
    await _manager.connect(room, websocket)
    try:
        while True:
            # Mantém a conexão viva; mensagens do cliente são ignoradas no MVP
            await websocket.receive_text()
    except WebSocketDisconnect:
        _manager.disconnect(room, websocket)
