import uuid
from datetime import datetime, date, timezone
from sqlalchemy import Numeric, Date, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

ForecastStatusEnum = SAEnum(
    "rascunho", "publicado", "alocado", "entregue", "validado",
    name="forecast_status",
)


class ExpectativaProducao(Base):
    __tablename__ = "expectativas_producao"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    produtor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("produtores.id"), nullable=False)
    entrega_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    entrega_fim: Mapped[date] = mapped_column(Date, nullable=False)
    volume_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(ForecastStatusEnum, default="rascunho", nullable=False)
    lote_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("lotes.id"))
    observacoes: Mapped[str | None] = mapped_column(Text)
    criado_em: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))

    produtor: Mapped["Produtor"] = relationship("Produtor")  # noqa: F821
