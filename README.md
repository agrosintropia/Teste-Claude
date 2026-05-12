# 🌱 Agrosintropia — Monitor de Editais Socioambientais

Agente que busca diariamente editais abertos nas áreas de **reflorestamento, agrofloresta,
agricultura regenerativa e ATER** para agricultores familiares e povos tradicionais,
gerando relatórios classificados por nível de oportunidade para a Agrosintropia.

## Como funciona

```
DuckDuckGo (10 buscas) → Claude Haiku (extração) → SQLite (persistência)
    → Classificação por score → Relatório MD + HTML
```

1. O agente roda 10 buscas direcionadas no DuckDuckGo
2. Claude analisa os resultados e extrai editais estruturados
3. Cada edital recebe uma **pontuação** baseada em relevância, público-alvo e prazo
4. Um relatório Markdown e um painel HTML são gerados em `reports/`

## Instalação

```bash
pip install -r requirements.txt
```

## Configuração

```bash
cp .env.example .env
# edite .env e adicione sua chave:
# ANTHROPIC_API_KEY=sk-ant-...
```

## Uso

### Executar uma vez agora
```bash
python main.py
```

### Agendador diário (roda todo dia às 08:00)
```bash
python scheduler.py           # aguarda o horário configurado
python scheduler.py --now     # executa agora e depois agenda
```

### Alterar horário de execução
Edite `config.json`:
```json
"schedule_time": "08:00"
```

## Envio por e-mail

O relatório HTML é enviado automaticamente se as variáveis `EMAIL_USER` e `EMAIL_PASSWORD` estiverem no `.env`.

### Gmail (recomendado)
1. Ative a verificação em dois passos na conta Google
2. Gere uma **Senha de App**: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Use essa senha no campo `EMAIL_PASSWORD` (não a senha normal da conta)

```env
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_USER=seu@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx   # senha de app gerada
EMAIL_FROM=Agrosintropia Monitor <seu@gmail.com>
EMAIL_TO=pessoa1@email.com,pessoa2@email.com
```

### Outros provedores
| Provedor | SMTP Host | Porta |
|----------|-----------|-------|
| Gmail | smtp.gmail.com | 587 |
| Outlook/Hotmail | smtp.office365.com | 587 |
| Yahoo | smtp.mail.yahoo.com | 587 |
| SMTP próprio | seu.servidor.com | 587 |

O e-mail inclui:
- **Corpo HTML** com o painel completo de editais
- **Anexo Markdown** com o relatório em texto
- **Assunto** com resumo: `🌱 Editais Agrosintropia 12/05/2025 — 3 alta prioridade | 12 ativos`

## Relatórios

Os relatórios são salvos em `reports/` com o nome `editais_YYYY-MM-DD.md` e `.html`.

O painel HTML exibe:
- Cards de resumo (Alta / Média / Baixa prioridade)
- **Quadro geral** com prazo, dias restantes e score
- Detalhes completos por nível de prioridade

## Sistema de pontuação

| Critério | Pontos |
|----------|--------|
| Área principal (agrofloresta, ATER, etc.) | até 15 pts |
| Público-alvo (agricultores familiares, povos trad.) | até 15 pts |
| Fonte prioritária (FNMA, MMA, BNDES…) | até 10 pts |
| Prazo > 30 dias | +10 pts |
| Prazo < 15 dias | -5 pts |

| Score | Nível |
|-------|-------|
| ≥ 50 | 🔥 Alta Prioridade |
| 25–49 | 🌿 Média Prioridade |
| < 25 | 📋 Baixa Prioridade |

## Estrutura do projeto

```
.
├── editais_agent/
│   ├── agent.py        # Busca e extração com Claude
│   ├── classifier.py   # Scoring e classificação
│   ├── reporter.py     # Geração de MD e HTML
│   └── storage.py      # Banco SQLite
├── reports/            # Relatórios gerados
├── main.py             # Execução única
├── scheduler.py        # Agendador diário
├── config.json         # Queries, pesos e configurações
└── requirements.txt
```
