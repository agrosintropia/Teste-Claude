import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Integer, Numeric, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base


class PontoEntrega(Base):
    __tablename__ = "pontos_entrega"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    comprador_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("compradores.id"), nullable=False
    )
    nome: Mapped[str] = mapped_column(String, nullable=False)
    endereco: Mapped[str] = mapped_column(String, nullable=False)
    municipio: Mapped[str] = mapped_column(String, nullable=False)
    estado: Mapped[str] = mapped_column(String(2), nullable=False)
    latitude: Mapped[float] = mapped_column(Numeric(10, 6), nullable=False)
    longitude: Mapped[float] = mapped_column(Numeric(10, 6), nullable=False)
    raio_km: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    regiao_id: Mapped[int | None] = mapped_column(ForeignKey("regioes.id"))
    capacidade_kg: Mapped[float | None] = mapped_column(Numeric(12, 2))
    contato_nome: Mapped[str | None] = mapped_column(String)
    contato_tel: Mapped[str | None] = mapped_column(String)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    aprovado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))

    comprador: Mapped["Comprador"] = relationship("Comprador", back_populates="pontos_entrega")  # noqa: F821
