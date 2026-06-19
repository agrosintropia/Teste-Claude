"""
Cria as tabelas e semeia usuários demo (idempotente).
Usado tanto pelo evento de startup do FastAPI quanto pelo script init_db.py.
"""
import uuid
from sqlalchemy import select
from app.db.session import engine, AsyncSessionLocal
from app.db.base import Base
from app.models.user import User
from app.core.security import hash_password

DEMO_PASSWORD = "demo1234"

DEMO_USERS = [
    {"email": "admin@loteforte.com",    "role": "admin",        "nome_completo": "Admin LoteForte"},
    {"email": "joao@produtor.com",      "role": "produtor",     "nome_completo": "João Produtor"},
    {"email": "maria@produtor.com",     "role": "produtor",     "nome_completo": "Maria Produtora"},
    {"email": "compras@chocobras.com",  "role": "moageira",     "nome_completo": "Compras ChocoBrás"},
    {"email": "pedro@atacado.com",      "role": "atravessador", "nome_completo": "Pedro Atacado"},
    {"email": "auditora@esalq.com",     "role": "auditor",      "nome_completo": "Auditora ESALQ"},
    {"email": "suporte@loteforte.com",  "role": "admin",        "nome_completo": "Suporte LoteForte"},
]


async def init_database() -> None:
    """Cria as tabelas (se não existirem) e insere os usuários demo que faltam."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    hashed = hash_password(DEMO_PASSWORD)
    async with AsyncSessionLocal() as session:
        for u in DEMO_USERS:
            existing = await session.scalar(select(User).where(User.email == u["email"]))
            if not existing:
                session.add(User(
                    id=uuid.uuid4(),
                    email=u["email"],
                    password_hash=hashed,
                    role=u["role"],
                    nome_completo=u["nome_completo"],
                    ativo=True,
                ))
        await session.commit()
