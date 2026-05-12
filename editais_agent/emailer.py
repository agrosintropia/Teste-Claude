import os
import smtplib
from datetime import date
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from pathlib import Path


def _build_subject(editais: list[dict], run_date: date) -> str:
    alta = sum(1 for e in editais if e.get("nivel") == "alta")
    total = len(editais)
    data = run_date.strftime("%d/%m/%Y")
    if alta:
        return f"🌱 Editais Agrosintropia {data} — {alta} alta prioridade | {total} ativos"
    return f"🌱 Editais Agrosintropia {data} — {total} ativos"


def _build_text_summary(editais: list[dict]) -> str:
    alta = [e for e in editais if e.get("nivel") == "alta"]
    media = [e for e in editais if e.get("nivel") == "media"]
    baixa = [e for e in editais if e.get("nivel") == "baixa"]

    lines = [
        "Relatório diário de editais socioambientais — Agrosintropia",
        "",
        f"🔥 Alta Prioridade:  {len(alta)}",
        f"🌿 Média Prioridade: {len(media)}",
        f"📋 Baixa Prioridade: {len(baixa)}",
        f"Total ativo: {len(editais)}",
        "",
    ]

    if alta:
        lines.append("DESTAQUES — Alta Prioridade:")
        lines.append("")
        for e in alta:
            lines += [
                f"  [{e.get('score', 0)} pts] {e.get('titulo', 'Sem título')}",
                f"  {e.get('organizacao', '—')} | Prazo: {e.get('prazo', '—')}",
                f"  {e.get('url', '')}",
                "",
            ]

    lines.append("O relatório completo está em anexo (HTML).")
    return "\n".join(lines)


def send_report(
    editais: list[dict],
    html_path: Path,
    md_path: Path,
    run_date: date,
    novos: int,
):
    """Envia o relatório por e-mail. Lê configurações de variáveis de ambiente."""

    smtp_host = os.environ.get("EMAIL_SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.environ.get("EMAIL_SMTP_PORT", "587"))
    smtp_user = os.environ.get("EMAIL_USER")
    smtp_password = os.environ.get("EMAIL_PASSWORD")
    email_from = os.environ.get("EMAIL_FROM", smtp_user)
    email_to_raw = os.environ.get("EMAIL_TO", "")

    if not smtp_user or not smtp_password:
        raise EnvironmentError(
            "EMAIL_USER e EMAIL_PASSWORD precisam estar definidos no .env"
        )
    if not email_to_raw:
        raise EnvironmentError("EMAIL_TO precisa estar definido no .env")

    recipients = [addr.strip() for addr in email_to_raw.split(",") if addr.strip()]

    msg = MIMEMultipart("alternative")
    msg["Subject"] = _build_subject(editais, run_date)
    msg["From"] = email_from
    msg["To"] = ", ".join(recipients)

    # Parte texto simples (fallback)
    msg.attach(MIMEText(_build_text_summary(editais), "plain", "utf-8"))

    # Parte HTML embutida no corpo
    html_content = html_path.read_text(encoding="utf-8")
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    # Anexo Markdown
    md_content = md_path.read_text(encoding="utf-8")
    attachment = MIMEBase("text", "markdown")
    attachment.set_payload(md_content.encode("utf-8"))
    encoders.encode_base64(attachment)
    attachment.add_header(
        "Content-Disposition",
        "attachment",
        filename=md_path.name,
    )
    msg.attach(attachment)

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.ehlo()
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.sendmail(email_from, recipients, msg.as_string())

    print(f"   📧 E-mail enviado para: {', '.join(recipients)}")
