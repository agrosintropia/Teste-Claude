# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Projeto 1: Monitor de Editais Socioambientais (`/`)

### Commands

```bash
pip install -r requirements.txt
cp .env.example .env          # configure ANTHROPIC_API_KEY e opcionalmente EMAIL_*

python main.py                # executa o pipeline uma vez
python scheduler.py           # agendador diário (horário em config.json)
python scheduler.py --now     # executa agora e depois agenda
```

Sem suite de testes. Relatórios gerados em `reports/` como `.md` e `.html`.

### Architecture

Pipeline orquestrado por `main.py`:

```
DuckDuckGo (10 queries) → Claude Haiku (extração em lotes) → SQLite → MD + HTML → e-mail opcional
```

1. `editais_agent/agent.py` — busca DuckDuckGo + chama `claude-haiku-4-5-20251001` em lotes de 30 resultados para extrair editais como JSON. Usa SDK `anthropic` diretamente (não `claude_code_sdk`).
2. `editais_agent/classifier.py` — pontua cada edital via keyword matching contra pesos do `config.json`.
3. `editais_agent/storage.py` — SQLite em `editais.db`; `upsert_edital` deduplica por URL; `mark_expired_editais` inativa registros com prazo vencido.
4. `editais_agent/reporter.py` — gera Markdown e HTML a partir dos editais ativos.
5. `editais_agent/emailer.py` — envia relatório HTML + anexo Markdown via SMTP se `EMAIL_USER`/`EMAIL_PASSWORD` estiverem no `.env`.
6. `scheduler.py` — wraps `main.py` com a lib `schedule`; roda diariamente no horário de `config.json → schedule_time`.

**`agent.py` (raiz)** é uma demo standalone do `claude_code_sdk`; não faz parte do pipeline.

### Key design decisions

- Claude é usado **apenas para extração**, não para scoring; scoring é keyword matching determinístico.
- Lotes de 30 resultados por chamada ao Claude evitam problemas de contexto.
- `upsert_edital` retorna `True` para novos registros, `False` para atualizações.
- `areas_tematicas` e `publico_alvo` são armazenados como strings JSON no SQLite e desserializados na leitura.
- Toda configuração (queries, pesos, horário) fica em `config.json` — não tocar o código para ajustes de comportamento.

---

## Projeto 2: Plataforma de Leilão de Cacau (`cacau-leilao/`)

Novo projeto em construção. Stack planejada: **FastAPI + PostgreSQL + Redis + React/TypeScript**.

### Arquivos existentes

| Arquivo | Conteúdo |
|---|---|
| `cacau-leilao/schema.sql` | Schema PostgreSQL completo com todas as entidades |
| `cacau-leilao/docs/modelo-de-dados.md` | Documentação em português do modelo de dados |

### Domínios do sistema

```
users
 ├── produtores   → auditorias → scores → expectativas_producao → lote_produtores
 └── compradores  → lances → leiloes → lotes → entregas → rastreabilidade_lotes
```

**Entidades-chave e suas regras:**

- **`scores`**: calculado apenas após auditoria presencial aprovada. Um único score ativo por produtor (`UNIQUE INDEX WHERE ativo = TRUE`). Faixas A/B/C/D determinam bonificação e agrupamento de lote.
- **`lotes`**: formados automaticamente (job semanal) agrupando `expectativas_producao` por `regiao_id` + `faixa_score` + janela de entrega na mesma semana ISO. Código: `{UF}-{REGIAO}-{FAIXA}-{ANO}-W{SEMANA}`.
- **`leiloes`**: sempre 1:1 com lote. Lote só vai a leilão se atingir `volume_minimo_kg`. Atravessadores só podem lançar em lotes da sua `regioes_ids`; moageiras podem lançar em qualquer lote.
- **`rastreabilidade_lotes`**: snapshot JSONB gerado no fechamento da entrega — preserva dados históricos mesmo que o produtor altere cadastro posteriormente.
- **Score ponderado**: `(gestao_producao × 0.40) + (gestao_ambiental × 0.35) + (gestao_social × 0.25)`. Pesos configuráveis em `score_pesos`.
- **Critérios de auditoria** em `cscacau_criterios` mapeiam diretamente os itens do Currículo de Sustentabilidade do Cacau (ex: `1.1.1` = CAR, `1.8.1` = agrotóxicos, `3.1.1` = trabalhista).

### Fases de desenvolvimento planejadas

1. **Core**: cadastro, autenticação, scoring, auditoria
2. **Lotes**: formação automática, painel do produtor
3. **Leilão**: motor de lances, WebSocket em tempo real
4. **Entrega**: validação, rastreabilidade, exportação
5. **Financeiro**: taxas anuais, comissões por kg
