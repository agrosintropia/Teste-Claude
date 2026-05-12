"""
Agendador diário: executa o pipeline todo dia no horário configurado em config.json.

Uso:
    python scheduler.py           # roda continuamente (ex: via systemd ou screen)
    python scheduler.py --now     # executa imediatamente e depois agenda
"""

import sys
import time
import json
import logging
from pathlib import Path
from datetime import datetime

import schedule
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%d/%m/%Y %H:%M:%S",
    handlers=[
        logging.FileHandler("scheduler.log", encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)


def _load_config() -> dict:
    with open(Path(__file__).parent / "config.json", encoding="utf-8") as f:
        return json.load(f)


def job():
    log.info("▶️  Iniciando pipeline de busca de editais...")
    try:
        from main import run_pipeline
        run_pipeline()
        log.info("✅ Pipeline concluído com sucesso.")
    except Exception as e:
        log.error(f"❌ Erro no pipeline: {e}", exc_info=True)


def main():
    config = _load_config()
    schedule_time = config.get("schedule_time", "08:00")

    run_now = "--now" in sys.argv

    log.info(f"🕐 Agendador iniciado — execução diária às {schedule_time}")

    if run_now:
        log.info("🚀 Executando agora (--now)")
        job()

    schedule.every().day.at(schedule_time).do(job)

    log.info(f"⏳ Aguardando próxima execução agendada às {schedule_time}...")
    while True:
        schedule.run_pending()
        time.sleep(60)


if __name__ == "__main__":
    main()
