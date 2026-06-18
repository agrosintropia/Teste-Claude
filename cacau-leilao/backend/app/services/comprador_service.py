import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.comprador import Comprador
from app.models.ponto_entrega import PontoEntrega
from app.schemas.comprador import CompradorCreate, PontoEntregaCreate


async def criar_comprador(db: AsyncSession, user_id: uuid.UUID, data: CompradorCreate) -> Comprador:
    comprador = Comprador(
        user_id=user_id,
        cnpj=data.cnpj,
        tipo=data.tipo,
        razao_social=data.razao_social,
        municipio=data.municipio,
        estado=data.estado,
    )
    db.add(comprador)
    await db.commit()
    await db.refresh(comprador)
    return comprador


async def get_comprador_by_user(db: AsyncSession, user_id: uuid.UUID) -> Comprador | None:
    return await db.scalar(select(Comprador).where(Comprador.user_id == user_id))


async def adicionar_ponto_entrega(
    db: AsyncSession, comprador_id: uuid.UUID, data: PontoEntregaCreate
) -> PontoEntrega:
    ponto = PontoEntrega(
        comprador_id=comprador_id,
        nome=data.nome,
        endereco=data.endereco,
        municipio=data.municipio,
        estado=data.estado,
        latitude=data.latitude,
        longitude=data.longitude,
        raio_km=data.raio_km,
        capacidade_kg=data.capacidade_kg,
        contato_nome=data.contato_nome,
        contato_tel=data.contato_tel,
        aprovado=False,  # admin precisa aprovar antes de captar lotes
    )
    db.add(ponto)
    await db.commit()
    await db.refresh(ponto)
    return ponto


async def listar_pontos_entrega(db: AsyncSession, comprador_id: uuid.UUID) -> list[PontoEntrega]:
    result = await db.scalars(
        select(PontoEntrega).where(PontoEntrega.comprador_id == comprador_id)
    )
    return list(result)
