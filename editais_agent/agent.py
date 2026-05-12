import json
import os
import re
from pathlib import Path

import anthropic
from duckduckgo_search import DDGS


def _load_config() -> dict:
    path = Path(__file__).parent.parent / "config.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _search_web(queries: list[str], max_results: int) -> list[dict]:
    """Executa buscas no DuckDuckGo e retorna lista de resultados deduplicados."""
    seen_urls: set[str] = set()
    results = []

    with DDGS() as ddgs:
        for query in queries:
            try:
                hits = list(ddgs.text(query, region="br-pt", max_results=max_results))
                for hit in hits:
                    url = hit.get("href", "")
                    if url and url not in seen_urls:
                        seen_urls.add(url)
                        results.append({
                            "titulo": hit.get("title", ""),
                            "resumo": hit.get("body", ""),
                            "url": url,
                        })
            except Exception as e:
                print(f"  ⚠️  Erro na busca '{query}': {e}")

    return results


_EXTRACTION_PROMPT = """Você é um especialista em editais e chamadas públicas do setor socioambiental brasileiro.

Analise os resultados de busca abaixo e identifique SOMENTE editais ou chamadas públicas com prazo AINDA ABERTO,
relacionados a qualquer uma destas áreas:
- Reflorestamento / Restauração florestal / Recuperação de áreas degradadas
- Agrofloresta / Sistemas Agroflorestais (SAF)
- Agricultura regenerativa / Agroecologia
- ATER (Assistência Técnica e Extensão Rural) para agricultores familiares
- Projetos para povos e comunidades tradicionais (quilombolas, indígenas, etc.)

IGNORE páginas de notícias antigas, resultados encerrados ou páginas sem edital real.

Para cada edital identificado, extraia (use null se não encontrar a informação):
- titulo: nome completo do edital/chamada
- organizacao: instituição que lança o edital
- url: link direto para o edital
- prazo: data limite de inscrição no formato DD/MM/YYYY
- valor: valor total disponível em reais (ex: "R$ 500.000" ou "R$ 1.000.000")
- resumo: descrição clara em 2-3 frases
- areas_tematicas: lista de áreas temáticas abordadas
- publico_alvo: lista do público beneficiário

Retorne APENAS JSON válido, sem texto adicional, no formato:
{
  "editais": [
    {
      "titulo": "",
      "organizacao": "",
      "url": "",
      "prazo": "DD/MM/YYYY",
      "valor": null,
      "resumo": "",
      "areas_tematicas": [],
      "publico_alvo": []
    }
  ]
}

Resultados de busca para analisar:
{results}
"""


def _extract_editais_with_claude(search_results: list[dict]) -> list[dict]:
    """Usa Claude para extrair editais estruturados dos resultados de busca."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise EnvironmentError("ANTHROPIC_API_KEY não definida. Configure no arquivo .env")

    client = anthropic.Anthropic(api_key=api_key)

    # Divide em lotes de 30 para não exceder o contexto
    batch_size = 30
    all_editais = []

    for i in range(0, len(search_results), batch_size):
        batch = search_results[i:i + batch_size]
        results_text = "\n\n".join(
            f"[{j+1}] TÍTULO: {r['titulo']}\nURL: {r['url']}\nTRECHO: {r['resumo']}"
            for j, r in enumerate(batch)
        )

        prompt = _EXTRACTION_PROMPT.format(results=results_text)

        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )

        text = response.content[0].text.strip()

        # Extrai JSON mesmo se vier com texto extra
        match = re.search(r"\{[\s\S]+\}", text)
        if not match:
            continue

        try:
            data = json.loads(match.group())
            all_editais.extend(data.get("editais", []))
        except json.JSONDecodeError as e:
            print(f"  ⚠️  Erro ao parsear JSON do Claude: {e}")

    # Deduplica por URL
    seen: set[str] = set()
    unique = []
    for e in all_editais:
        url = e.get("url", "")
        if url and url not in seen:
            seen.add(url)
            unique.append(e)

    return unique


def run_search() -> list[dict]:
    """
    Executa o pipeline completo:
    1. Busca no DuckDuckGo
    2. Extrai editais com Claude
    3. Retorna lista de editais estruturados (sem score ainda)
    """
    config = _load_config()
    queries = config["search_queries"]
    max_results = config.get("max_results_per_query", 8)

    print(f"🔍 Executando {len(queries)} buscas...")
    raw_results = _search_web(queries, max_results)
    print(f"   Encontrados {len(raw_results)} resultados brutos.")

    print("🤖 Analisando com Claude...")
    editais = _extract_editais_with_claude(raw_results)
    print(f"   {len(editais)} editais identificados.")

    return editais
