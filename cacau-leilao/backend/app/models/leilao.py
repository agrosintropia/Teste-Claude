import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Numeric, ForeignKey, DateTime, Enum as SAEnum, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

AuctionStatusEnum = SAEnum("agendado", "aberto", "encerrado", "cancelado", name="auction_status")
LanceStatusEnum = SAEnum("ativo", "superado", "vencedor", "perdedor", name="lance_status", create_constraint=False)


class Leilao(Base):
    __tablename__ = "leiloes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lote_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lotes.id"), unique=True, nullable=False
    )
    inicio: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    fim: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    preco_minimo_kg: Mapped[float] = mapped_column(Numeric(10, 4), nullable=False)
    preco_atual_kg: Mapped[float | None] = mapped_column(Numeric(10, 4))

    status: Mapped[str] = mapped_column(AuctionStatusEnum, default="agendado", nullable=False)
    vencedor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("compradores.id"))
    lance_final_kg: Mapped[float | None] = mapped_column(Numeric(10, 4))
    encerrado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    criado_em: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))

    lote: Mapped["Lote"] = relationship("Lote")  # noqa: F821
    vencedor: Mapped["Comprador | None"] = relationship("Comprador", foreign_keys=[vencedor_id])  # noqa: F821
    lances: Mapped[list["Lance"]] = relationship(
        "Lance", back_populates="leilao", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint("fim > inicio", name="chk_janela"),
    )


class Lance(Base):
    __tablename__ = "lances"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    leilao_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("leiloes.id"), nullable=False
    )
    comprador_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("compradores.id"), nullable=False
    )
    valor_kg: Mapped[float] = mapped_column(Numeric(10, 4), nullable=False)
    status: Mapped[str] = mapped_column(String, default="ativo", nullable=False)
    criado_em: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))

    leilao: Mapped["Leilao"] = relationship("Leilao", back_populates="lances")
    comprador: Mapped["Comprador"] = relationship("Comprador")  # noqa: F821

    __table_args__ = (
        CheckConstraint("valor_kg > 0", name="chk_valor"),
    )
