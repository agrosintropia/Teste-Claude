import json
from datetime import datetime, date
from pathlib import Path


def _load_config() -> dict:
    path = Path(__file__).parent.parent / "config.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def score_edital(edital: dict) -> tuple[int, str]:
    """Calcula pontuação e retorna (score, nivel)."""
    config = _load_config()
    scoring = config["scoring"]
    score = 0

    text = " ".join([
        (edital.get("titulo") or ""),
        (edital.get("resumo") or ""),
        " ".join(edital.get("areas_tematicas") or []),
        " ".join(edital.get("publico_alvo") or []),
        (edital.get("organizacao") or ""),
        (edital.get("url") or ""),
    ]).lower()

    for keyword, pts in scoring["areas_principais"].items():
        if keyword.lower() in text:
            score += pts
            break  # evita dupla contagem na mesma categoria

    for keyword, pts in scoring["areas_principais"].items():
        if keyword.lower() in text:
            score += pts

    for keyword, pts in scoring["publico_alvo"].items():
        if keyword.lower() in text:
            score += pts

    url = (edital.get("url") or "").lower()
    for fonte, pts in scoring["fontes_prioritarias"].items():
        if fonte in url:
            score += pts
            break

    prazo_str = edital.get("prazo")
    if prazo_str:
        try:
            prazo = datetime.strptime(prazo_str, "%d/%m/%Y").date()
            dias = (prazo - date.today()).days
            if dias < 0:
                score += scoring["prazo_bonus"]["expirado"]
            elif dias <= 15:
                score += scoring["prazo_bonus"]["menos_15_dias"]
            elif dias <= 30:
                score += scoring["prazo_bonus"]["entre_15_30_dias"]
            else:
                score += scoring["prazo_bonus"]["mais_30_dias"]
        except (ValueError, TypeError):
            pass

    score = max(0, score)

    niveis = config["niveis"]
    if score >= niveis["alta"]["min"]:
        nivel = "alta"
    elif score >= niveis["media"]["min"]:
        nivel = "media"
    else:
        nivel = "baixa"

    return score, nivel


def dias_restantes(prazo_str: str | None) -> int | None:
    if not prazo_str:
        return None
    try:
        prazo = datetime.strptime(prazo_str, "%d/%m/%Y").date()
        return (prazo - date.today()).days
    except (ValueError, TypeError):
        return None


def nivel_info(nivel: str) -> dict:
    config = _load_config()
    return config["niveis"].get(nivel, config["niveis"]["baixa"])
