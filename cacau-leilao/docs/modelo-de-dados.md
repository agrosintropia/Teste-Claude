# Modelo de Dados — Plataforma de Leilão de Cacau

## Visão Geral das Entidades

```
users
 ├── produtores          (role = 'produtor')
 │    ├── auditorias      ←→ auditoria_checklist (critérios CSCacau)
 │    ├── scores          (calculado após auditoria aprovada)
 │    └── expectativas_producao
 │         └── lote_produtores ──→ lotes
 │
 └── compradores         (role = 'atravessador' | 'moageira')
      └── lances ──→ leiloes ──→ lotes ──→ entregas
                                       └── rastreabilidade_lotes

Auxiliares:
  regioes, cscacau_criterios, cotacoes, bonificacoes, tarifas,
  pagamentos, notificacoes, historico_status, score_pesos
```

---

## Entidades Principais

### `users`
Tabela base para todos os tipos de usuário. O campo `ativo` começa como `FALSE` — o acesso à plataforma só é liberado após:
- **Produtor**: auditoria inicial aprovada
- **Comprador**: aprovação manual pelo admin

### `produtores`
Estende `users` para dados do imóvel rural. Campos-chave:
- `regiao_id` — determina em qual lote o produtor será agrupado
- `car_numero` — obrigatório pelo Código Florestal; vinculado ao CSCacau item 1.1.1
- `audit_status` — controla o ciclo de vida do produtor na plataforma:
  `pendente → agendada → aprovada` (ativo) ou `reprovada / suspensa`
- `data_proxima_auditoria` — renovação anual obrigatória

### `compradores`
Atravessadores e moageiras diferem em:
- **Atravessador**: `regioes_ids` limita quais lotes pode comprar (sub-região)
- **Moageira**: pode comprar qualquer lote ou lotes de atravessadores (sem restrição de região)

---

## Sistema de Score (CSCacau)

### `cscacau_criterios`
Tabela de referência com todos os itens auditáveis do Currículo de Sustentabilidade do Cacau. Organizada em três áreas:

| Área | Exemplos de itens |
|------|-------------------|
| `gestao_producao` | 1.1.1 (CAR), 1.2.1 (mudas), 1.6.1 (análise solo), 1.8.1-3 (agrotóxicos) |
| `gestao_ambiental` | 2.1.1-5 (planejamento ambiental), 2.2.1-3 (armazenagem), 2.4.1 (embalagens) |
| `gestao_social` | 3.1.1-2 (trabalhista), 3.3.1 (acidentes), 3.4.1 (saúde), 3.5.1-2 (moradia/água) |

### `auditorias` + `auditoria_checklist`
O auditor preenche uma resposta (`sim/nao/parcial/na`) para cada `cscacau_criterio`. Os pontos obtidos são somados por área.

### `scores`
Calculado após auditoria aprovada. Fórmula:
```
score_total = (score_producao × 0.40) + (score_ambiental × 0.35) + (score_social × 0.25)
```
Pesos configuráveis em `score_pesos`.

**Faixas de score:**
| Faixa | Pontuação | Bonificação típica |
|-------|-----------|-------------------|
| A     | 75–100    | +15% sobre o preço base |
| B     | 50–74     | +8% |
| C     | 25–49     | +3% |
| D     | 0–24      | sem acesso ao leilão |

> Score válido por 1 ano. Se o produtor não for reavaliado, `ativo` passa para `FALSE` e ele sai dos lotes.

---

## Formação de Lotes

### `expectativas_producao`
O produtor declara:
- Volume esperado em kg
- Janela de entrega (data início → data fim)

O sistema agrupa automaticamente todas as expectativas com:
1. Mesma `regiao_id`
2. Mesma `faixa_score` (do score ativo do produtor)
3. Janela de entrega na mesma semana ISO

### `lotes`
Criados automaticamente (job semanal). Código de identificação:
```
{UF}-{REGIAO}-{FAIXA}-{ANO}-W{SEMANA}
Exemplo: BA-SUL-A-2025-W23
```

Ciclo de vida do lote:
```
formando → aberto → em_leilao → vendido → entregue → validado
```

Um lote só vai a leilão se atingir `volume_minimo_kg` (configurável, padrão 500 kg).

### `lote_produtores`
Tabela de junção que registra quais produtores e expectativas compõem cada lote. É a base da rastreabilidade.

---

## Motor de Leilão

### `leiloes`
Um leilão por lote. Janela padrão: segunda-feira 08h → sexta-feira 18h (configurável).

- `preco_minimo_kg` = preço base da cotação + bonificação da faixa
- Compradores fazem lances acima do mínimo
- Ao encerrar, o lance mais alto vence

### `lances`
Cada lance registra comprador, valor/kg e timestamp. Estados:
- `ativo` — lance mais alto no momento
- `superado` — foi ultrapassado
- `vencedor` / `perdedor` — após encerramento

**Regra de negócio importante:** Atravessadores só podem lançar em lotes da(s) sua(s) região(ões). Moageiras podem lançar em qualquer lote.

---

## Entrega e Validação

### `entregas`
Após o leilão ser encerrado, o comprador recebe as amêndoas e registra:
- `volume_recebido_kg` — peso real na balança
- `umidade_pct` e `fermentacao_pct` — indicadores de qualidade
- `status`: `pendente → recebida → validada` (ou `contestada`)

A diferença entre `volume_declarado_kg` e `volume_recebido_kg` impacta o score do produtor na próxima auditoria.

### `rastreabilidade_lotes`
Snapshot completo em JSONB gerado no fechamento da entrega. Contém:
```json
{
  "lote_codigo": "BA-SUL-A-2025-W23",
  "regiao": "Sul da Bahia",
  "faixa_score": "A",
  "produtores": [
    {
      "nome": "...",
      "municipio": "...",
      "car_numero": "...",
      "score_total": 82,
      "volume_kg": 320,
      "propriedade_ha": 12.5
    }
  ],
  "volume_total_kg": 1240,
  "preco_final_kg": 12.80,
  "data_entrega": "2025-06-15"
}
```

---

## Financeiro

### `tarifas`
Dois tipos de cobrança:
1. `taxa_anual_produtor` — valor fixo em R$, cobrado 1x/ano
2. `comissao_comprador_pct` — percentual sobre o kg comprado (a definir após pesquisa com leilões de gado/Holambra)

### `pagamentos`
- `deducao_primeira_venda` — a taxa anual do produtor pode ser deduzida do primeiro pagamento na plataforma
- `comissao_comprador` — gerada automaticamente após validação da entrega

---

## Decisões de Design

| Decisão | Motivo |
|---------|--------|
| Score calculado somente após auditoria aprovada | Garante que o score reflete inspeção presencial real, não autodeclaração |
| Lotes formados por semana ISO | Ciclo claro e previsível para produtores e compradores |
| `score_band` em vez de score numérico nos lotes | Simplifica o agrupamento e evita fragmentação excessiva de lotes |
| Snapshot JSONB para rastreabilidade | Preserva os dados exatos no momento da venda, mesmo que o produtor altere cadastro depois |
| `regioes_ids` array no comprador | Permite que um atravessador atue em mais de uma sub-região sem duplicar registros |
| Separação `lotes` / `leiloes` | Lote pode existir sem leilão (volume insuficiente); leilão é sempre 1:1 com lote |

---

## Próximos Passos (Fase 2)

Com o modelo de dados definido, os próximos passos são:

1. **Seed de dados de referência**: popular `regioes`, `cscacau_criterios`, `bonificacoes` e `tarifas` com os valores iniciais
2. **Backend (FastAPI)**: endpoints de cadastro, auditoria e lotes
3. **Job de formação de lotes**: cron semanal que agrupa expectativas → cria lotes → cria leilões
4. **WebSocket de leilão**: canal por `leilao_id` para transmitir lances em tempo real
5. **Frontend**: painéis por papel (produtor, comprador, auditor, admin)
