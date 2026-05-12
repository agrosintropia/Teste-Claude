from datetime import date
from pathlib import Path
from .classifier import dias_restantes, nivel_info


def _prazo_badge(prazo: str | None, dias: int | None) -> str:
    if dias is None:
        return prazo or "A confirmar"
    if dias < 0:
        return f"{prazo} (**EXPIRADO**)"
    if dias <= 7:
        return f"{prazo} ⚠️ {dias}d restantes"
    if dias <= 15:
        return f"{prazo} 🔔 {dias}d restantes"
    return f"{prazo} ({dias}d restantes)"


def generate_markdown(editais: list[dict], run_date: date, novos: int) -> str:
    alta = [e for e in editais if e.get("nivel") == "alta"]
    media = [e for e in editais if e.get("nivel") == "media"]
    baixa = [e for e in editais if e.get("nivel") == "baixa"]

    lines = [
        f"# 🌱 Relatório de Editais Socioambientais — Agrosintropia",
        f"**Data:** {run_date.strftime('%d/%m/%Y')}  |  "
        f"**Total ativo:** {len(editais)}  |  **Novos hoje:** {novos}",
        "",
        "---",
        "",
        "## 📊 Quadro de Oportunidades",
        "",
        "| Nível | Organização | Título | Prazo | Valor | Score |",
        "|-------|------------|--------|-------|-------|-------|",
    ]

    for e in editais:
        dias = dias_restantes(e.get("prazo"))
        prazo_txt = f"{e.get('prazo', '—')} ({dias}d)" if dias is not None else e.get("prazo", "—")
        info = nivel_info(e.get("nivel", "baixa"))
        lines.append(
            f"| {info['stars']} {info['label']} "
            f"| {e.get('organizacao', '—')} "
            f"| [{e.get('titulo', 'Sem título')}]({e.get('url', '#')}) "
            f"| {prazo_txt} "
            f"| {e.get('valor', '—')} "
            f"| {e.get('score', 0)} |"
        )

    lines += ["", "---", ""]

    for grupo, label, emoji in [
        (alta, "Alta Prioridade", "🔥"),
        (media, "Média Prioridade", "🌿"),
        (baixa, "Baixa Prioridade", "📋"),
    ]:
        if not grupo:
            continue
        info = nivel_info(label.split()[0].lower() if label != "Média Prioridade" else "media")
        lines.append(f"## {emoji} {label} ({len(grupo)} editais)")
        lines.append("")

        for e in grupo:
            dias = dias_restantes(e.get("prazo"))
            lines += [
                f"### {e.get('titulo', 'Sem título')}",
                f"**Organização:** {e.get('organizacao', '—')}  ",
                f"**Prazo:** {_prazo_badge(e.get('prazo'), dias)}  ",
                f"**Valor:** {e.get('valor', 'Não informado')}  ",
                f"**Score Agrosintropia:** {e.get('score', 0)} pts  ",
                f"**Áreas:** {', '.join(e.get('areas_tematicas') or ['—'])}  ",
                f"**Público:** {', '.join(e.get('publico_alvo') or ['—'])}  ",
                "",
                e.get("resumo", ""),
                "",
                f"🔗 [Acessar edital]({e.get('url', '#')})",
                "",
                "---",
                "",
            ]

    return "\n".join(lines)


_HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Editais Socioambientais — Agrosintropia</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
<style>
  body {{ font-family: 'Segoe UI', sans-serif; background: #f5f7f0; }}
  .header {{ background: linear-gradient(135deg, #1b5e20, #388e3c); color: white; padding: 2rem; }}
  .card-alta {{ border-left: 5px solid #2e7d32; }}
  .card-media {{ border-left: 5px solid #f57c00; }}
  .card-baixa {{ border-left: 5px solid #455a64; }}
  .badge-alta {{ background-color: #2e7d32; }}
  .badge-media {{ background-color: #f57c00; }}
  .badge-baixa {{ background-color: #455a64; }}
  .score-circle {{ width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.85rem; }}
  .dias-urgente {{ color: #c62828; font-weight: bold; }}
  .dias-atencao {{ color: #e65100; font-weight: bold; }}
  .stat-card {{ background: white; border-radius: 12px; padding: 1.5rem; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,.1); }}
  tr:hover {{ background-color: #e8f5e9 !important; }}
</style>
</head>
<body>

<div class="header">
  <div class="container">
    <h1>🌱 Agrosintropia — Monitor de Editais</h1>
    <p class="mb-0">Relatório gerado em {data} &nbsp;|&nbsp; {total} editais ativos &nbsp;|&nbsp; {novos} novos hoje</p>
  </div>
</div>

<div class="container my-4">

  <!-- Stats -->
  <div class="row g-3 mb-4">
    <div class="col-md-4">
      <div class="stat-card">
        <div class="fs-1">🔥</div>
        <div class="fs-2 fw-bold text-success">{n_alta}</div>
        <div>Alta Prioridade</div>
      </div>
    </div>
    <div class="col-md-4">
      <div class="stat-card">
        <div class="fs-1">🌿</div>
        <div class="fs-2 fw-bold text-warning">{n_media}</div>
        <div>Média Prioridade</div>
      </div>
    </div>
    <div class="col-md-4">
      <div class="stat-card">
        <div class="fs-1">📋</div>
        <div class="fs-2 fw-bold text-secondary">{n_baixa}</div>
        <div>Baixa Prioridade</div>
      </div>
    </div>
  </div>

  <!-- Quadro geral -->
  <div class="card shadow-sm mb-5">
    <div class="card-header bg-dark text-white fw-bold">📊 Quadro Geral de Oportunidades</div>
    <div class="card-body p-0">
      <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead class="table-dark">
            <tr>
              <th>Nível</th><th>Score</th><th>Organização</th><th>Título</th>
              <th>Prazo</th><th>Dias Restantes</th><th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {linhas_tabela}
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Cards por nível -->
  {cards_secoes}

</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>"""


def _linha_tabela(e: dict) -> str:
    dias = dias_restantes(e.get("prazo"))
    nivel = e.get("nivel", "baixa")
    info = nivel_info(nivel)

    dias_txt = "—"
    dias_class = ""
    if dias is not None:
        if dias < 0:
            dias_txt = "Expirado"
            dias_class = "dias-urgente"
        elif dias <= 7:
            dias_txt = f"{dias}d ⚠️"
            dias_class = "dias-urgente"
        elif dias <= 15:
            dias_txt = f"{dias}d 🔔"
            dias_class = "dias-atencao"
        else:
            dias_txt = f"{dias}d"

    score = e.get("score", 0)
    bg = {"alta": "#c8e6c9", "media": "#ffe0b2", "baixa": "#eceff1"}.get(nivel, "#eceff1")

    return (
        f"<tr>"
        f"<td><span class='badge badge-{nivel}'>{info['stars']} {info['label']}</span></td>"
        f"<td><div class='score-circle' style='background:{bg}'>{score}</div></td>"
        f"<td>{e.get('organizacao', '—')}</td>"
        f"<td><a href='{e.get('url','#')}' target='_blank'>{e.get('titulo','Sem título')}</a></td>"
        f"<td>{e.get('prazo', '—')}</td>"
        f"<td class='{dias_class}'>{dias_txt}</td>"
        f"<td>{e.get('valor', '—')}</td>"
        f"</tr>"
    )


def _card_edital(e: dict) -> str:
    nivel = e.get("nivel", "baixa")
    dias = dias_restantes(e.get("prazo"))
    areas = ", ".join(e.get("areas_tematicas") or ["—"])
    publico = ", ".join(e.get("publico_alvo") or ["—"])

    dias_badge = ""
    if dias is not None:
        cor = "danger" if dias <= 7 else ("warning" if dias <= 15 else "success")
        dias_badge = f"<span class='badge bg-{cor}'>{dias}d restantes</span>"

    return f"""
    <div class="card card-{nivel} mb-3 shadow-sm">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start">
          <h5 class="card-title mb-1">
            <a href="{e.get('url','#')}" target="_blank">{e.get('titulo','Sem título')}</a>
          </h5>
          <span class="badge badge-{nivel} fs-6">{e.get('score',0)} pts</span>
        </div>
        <p class="text-muted small mb-2">{e.get('organizacao','—')} &nbsp;|&nbsp; Prazo: {e.get('prazo','—')} {dias_badge}</p>
        <p class="mb-2">{e.get('resumo','')}</p>
        <p class="mb-1 small"><strong>Áreas:</strong> {areas}</p>
        <p class="mb-0 small"><strong>Público:</strong> {publico} &nbsp;&nbsp; <strong>Valor:</strong> {e.get('valor','Não informado')}</p>
      </div>
    </div>"""


def generate_html(editais: list[dict], run_date: date, novos: int) -> str:
    alta = [e for e in editais if e.get("nivel") == "alta"]
    media = [e for e in editais if e.get("nivel") == "media"]
    baixa = [e for e in editais if e.get("nivel") == "baixa"]

    linhas = "\n".join(_linha_tabela(e) for e in editais)

    secoes = ""
    for grupo, label, emoji, cor in [
        (alta, "Alta Prioridade", "🔥", "success"),
        (media, "Média Prioridade", "🌿", "warning"),
        (baixa, "Baixa Prioridade", "📋", "secondary"),
    ]:
        if not grupo:
            continue
        cards = "\n".join(_card_edital(e) for e in grupo)
        secoes += f"""
        <h3 class="text-{cor} mt-4 mb-3">{emoji} {label} ({len(grupo)})</h3>
        {cards}"""

    return _HTML_TEMPLATE.format(
        data=run_date.strftime("%d/%m/%Y às %H:%M"),
        total=len(editais),
        novos=novos,
        n_alta=len(alta),
        n_media=len(media),
        n_baixa=len(baixa),
        linhas_tabela=linhas,
        cards_secoes=secoes,
    )
