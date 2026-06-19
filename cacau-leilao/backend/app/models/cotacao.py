from datetime import datetime, date, timezone
from sqlalchemy import String, Numeric, Date, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Cotacao(Base):
    __tablename__ = "cotacoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    fonte: Mapped[str] = mapped_column(String, nullable=False)
    preco_por_kg: Mapped[float] = mapped_column(Numeric(10, 4), nullable=False)
    data_referencia: Mapped[date] = mapped_column(Date, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
