"""
Cria as tabelas no SQLite e insere usuários demo.
Executar: python init_db.py
(O app também faz isso automaticamente no startup — este script é só para uso manual.)
"""
import asyncio
from app.db.seed import init_database, DEMO_USERS


async def main():
    await init_database()
    for u in DEMO_USERS:
        print(f"  ✓ {u['email']}")
    print("\n✅ Banco inicializado com sucesso! (senha de todos: demo1234)")


if __name__ == "__main__":
    asyncio.run(main())
