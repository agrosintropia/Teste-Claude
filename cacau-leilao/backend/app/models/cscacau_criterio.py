from sqlalchemy import String, Boolean, Integer, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

AreaEnum = SAEnum(
    "gestao_producao", "gestao_ambiental", "gestao_social",
    name="cscacau_area",
)


class CscacauCriterio(Base):
    __tablename__ = "cscacau_criterios"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    codigo: Mapped[str] = mapped_column(String, unique=True, nullable=False)  # ex: '1.1.1'
    area: Mapped[str] = mapped_column(AreaEnum, nullable=False)
    titulo: Mapped[str] = mapped_column(String, nullable=False)
    descricao: Mapped[str | None] = mapped_column(String)
    pontos_max: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    obrigatorio: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
