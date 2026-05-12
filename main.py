"""
Executa o pipeline completo de busca de editais uma vez.
Use este script para rodar manualmente ou via cron.
"""

import sys
from datetime import date, datetime
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

from editais_agent.agent import run_search
from editais_agent.classifier import score_edital
from editais_agent.storage import init_db, upsert_edital, get_active_editais, save_run, mark_expired_editais
from editais_agent.reporter import generate_markdown, generate_html


def run_pipeline():
    print("\n" + "=" * 60)
    print(f"🌱 Agrosintropia — Monitor de Editais")
    print(f"   {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print("=" * 60 + "\n")

    init_db()
    mark_expired_editais()

    # 1. Buscar e extrair editais
    editais = run_search()

    if not editais:
        print("⚠️  Nenhum edital encontrado nesta execução.")
        return

    # 2. Classificar e salvar
    print("\n📊 Classificando editais...")
    novos = 0
    for edital in editais:
        score, nivel = score_edital(edital)
        edital["score"] = score
        edital["nivel"] = nivel
        is_new = upsert_edital(edital)
        if is_new:
            novos += 1

    print(f"   {novos} novos editais adicionados ao banco.")

    # 3. Gerar relatórios
    today = date.today()
    report_dir = Path("reports")
    report_dir.mkdir(exist_ok=True)
    date_str = today.strftime("%Y-%m-%d")

    all_editais = get_active_editais()

    md_path = report_dir / f"editais_{date_str}.md"
    html_path = report_dir / f"editais_{date_str}.html"

    md_path.write_text(generate_markdown(all_editais, today, novos), encoding="utf-8")
    html_path.write_text(generate_html(all_editais, today, novos), encoding="utf-8")

    save_run(date_str, len(all_editais), novos, str(html_path))

    # 4. Resumo no terminal
    alta = [e for e in all_editais if e.get("nivel") == "alta"]
    media = [e for e in all_editais if e.get("nivel") == "media"]
    baixa = [e for e in all_editais if e.get("nivel") == "baixa"]

    print(f"\n{'=' * 60}")
    print(f"✅ Pipeline concluído!")
    print(f"   🔥 Alta Prioridade:  {len(alta)}")
    print(f"   🌿 Média Prioridade: {len(media)}")
    print(f"   📋 Baixa Prioridade: {len(baixa)}")
    print(f"   📄 Relatório MD:   {md_path}")
    print(f"   🌐 Relatório HTML: {html_path}")
    print("=" * 60 + "\n")

    if alta:
        print("🔥 DESTAQUES — Alta Prioridade:\n")
        for e in alta[:5]:
            print(f"  [{e['score']} pts] {e.get('titulo', 'Sem título')}")
            print(f"           {e.get('organizacao', '—')} | Prazo: {e.get('prazo', '—')}")
            print(f"           {e.get('url', '')}\n")


if __name__ == "__main__":
    try:
        run_pipeline()
    except EnvironmentError as e:
        print(f"\n❌ Erro de configuração: {e}")
        print("   Crie o arquivo .env com ANTHROPIC_API_KEY=sua-chave")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erro inesperado: {e}")
        raise
