import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Numeric, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid
from app.db.base import Base

AuditStatus = SAEnum(
    "pendente", "agendada", "realizada", "aprovada", "reprovada", "suspensa",
    name="audit_status",
)
ComplianceStatus = SAEnum(
    "ok", "bloqueado", "em_defesa", "multado", "banido",
    name="compliance_status",
)


class Produtor(Base):
    __tablename__ = "produtores"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(native_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(native_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    cpf: Mapped[str] = mapped_column(String, unique=True, nullable=False)

    # Propriedade
    propriedade_nome: Mapped[str] = mapped_column(String, nullable=False)
    propriedade_hectares: Mapped[float | None] = mapped_column(Numeric(10, 2))
    municipio: Mapped[str] = mapped_column(String, nullable=False)
    estado: Mapped[str] = mapped_column(String(2), nullable=False)
    regiao_id: Mapped[int | None] = mapped_column(ForeignKey("regioes.id"))
    latitude: Mapped[float | None] = mapped_column(Numeric(10, 6))
    longitude: Mapped[float | None] = mapped_column(Numeric(10, 6))

    # CAR
    car_numero: Mapped[str | None] = mapped_column(String)
    car_status: Mapped[str | None] = mapped_column(String)

    # Status na plataforma
    audit_status: Mapped[str] = mapped_column(AuditStatus, default="pendente", nullable=False)
    data_ultima_auditoria: Mapped[datetime | None] = mapped_column()
    data_proxima_auditoria: Mapped[datetime | None] = mapped_column()

    # Agricultura familiar
    dap_caf: Mapped[str | None] = mapped_column(String)

    # Compliance
    compliance_status: Mapped[str] = mapped_column(ComplianceStatus, default="ok", nullable=False)
    bloqueado_em: Mapped[datetime | None] = mapped_column()
    bloqueio_motivo: Mapped[str | None] = mapped_column(String)

    criado_em: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))

    # Relacionamentos
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])  # noqa: F821
    regiao: Mapped["Regiao"] = relationship("Regiao")  # noqa: F821
