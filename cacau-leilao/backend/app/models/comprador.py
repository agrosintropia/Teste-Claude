import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Integer, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid
from app.db.base import Base


class Comprador(Base):
    __tablename__ = "compradores"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(native_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(native_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    cnpj: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    tipo: Mapped[str] = mapped_column(String, nullable=False)  # 'atravessador' | 'moageira'
    razao_social: Mapped[str] = mapped_column(String, nullable=False)
    municipio: Mapped[str] = mapped_column(String, nullable=False)
    estado: Mapped[str] = mapped_column(String(2), nullable=False)
    regioes_ids: Mapped[str] = mapped_column(Text, default="[]")  # JSON array stored as text
    aprovado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])  # noqa: F821
    pontos_entrega: Mapped[list["PontoEntrega"]] = relationship("PontoEntrega", back_populates="comprador")  # noqa: F821
