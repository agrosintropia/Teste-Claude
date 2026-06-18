import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.produtor import Produtor
from app.models.ponto_entrega import PontoEntrega
from app.schemas.produtor import ProdutorCreate
from app.services.geo import produtor_dentro_do_raio


async def criar_produtor(db: AsyncSession, user_id: uuid.UUID, data: ProdutorCreate) -> Produtor:
    produtor = Produtor(
        user_id=user_id,
        cpf=data.cpf,
        propriedade_nome=data.propriedade_nome,
        municipio=data.municipio,
        estado=data.estado,
        latitude=data.latitude,
        longitude=data.longitude,
        propriedade_hectares=data.propriedade_hectares,
        car_numero=data.car_numero,
        dap_caf=data.dap_caf,
    )
    db.add(produtor)
    await db.commit()
    await db.refresh(produtor)
    return produtor


async def get_produtor_by_user(db: AsyncSession, user_id: uuid.UUID) -> Produtor | None:
    return await db.scalar(select(Produtor).where(Produtor.user_id == user_id))


async def pontos_entrega_elegiveis(
    db: AsyncSession,
    lat: float,
    lon: float,
) -> list[PontoEntrega]:
    """Retorna todos os pontos de entrega ativos e aprovados dentro do raio do produtor."""
    pontos = await db.scalars(
        select(PontoEntrega).where(PontoEntrega.ativo == True, PontoEntrega.aprovado == True)  # noqa: E712
    )
    return [
        p for p in pontos
        if produtor_dentro_do_raio(lat, lon, float(p.latitude), float(p.longitude), p.raio_km)
    ]
