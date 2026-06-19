from sqlalchemy import String, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Regiao(Base):
    __tablename__ = "regioes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String, nullable=False)
    estado: Mapped[str] = mapped_column(String(2), nullable=False)
    municipios: Mapped[str] = mapped_column(Text, default="[]")  # JSON array stored as text
    descricao: Mapped[str | None] = mapped_column(String)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
