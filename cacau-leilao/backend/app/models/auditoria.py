import uuid
from datetime import datetime, date, timezone
from sqlalchemy import String, Date, ForeignKey, Enum as SAEnum, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid
from app.db.base import Base

AuditTypeEnum = SAEnum("inicial", "anual", "extraordinaria", name="audit_type")
AuditStatusEnum = SAEnum(
    "pendente", "agendada", "realizada", "aprovada", "reprovada", "suspensa",
    name="audit_status",
)
ChecklistAnswerEnum = SAEnum("sim", "nao", "parcial", "na", name="checklist_answer")


class Auditoria(Base):
    __tablename__ = "auditorias"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(native_uuid=True), primary_key=True, default=uuid.uuid4)
    produtor_id: Mapped[uuid.UUID] = mapped_column(Uuid(native_uuid=True), ForeignKey("produtores.id"), nullable=False)
    auditor_id: Mapped[uuid.UUID] = mapped_column(Uuid(native_uuid=True), ForeignKey("users.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(AuditTypeEnum, nullable=False)
    data_agendada: Mapped[date] = mapped_column(Date, nullable=False)
    data_realizada: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(AuditStatusEnum, default="agendada", nullable=False)
    resultado: Mapped[str | None] = mapped_column(String)  # 'aprovado' | 'reprovado' | 'aprovado_com_ressalvas'
    observacoes: Mapped[str | None] = mapped_column(Text)
    criado_em: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))

    checklist: Mapped[list["AuditoriaChecklist"]] = relationship(
        "AuditoriaChecklist", back_populates="auditoria", cascade="all, delete-orphan"
    )


class AuditoriaChecklist(Base):
    __tablename__ = "auditoria_checklist"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    auditoria_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(native_uuid=True), ForeignKey("auditorias.id", ondelete="CASCADE"), nullable=False
    )
    criterio_id: Mapped[int] = mapped_column(ForeignKey("cscacau_criterios.id"), nullable=False)
    resposta: Mapped[str] = mapped_column(ChecklistAnswerEnum, nullable=False)
    pontos_obtidos: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    observacao: Mapped[str | None] = mapped_column(Text)
    evidencia_url: Mapped[str | None] = mapped_column(String)

    auditoria: Mapped["Auditoria"] = relationship("Auditoria", back_populates="checklist")
    criterio: Mapped["CscacauCriterio"] = relationship("CscacauCriterio")  # noqa: F821
