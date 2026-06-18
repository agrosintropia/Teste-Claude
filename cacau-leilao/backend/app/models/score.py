import uuid
from datetime import datetime, date, timezone
from sqlalchemy import Integer, Boolean, Date, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

ScoreBandEnum = SAEnum("A", "B", "C", "D", name="score_band")


class Score(Base):
    __tablename__ = "scores"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    produtor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("produtores.id"), nullable=False)
    auditoria_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("auditorias.id"))

    score_gestao_producao: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    score_gestao_ambiental: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    score_gestao_social: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    score_total: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    faixa: Mapped[str] = mapped_column(ScoreBandEnum, nullable=False)

    valido_de: Mapped[date] = mapped_column(Date, nullable=False)
    valido_ate: Mapped[date] = mapped_column(Date, nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))

    produtor: Mapped["Produtor"] = relationship("Produtor")  # noqa: F821
    auditoria: Mapped["Auditoria"] = relationship("Auditoria")  # noqa: F821
