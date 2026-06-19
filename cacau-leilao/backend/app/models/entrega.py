import uuid
from datetime import datetime, date, timezone
from sqlalchemy import String, Numeric, Date, Boolean, ForeignKey, DateTime, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid
from app.db.base import Base

NfeStatusEnum = SAEnum("pendente", "upload_produtor", "upload_comprador", "validada", "expirada", name="nfe_status")
DeliveryStatusEnum = SAEnum("pendente", "recebida", "validada", "contestada", name="delivery_status")
DefenseStatusEnum = SAEnum("aberto", "em_analise", "aprovado", "rejeitado", name="defense_status")


class Entrega(Base):
    __tablename__ = "entregas"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(native_uuid=True), primary_key=True, default=uuid.uuid4)
    lote_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(native_uuid=True), ForeignKey("lotes.id"), unique=True, nullable=False
    )
    comprador_id: Mapped[uuid.UUID] = mapped_column(Uuid(native_uuid=True), ForeignKey("compradores.id"), nullable=False)
    ponto_entrega_id: Mapped[uuid.UUID] = mapped_column(Uuid(native_uuid=True), ForeignKey("pontos_entrega.id"), nullable=False)

    data_prevista: Mapped[date] = mapped_column(Date, nullable=False)
    data_recebimento: Mapped[date | None] = mapped_column(Date)

    volume_declarado_kg: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    volume_recebido_kg: Mapped[float | None] = mapped_column(Numeric(10, 2))

    umidade_pct: Mapped[float | None] = mapped_column(Numeric(5, 2))
    fermentacao_pct: Mapped[float | None] = mapped_column(Numeric(5, 2))
    qualidade_obs: Mapped[str | None] = mapped_column(Text)

    nfe_status: Mapped[str] = mapped_column(NfeStatusEnum, default="pendente", nullable=False)
    nfe_numero: Mapped[str | None] = mapped_column(String)
    nfe_url: Mapped[str | None] = mapped_column(String)
    nfe_tipo: Mapped[str | None] = mapped_column(String)  # 'emissao_produtor' | 'contra_nota_comprador'
    nfe_prazo: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    nfe_enviada_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    qr_code_token: Mapped[str | None] = mapped_column(String, unique=True)
    qr_code_gerado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    qr_code_url: Mapped[str | None] = mapped_column(String)

    status: Mapped[str] = mapped_column(DeliveryStatusEnum, default="pendente", nullable=False)
    validado_por: Mapped[uuid.UUID | None] = mapped_column(Uuid(native_uuid=True), ForeignKey("users.id"))
    validado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    observacoes: Mapped[str | None] = mapped_column(Text)

    criado_em: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))

    lote: Mapped["Lote"] = relationship("Lote")  # noqa: F821
    comprador: Mapped["Comprador"] = relationship("Comprador")  # noqa: F821
    ponto_entrega: Mapped["PontoEntrega"] = relationship("PontoEntrega")  # noqa: F821


class ProcessoDefesa(Base):
    __tablename__ = "processos_defesa"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(native_uuid=True), primary_key=True, default=uuid.uuid4)
    produtor_id: Mapped[uuid.UUID] = mapped_column(Uuid(native_uuid=True), ForeignKey("produtores.id"), nullable=False)
    entrega_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(native_uuid=True), ForeignKey("entregas.id"))

    motivo_bloqueio: Mapped[str] = mapped_column(Text, nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    evidencias_urls: Mapped[str] = mapped_column(Text, default="[]", nullable=False)  # JSON array as text

    status: Mapped[str] = mapped_column(DefenseStatusEnum, default="aberto", nullable=False)
    julgado_por: Mapped[uuid.UUID | None] = mapped_column(Uuid(native_uuid=True), ForeignKey("users.id"))
    julgado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    decisao: Mapped[str | None] = mapped_column(Text)
    multa_valor: Mapped[float | None] = mapped_column(Numeric(10, 2))

    criado_em: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))

    produtor: Mapped["Produtor"] = relationship("Produtor")  # noqa: F821
    entrega: Mapped["Entrega | None"] = relationship("Entrega")  # noqa: F821
