import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Numeric, Date, Integer, ForeignKey, Boolean, DateTime, Enum as SAEnum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

PaymentTypeEnum = SAEnum("taxa_anual_produtor", "deducao_primeira_venda", "comissao_comprador", name="payment_type")
PaymentStatusEnum = SAEnum("pendente", "pago", "cancelado", name="payment_status")


class Tarifa(Base):
    __tablename__ = "tarifas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tipo: Mapped[str] = mapped_column(String, nullable=False)  # 'taxa_anual_produtor' | 'comissao_comprador_pct'
    valor: Mapped[float] = mapped_column(Numeric(10, 4), nullable=False)
    descricao: Mapped[str | None] = mapped_column(Text)
    vigente_de: Mapped[datetime] = mapped_column(Date, nullable=False)
    vigente_ate: Mapped[datetime | None] = mapped_column(Date)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Pagamento(Base):
    __tablename__ = "pagamentos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(PaymentTypeEnum, nullable=False)
    valor: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(PaymentStatusEnum, default="pendente", nullable=False)
    referencia: Mapped[str | None] = mapped_column(String)
    ano_referencia: Mapped[int | None] = mapped_column(Integer)
    vencimento: Mapped[datetime | None] = mapped_column(Date)
    pago_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    criado_em: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))


class RepasseLote(Base):
    __tablename__ = "repasse_lotes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lote_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("lotes.id"), unique=True, nullable=False)
    entrega_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("entregas.id"), nullable=False)
    comprador_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("compradores.id"), nullable=False)

    volume_recebido_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    preco_final_kg: Mapped[float] = mapped_column(Numeric(10, 4), nullable=False)
    valor_total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    comissao_pct: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    comissao_valor: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    valor_liquido_produtores: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    status: Mapped[str] = mapped_column(String, default="aguardando_pagamento", nullable=False)
    pago_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    pix_id_comprador: Mapped[str | None] = mapped_column(String)
    observacoes: Mapped[str | None] = mapped_column(Text)
    criado_em: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))

    splits: Mapped[list["SplitProdutor"]] = relationship(
        "SplitProdutor", back_populates="repasse", cascade="all, delete-orphan"
    )


class SplitProdutor(Base):
    __tablename__ = "splits_produtor"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repasse_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("repasse_lotes.id"), nullable=False)
    produtor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("produtores.id"), nullable=False)
    lote_produtor_id: Mapped[int] = mapped_column(Integer, ForeignKey("lote_produtores.id"), nullable=False)

    volume_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    percentual_lote: Mapped[float] = mapped_column(Numeric(7, 4), nullable=False)
    valor_bruto: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    taxa_anual_deduzida: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    valor_liquido: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    chave_pix: Mapped[str | None] = mapped_column(String)
    pix_status: Mapped[str] = mapped_column(String, default="pendente", nullable=False)
    pix_pago_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    pix_id_transacao: Mapped[str | None] = mapped_column(String)
    criado_em: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))

    repasse: Mapped["RepasseLote"] = relationship("RepasseLote", back_populates="splits")
    produtor: Mapped["Produtor"] = relationship("Produtor")  # noqa: F821
