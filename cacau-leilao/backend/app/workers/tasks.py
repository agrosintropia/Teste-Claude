"""
Tasks Celery — executadas de forma assíncrona ou agendada.
Cada task cria sua própria sessão de banco (sync via psycopg2).
"""
import asyncio
from app.workers.celery_app import celery_app
from app.db.session import AsyncSessionLocal
from app.services import lote_service


def _run(coro):
    """Executa coroutine dentro de um event loop novo (Celery é síncrono)."""
    return asyncio.get_event_loop().run_until_complete(coro)


@celery_app.task(name="app.workers.tasks.formar_lotes_task", bind=True, max_retries=3)
def formar_lotes_task(self):
    async def _inner():
        async with AsyncSessionLocal() as db:
            return await lote_service.formar_lotes(db)
    try:
        result = _run(_inner())
        print(f"[LOTES] {result['lotes_criados']} lote(s) criado(s), "
              f"{result['expectativas_alocadas']} expectativa(s) alocada(s)")
        return result
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60 * 5)


@celery_app.task(name="app.workers.tasks.encerrar_leiloes_task")
def encerrar_leiloes_task():
    # Implementado na Fase 5 (Motor de Leilão)
    print("[LEILÃO] Encerramento de leilões — Fase 5")
    return {"status": "pendente_fase5"}


@celery_app.task(name="app.workers.tasks.verificar_nfe_expiradas_task")
def verificar_nfe_expiradas_task():
    # Implementado na Fase 6 (Motor Fiscal)
    print("[NF-e] Verificação de prazos — Fase 6")
    return {"status": "pendente_fase6"}
