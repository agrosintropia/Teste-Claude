import uuid
from sqlalchemy import String, Boolean, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Uuid
from datetime import datetime, timezone
from app.db.base import Base

UserRole = SAEnum(
    "produtor", "atravessador", "moageira", "auditor", "admin",
    name="user_role",
)


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(native_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(UserRole, nullable=False)
    nome_completo: Mapped[str] = mapped_column(String, nullable=False)
    telefone: Mapped[str | None] = mapped_column(String)
    ativo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
    atualizado_em: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
