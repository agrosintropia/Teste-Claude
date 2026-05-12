import sqlite3
import json
from datetime import date, datetime
from pathlib import Path


DB_PATH = Path(__file__).parent.parent / "editais.db"


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS editais (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT UNIQUE NOT NULL,
                titulo TEXT,
                organizacao TEXT,
                prazo TEXT,
                valor TEXT,
                resumo TEXT,
                areas_tematicas TEXT,
                publico_alvo TEXT,
                score INTEGER DEFAULT 0,
                nivel TEXT DEFAULT 'baixa',
                primeira_vez_visto TEXT,
                ultima_atualizacao TEXT,
                ativo INTEGER DEFAULT 1
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data TEXT,
                total_encontrados INTEGER,
                total_novos INTEGER,
                report_path TEXT
            )
        """)


def upsert_edital(edital: dict) -> bool:
    """Insere ou atualiza um edital. Retorna True se for novo."""
    now = datetime.now().isoformat()
    today = date.today().isoformat()

    with get_conn() as conn:
        existing = conn.execute(
            "SELECT id FROM editais WHERE url = ?", (edital["url"],)
        ).fetchone()

        areas = json.dumps(edital.get("areas_tematicas", []), ensure_ascii=False)
        publico = json.dumps(edital.get("publico_alvo", []), ensure_ascii=False)

        if existing:
            conn.execute("""
                UPDATE editais SET
                    titulo=?, organizacao=?, prazo=?, valor=?, resumo=?,
                    areas_tematicas=?, publico_alvo=?, score=?, nivel=?,
                    ultima_atualizacao=?, ativo=1
                WHERE url=?
            """, (
                edital.get("titulo"), edital.get("organizacao"),
                edital.get("prazo"), edital.get("valor"), edital.get("resumo"),
                areas, publico, edital.get("score", 0), edital.get("nivel", "baixa"),
                now, edital["url"],
            ))
            return False
        else:
            conn.execute("""
                INSERT INTO editais
                    (url, titulo, organizacao, prazo, valor, resumo,
                     areas_tematicas, publico_alvo, score, nivel,
                     primeira_vez_visto, ultima_atualizacao)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                edital["url"], edital.get("titulo"), edital.get("organizacao"),
                edital.get("prazo"), edital.get("valor"), edital.get("resumo"),
                areas, publico, edital.get("score", 0), edital.get("nivel", "baixa"),
                today, now,
            ))
            return True


def get_active_editais() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT * FROM editais WHERE ativo=1 ORDER BY score DESC, prazo ASC
        """).fetchall()

    result = []
    for row in rows:
        d = dict(row)
        d["areas_tematicas"] = json.loads(d["areas_tematicas"] or "[]")
        d["publico_alvo"] = json.loads(d["publico_alvo"] or "[]")
        result.append(d)
    return result


def save_run(data: str, total: int, novos: int, report_path: str):
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO runs (data, total_encontrados, total_novos, report_path) VALUES (?,?,?,?)",
            (data, total, novos, report_path),
        )


def mark_expired_editais():
    """Marca como inativos editais com prazo passado."""
    today = date.today().strftime("%d/%m/%Y")
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, prazo FROM editais WHERE ativo=1 AND prazo IS NOT NULL"
        ).fetchall()
        for row in rows:
            try:
                prazo = datetime.strptime(row["prazo"], "%d/%m/%Y").date()
                if prazo < date.today():
                    conn.execute("UPDATE editais SET ativo=0 WHERE id=?", (row["id"],))
            except (ValueError, TypeError):
                pass
