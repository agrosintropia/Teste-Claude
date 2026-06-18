"""
Testes de integração — requerem PostgreSQL real.

Uso:
  # Com banco rodando (via Docker ou local):
  DATABASE_URL_TEST=postgresql+asyncpg://loteforte:loteforte@localhost:5432/loteforte_test \
  pytest tests/integration/ -v

  # Ou via script:
  ./scripts/test_integration.sh
"""
import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text

from app.main import app
from app.db.session import get_db
from app.db.base import Base

# URL do banco de teste — usa variável de ambiente ou fallback local
TEST_DB_URL = os.getenv(
    "DATABASE_URL_TEST",
    "postgresql+asyncpg://loteforte:loteforte@localhost:5432/loteforte_test",
)

_engine = None
_Session = None


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture(scope="session")
async def db_engine():
    global _engine
    _engine = create_async_engine(TEST_DB_URL, echo=False)
    # Cria todas as tabelas
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield _engine
    # Derruba tudo ao final da sessão
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await _engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine):
    """Sessão isolada por teste — rollback ao final."""
    async with db_engine.connect() as conn:
        await conn.begin()
        session = AsyncSession(bind=conn, expire_on_commit=False)
        yield session
        await session.rollback()
        await session.close()


@pytest_asyncio.fixture(scope="function")
async def client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c
    app.dependency_overrides.clear()


# ── Helpers ──────────────────────────────────────────────────

async def criar_usuario_ativo(client: AsyncClient, email: str, role: str = "produtor") -> dict:
    """Registra, ativa e retorna token do usuário."""
    await client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Senha@123",
        "nome_completo": "Usuário Teste",
        "role": role,
    })
    # Ativa direto no banco (sem passar pelo endpoint de admin)
    from sqlalchemy import update
    from app.models.user import User
    # Acessa a sessão injetada
    db: AsyncSession = next(iter(app.dependency_overrides.values()))()
    await db.execute(update(User).where(User.email == email).values(ativo=True))
    await db.commit()

    r = await client.post("/api/v1/auth/login", json={"email": email, "password": "Senha@123"})
    return r.json()


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
