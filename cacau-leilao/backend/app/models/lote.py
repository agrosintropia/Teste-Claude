import uuid
from datetime import datetime, date, timezone
from sqlalchemy import String, Numeric, Date, ForeignKey, Integer, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid
from app.db.base import Base

LotStatusEnum = SAEnum(
    "formando", "aberto", "em_leilao", "vendido", "entregue", "validado", "cancelado",
    name="lot_status",
)
ScoreBandEnum = SAEnum("A", "B", "C", "D", name="score_band")


class Lote(Base):
    __tablename__ = "lotes"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(native_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    semana_iso: Mapped[str] = mapped_column(String, nullable=False)

    ponto_entrega_id: Mapped[uuid.UUID] = mapped_column(Uuid(native_uuid=True), ForeignKey("pontos_entrega.id"), nullable=False)
    regiao_id: Mapped[int | None] = mapped_column(ForeignKey("regioes.id"))
    faixa_score: Mapped[str] = mapped_column(ScoreBandEnum, nullable=False)

    entrega_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    entrega_fim: Mapped[date] = mapped_column(Date, nullable=False)

    volume_declarado_kg: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    volume_minimo_kg: Mapped[float] = mapped_column(Numeric(10, 2), default=500, nullable=False)

    cotacao_id: Mapped[int | None] = mapped_column(ForeignKey("cotacoes.id"))
    preco_base_kg: Mapped[float | None] = mapped_column(Numeric(10, 4))
    bonificacao_pct: Mapped[float | None] = mapped_column(Numeric(5, 2))
    preco_referencia_kg: Mapped[float | None] = mapped_column(Numeric(10, 4))
    preco_final_kg: Mapped[float | None] = mapped_column(Numeric(10, 4))

    comprador_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(native_uuid=True), ForeignKey("compradores.id"))
    status: Mapped[str] = mapped_column(LotStatusEnum, default="formando", nullable=False)

    criado_em: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
    atualizado_em: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))

    ponto_entrega: Mapped["PontoEntrega"] = relationship("PontoEntrega")  # noqa: F821
    produtores_lote: Mapped[list["LoteProdutor"]] = relationship(
        "LoteProdutor", back_populates="lote", cascade="all, delete-orphan"
    )


class LoteProdutor(Base):
    __tablename__ = "lote_produtores"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    lote_id: Mapped[uuid.UUID] = mapped_column(Uuid(native_uuid=True), ForeignKey("lotes.id", ondelete="CASCADE"), nullable=False)
    produtor_id: Mapped[uuid.UUID] = mapped_column(Uuid(native_uuid=True), ForeignKey("produtores.id"), nullable=False)
    expectativa_id: Mapped[uuid.UUID] = mapped_column(Uuid(native_uuid=True), ForeignKey("expectativas_producao.id"), nullable=False)
    volume_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    lote: Mapped["Lote"] = relationship("Lote", back_populates="produtores_lote")
    produtor: Mapped["Produtor"] = relationship("Produtor")  # noqa: F821
    expectativa: Mapped["ExpectativaProducao"] = relationship("ExpectativaProducao")  # noqa: F821
