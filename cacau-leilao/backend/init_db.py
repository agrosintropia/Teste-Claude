"""
Cria as tabelas no SQLite e insere usuários demo.
Executar: python init_db.py
"""
import asyncio
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from passlib.context import CryptContext
from app.db.base import Base
from app.models.user import User

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return _pwd.hash(password)

DATABASE_URL = "sqlite+aiosqlite:///./loteforte.db"

DEMO_USERS = [
    {"email": "admin@loteforte.com",    "role": "admin",        "nome_completo": "Admin LoteForte"},
    {"email": "joao@produtor.com",      "role": "produtor",     "nome_completo": "João Produtor"},
    {"email": "maria@produtor.com",     "role": "produtor",     "nome_completo": "Maria Produtora"},
    {"email": "compras@chocobras.com",  "role": "moageira",     "nome_completo": "Compras ChocoBrás"},
    {"email": "pedro@atacado.com",      "role": "atravessador", "nome_completo": "Pedro Atacado"},
    {"email": "auditora@esalq.com",     "role": "auditor",      "nome_completo": "Auditora ESALQ"},
    {"email": "suporte@loteforte.com",  "role": "admin",        "nome_completo": "Suporte LoteForte"},
]


async def main():
    engine = create_async_engine(DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    Session = async_sessionmaker(engine, expire_on_commit=False)
    hashed = hash_password("demo1234")

    async with Session() as session:
        from sqlalchemy import select
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
                print(f"  ✓ {u['email']}")
            else:
                print(f"  · {u['email']} já existe")
        await session.commit()

    await engine.dispose()
    print("\n✅ Banco inicializado com sucesso!")


if __name__ == "__main__":
    asyncio.run(main())
