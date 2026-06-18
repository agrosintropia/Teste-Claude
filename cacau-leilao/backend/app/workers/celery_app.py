from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "loteforte",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    timezone="America/Sao_Paulo",
    enable_utc=True,
    beat_schedule={
        # Toda segunda-feira às 06:00 — forma os lotes da semana
        "formar-lotes-semanais": {
            "task": "app.workers.tasks.formar_lotes_task",
            "schedule": crontab(hour=6, minute=0, day_of_week="monday"),
        },
        # Toda sexta às 18:00 — encerra leilões abertos
        "encerrar-leiloes": {
            "task": "app.workers.tasks.encerrar_leiloes_task",
            "schedule": crontab(hour=18, minute=0, day_of_week="friday"),
        },
        # Diário às 08:00 — verifica NF-es com prazo expirado
        "verificar-nfe-expiradas": {
            "task": "app.workers.tasks.verificar_nfe_expiradas_task",
            "schedule": crontab(hour=8, minute=0),
        },
    },
)
