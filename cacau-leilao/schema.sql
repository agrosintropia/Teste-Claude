-- =============================================================
-- Plataforma de Leilão de Cacau — Schema PostgreSQL
-- Baseado no Currículo de Sustentabilidade do Cacau (CSCacau)
-- =============================================================

-- ------------------------------------
-- EXTENSÕES
-- ------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis; -- para dados geoespaciais (opcional)


-- ------------------------------------
-- TIPOS ENUMERADOS
-- ------------------------------------

CREATE TYPE user_role AS ENUM ('produtor', 'atravessador', 'moageira', 'auditor', 'admin');

CREATE TYPE audit_status AS ENUM ('pendente', 'agendada', 'realizada', 'aprovada', 'reprovada', 'suspensa');

CREATE TYPE audit_type AS ENUM ('inicial', 'anual', 'extraordinaria');

CREATE TYPE checklist_answer AS ENUM ('sim', 'nao', 'parcial', 'na');

CREATE TYPE score_band AS ENUM ('A', 'B', 'C', 'D');
-- A: 75-100 pts  → maior bonificação
-- B: 50-74 pts
-- C: 25-49 pts
-- D: 0-24 pts    → sem acesso ao leilão

CREATE TYPE lot_status AS ENUM (
    'formando',     -- acumulando produtores
    'aberto',       -- lote fechado, aguardando leilão
    'em_leilao',    -- leilão em andamento
    'vendido',      -- leilão encerrado, aguardando entrega
    'entregue',     -- entrega realizada
    'validado',     -- entrega validada pelo comprador
    'cancelado'
);

CREATE TYPE auction_status AS ENUM ('agendado', 'aberto', 'encerrado', 'cancelado');

CREATE TYPE delivery_status AS ENUM ('pendente', 'recebida', 'validada', 'contestada');

CREATE TYPE payment_type AS ENUM ('taxa_anual_produtor', 'deducao_primeira_venda', 'comissao_comprador');

CREATE TYPE payment_status AS ENUM ('pendente', 'pago', 'cancelado');

CREATE TYPE forecast_status AS ENUM ('rascunho', 'publicado', 'alocado', 'entregue', 'validado');

CREATE TYPE cscacau_area AS ENUM ('gestao_producao', 'gestao_ambiental', 'gestao_social');

CREATE TYPE nfe_status AS ENUM ('pendente', 'upload_produtor', 'upload_comprador', 'validada', 'expirada');

CREATE TYPE compliance_status AS ENUM ('ok', 'bloqueado', 'em_defesa', 'multado', 'banido');

CREATE TYPE defense_status AS ENUM ('aberto', 'em_analise', 'absolvido', 'multado', 'banido');


-- ------------------------------------
-- USUÁRIOS (tabela base)
-- ------------------------------------

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    role            user_role NOT NULL,
    nome_completo   TEXT NOT NULL,
    telefone        TEXT,
    ativo           BOOLEAN NOT NULL DEFAULT FALSE, -- FALSE até auditoria (produtor) ou aprovação (comprador)
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ------------------------------------
-- REGIÕES GEOGRÁFICAS
-- ------------------------------------

CREATE TABLE regioes (
    id          SERIAL PRIMARY KEY,
    nome        TEXT NOT NULL,          -- ex: "Sul da Bahia", "Transamazônica"
    estado      CHAR(2) NOT NULL,       -- UF
    municipios  TEXT[] NOT NULL DEFAULT '{}',
    descricao   TEXT,
    ativo       BOOLEAN NOT NULL DEFAULT TRUE
);


-- ------------------------------------
-- PONTOS DE ENTREGA
-- (cadastrados pelos compradores; definem o raio de agrupamento de lotes)
-- ------------------------------------

CREATE TABLE pontos_entrega (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comprador_id    UUID NOT NULL REFERENCES compradores(id),
    nome            TEXT NOT NULL,              -- ex: "Armazém Ilhéus - Galpão Norte"
    endereco        TEXT NOT NULL,
    municipio       TEXT NOT NULL,
    estado          CHAR(2) NOT NULL,
    latitude        NUMERIC(10,6) NOT NULL,
    longitude       NUMERIC(10,6) NOT NULL,
    raio_km         INTEGER NOT NULL DEFAULT 50, -- raio de captação de produtores
    regiao_id       INTEGER REFERENCES regioes(id),
    capacidade_kg   NUMERIC(12,2),              -- capacidade máxima de recebimento
    contato_nome    TEXT,
    contato_tel     TEXT,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    aprovado        BOOLEAN NOT NULL DEFAULT FALSE, -- aprovado pelo admin antes de captar lotes
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pontos_entrega_comprador ON pontos_entrega(comprador_id, ativo);
CREATE INDEX idx_pontos_entrega_coords    ON pontos_entrega(latitude, longitude);


-- ------------------------------------
-- PRODUTORES
-- ------------------------------------

CREATE TABLE produtores (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    cpf                 TEXT UNIQUE NOT NULL,
    -- Propriedade
    propriedade_nome    TEXT NOT NULL,
    propriedade_hectares NUMERIC(10,2),
    municipio           TEXT NOT NULL,
    estado              CHAR(2) NOT NULL,
    regiao_id           INTEGER REFERENCES regioes(id),
    latitude            NUMERIC(10,6),
    longitude           NUMERIC(10,6),
    -- CAR
    car_numero          TEXT,
    car_status          TEXT,           -- 'ativo', 'pendente', 'cancelado'
    -- Status na plataforma
    audit_status        audit_status NOT NULL DEFAULT 'pendente',
    data_ultima_auditoria DATE,
    data_proxima_auditoria DATE,
    -- Agricultura familiar
    dap_caf             TEXT,           -- número DAP/CAF para agricultura familiar
    -- Compliance (Tribunal de Entregas)
    compliance_status   compliance_status NOT NULL DEFAULT 'ok',
    bloqueado_em        TIMESTAMPTZ,
    bloqueio_motivo     TEXT,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ------------------------------------
-- COMPRADORES (atravessadores e moageiras)
-- ------------------------------------

CREATE TABLE compradores (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    cnpj                TEXT UNIQUE NOT NULL,
    tipo                TEXT NOT NULL CHECK (tipo IN ('atravessador', 'moageira')),
    razao_social        TEXT NOT NULL,
    municipio           TEXT NOT NULL,
    estado              CHAR(2) NOT NULL,
    -- Regiões onde o comprador pode atuar
    regioes_ids         INTEGER[] NOT NULL DEFAULT '{}',
    -- Atravessadores só compram lotes de produtores da sua sub-região
    -- Moageiras podem comprar qualquer lote ou lotes de atravessadores
    aprovado            BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ------------------------------------
-- ITENS DO CHECKLIST CSCacau
-- (referência estática dos critérios de auditoria)
-- ------------------------------------

CREATE TABLE cscacau_criterios (
    id              SERIAL PRIMARY KEY,
    codigo          TEXT NOT NULL UNIQUE,  -- ex: '1.1.1', '2.3.1'
    area            cscacau_area NOT NULL,
    titulo          TEXT NOT NULL,
    descricao       TEXT,
    pontos_max      INTEGER NOT NULL DEFAULT 10,
    obrigatorio     BOOLEAN NOT NULL DEFAULT FALSE,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE
);


-- ------------------------------------
-- AUDITORIAS
-- ------------------------------------

CREATE TABLE auditorias (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    produtor_id     UUID NOT NULL REFERENCES produtores(id),
    auditor_id      UUID NOT NULL REFERENCES users(id),
    tipo            audit_type NOT NULL,
    data_agendada   DATE NOT NULL,
    data_realizada  DATE,
    status          audit_status NOT NULL DEFAULT 'agendada',
    resultado       TEXT,           -- 'aprovado', 'reprovado', 'aprovado_com_ressalvas'
    observacoes     TEXT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ------------------------------------
-- CHECKLIST DE AUDITORIA
-- (respostas por item CSCacau)
-- ------------------------------------

CREATE TABLE auditoria_checklist (
    id              SERIAL PRIMARY KEY,
    auditoria_id    UUID NOT NULL REFERENCES auditorias(id) ON DELETE CASCADE,
    criterio_id     INTEGER NOT NULL REFERENCES cscacau_criterios(id),
    resposta        checklist_answer NOT NULL,
    pontos_obtidos  INTEGER NOT NULL DEFAULT 0,
    observacao      TEXT,
    evidencia_url   TEXT            -- foto ou documento de comprovação
);


-- ------------------------------------
-- SCORES
-- (calculados após cada auditoria aprovada)
-- ------------------------------------

CREATE TABLE scores (
    id                      SERIAL PRIMARY KEY,
    produtor_id             UUID NOT NULL REFERENCES produtores(id),
    auditoria_id            UUID REFERENCES auditorias(id),
    -- Pontuação por área (0-100 cada)
    score_gestao_producao   INTEGER NOT NULL DEFAULT 0,
    score_gestao_ambiental  INTEGER NOT NULL DEFAULT 0,
    score_gestao_social     INTEGER NOT NULL DEFAULT 0,
    -- Score total ponderado (0-100)
    score_total             INTEGER NOT NULL DEFAULT 0,
    faixa                   score_band NOT NULL,
    -- Vigência
    valido_de               DATE NOT NULL,
    valido_ate              DATE NOT NULL,
    ativo                   BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Apenas um score ativo por produtor
CREATE UNIQUE INDEX idx_scores_produtor_ativo ON scores(produtor_id) WHERE ativo = TRUE;


-- ------------------------------------
-- PESOS DAS ÁREAS DE SCORE
-- (configurável pelo admin)
-- ------------------------------------

CREATE TABLE score_pesos (
    id                  SERIAL PRIMARY KEY,
    peso_producao       NUMERIC(5,2) NOT NULL DEFAULT 0.40,  -- 40%
    peso_ambiental      NUMERIC(5,2) NOT NULL DEFAULT 0.35,  -- 35%
    peso_social         NUMERIC(5,2) NOT NULL DEFAULT 0.25,  -- 25%
    vigente_de          DATE NOT NULL,
    vigente_ate         DATE,
    ativo               BOOLEAN NOT NULL DEFAULT TRUE
);


-- ------------------------------------
-- EXPECTATIVAS DE PRODUÇÃO
-- (o produtor declara volume e período)
-- ------------------------------------

CREATE TABLE expectativas_producao (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    produtor_id     UUID NOT NULL REFERENCES produtores(id),
    -- Período de entrega declarado
    entrega_inicio  DATE NOT NULL,
    entrega_fim     DATE NOT NULL,
    -- Volume esperado
    volume_kg       NUMERIC(10,2) NOT NULL,
    -- Rastreamento de destino
    status          forecast_status NOT NULL DEFAULT 'rascunho',
    lote_id         UUID,           -- preenchido quando alocado em um lote
    observacoes     TEXT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_periodo CHECK (entrega_fim > entrega_inicio),
    CONSTRAINT chk_volume   CHECK (volume_kg > 0)
);


-- ------------------------------------
-- COTAÇÕES DE MERCADO
-- (preço base da bolsa, inserido pelo admin)
-- ------------------------------------

CREATE TABLE cotacoes (
    id          SERIAL PRIMARY KEY,
    data        DATE NOT NULL UNIQUE,
    preco_kg    NUMERIC(10,4) NOT NULL,  -- R$/kg de amêndoa seca
    fonte       TEXT,                    -- ex: 'CEPEA', 'ICCO'
    observacoes TEXT,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ------------------------------------
-- BONIFICAÇÕES POR FAIXA DE SCORE
-- (configurável pelo admin)
-- ------------------------------------

CREATE TABLE bonificacoes (
    id              SERIAL PRIMARY KEY,
    faixa           score_band NOT NULL,
    bonificacao_pct NUMERIC(5,2) NOT NULL,  -- percentual sobre o preço base
    vigente_de      DATE NOT NULL,
    vigente_ate     DATE,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_bonificacao CHECK (bonificacao_pct >= 0)
);

-- Exemplos iniciais (a popular via seed):
-- Faixa A: +15% | Faixa B: +8% | Faixa C: +3% | Faixa D: 0%


-- ------------------------------------
-- LOTES
-- ------------------------------------

CREATE TABLE lotes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Identificadores
    codigo              TEXT UNIQUE NOT NULL,           -- ex: 'BA-ILH-A-2025-W23'
    semana_iso          TEXT NOT NULL,                  -- ex: '2025-W23'
    -- Agrupamento: ponto de entrega é o critério primário; região é derivada dele
    ponto_entrega_id    UUID NOT NULL REFERENCES pontos_entrega(id),
    regiao_id           INTEGER REFERENCES regioes(id), -- derivado do ponto de entrega
    faixa_score         score_band NOT NULL,
    -- Janela de entrega
    entrega_inicio      DATE NOT NULL,
    entrega_fim         DATE NOT NULL,
    -- Volume
    volume_declarado_kg NUMERIC(10,2) NOT NULL DEFAULT 0,
    volume_minimo_kg    NUMERIC(10,2) NOT NULL DEFAULT 500,  -- lote mínimo para ir a leilão
    -- Precificação
    cotacao_id          INTEGER REFERENCES cotacoes(id),
    preco_base_kg       NUMERIC(10,4),
    bonificacao_pct     NUMERIC(5,2),
    preco_referencia_kg NUMERIC(10,4),  -- base + bonificação (calculado)
    -- Resultado do leilão
    preco_final_kg      NUMERIC(10,4),
    comprador_id        UUID REFERENCES compradores(id),
    -- Status
    status              lot_status NOT NULL DEFAULT 'formando',
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_entrega CHECK (entrega_fim > entrega_inicio)
);


-- ------------------------------------
-- PRODUTORES DO LOTE
-- (quais produtores compõem cada lote)
-- ------------------------------------

CREATE TABLE lote_produtores (
    id                  SERIAL PRIMARY KEY,
    lote_id             UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
    produtor_id         UUID NOT NULL REFERENCES produtores(id),
    expectativa_id      UUID NOT NULL REFERENCES expectativas_producao(id),
    volume_kg           NUMERIC(10,2) NOT NULL,
    UNIQUE (lote_id, produtor_id)
);


-- ------------------------------------
-- LEILÕES
-- ------------------------------------

CREATE TABLE leiloes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lote_id         UUID NOT NULL UNIQUE REFERENCES lotes(id),
    -- Janela do leilão (ex: segunda 08h → sexta 18h)
    inicio          TIMESTAMPTZ NOT NULL,
    fim             TIMESTAMPTZ NOT NULL,
    -- Preço
    preco_minimo_kg NUMERIC(10,4) NOT NULL,
    preco_atual_kg  NUMERIC(10,4),
    -- Resultado
    status          auction_status NOT NULL DEFAULT 'agendado',
    vencedor_id     UUID REFERENCES compradores(id),
    lance_final_kg  NUMERIC(10,4),
    encerrado_em    TIMESTAMPTZ,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_janela CHECK (fim > inicio)
);


-- ------------------------------------
-- LANCES
-- ------------------------------------

CREATE TABLE lances (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    leilao_id       UUID NOT NULL REFERENCES leiloes(id),
    comprador_id    UUID NOT NULL REFERENCES compradores(id),
    valor_kg        NUMERIC(10,4) NOT NULL,
    -- 'ativo' = lance mais alto no momento | 'superado' | 'vencedor' | 'perdedor'
    status          TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'superado', 'vencedor', 'perdedor')),
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_valor CHECK (valor_kg > 0)
);

CREATE INDEX idx_lances_leilao ON lances(leilao_id, criado_em DESC);


-- ------------------------------------
-- ENTREGAS
-- ------------------------------------

CREATE TABLE entregas (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lote_id                 UUID NOT NULL UNIQUE REFERENCES lotes(id),
    comprador_id            UUID NOT NULL REFERENCES compradores(id),
    ponto_entrega_id        UUID NOT NULL REFERENCES pontos_entrega(id),
    -- Datas
    data_prevista           DATE NOT NULL,
    data_recebimento        DATE,
    -- Volumes
    volume_declarado_kg     NUMERIC(10,2) NOT NULL,  -- soma das expectativas do lote
    volume_recebido_kg      NUMERIC(10,2),           -- peso na balança do comprador
    -- Qualidade (preenchido pelo operador na balança)
    umidade_pct             NUMERIC(5,2),
    fermentacao_pct         NUMERIC(5,2),
    qualidade_obs           TEXT,
    -- Motor Fiscal (SLA de 24h após leilão encerrado)
    nfe_status              nfe_status NOT NULL DEFAULT 'pendente',
    nfe_numero              TEXT,
    nfe_url                 TEXT,                    -- arquivo uploaded
    nfe_tipo                TEXT CHECK (nfe_tipo IN ('emissao_produtor', 'contra_nota_comprador')),
    nfe_prazo               TIMESTAMPTZ,             -- prazo de 24h calculado ao encerrar leilão
    nfe_enviada_em          TIMESTAMPTZ,
    -- QR Code logístico (só gerado após nfe_status = 'validada')
    qr_code_token           TEXT UNIQUE,             -- token UUID para verificação offline
    qr_code_gerado_em       TIMESTAMPTZ,
    qr_code_url             TEXT,                    -- link para o documento impresso
    -- Status geral
    status                  delivery_status NOT NULL DEFAULT 'pendente',
    validado_por            UUID REFERENCES users(id),
    validado_em             TIMESTAMPTZ,
    observacoes             TEXT,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_entregas_nfe_status ON entregas(nfe_status) WHERE nfe_status != 'validada';
CREATE INDEX idx_entregas_qr         ON entregas(qr_code_token) WHERE qr_code_token IS NOT NULL;


-- ------------------------------------
-- RELATÓRIO DE RASTREABILIDADE POR LOTE
-- (visão desnormalizada para exportação — gerada no fechamento da entrega)
-- ------------------------------------

CREATE TABLE rastreabilidade_lotes (
    id                  SERIAL PRIMARY KEY,
    lote_id             UUID NOT NULL REFERENCES lotes(id),
    gerado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Snapshot dos dados no momento da entrega
    dados_json          JSONB NOT NULL,
    -- dados_json contém: produtor, propriedade, CAR, score, municipio, regiao,
    --                    volume entregue, checklist resumido, contato técnico
    exportado_csv_url   TEXT,
    exportado_pdf_url   TEXT
);


-- ------------------------------------
-- TAXAS E TARIFAS
-- (configurável pelo admin)
-- ------------------------------------

CREATE TABLE tarifas (
    id                  SERIAL PRIMARY KEY,
    tipo                TEXT NOT NULL CHECK (tipo IN ('taxa_anual_produtor', 'comissao_comprador_pct')),
    valor               NUMERIC(10,4) NOT NULL,  -- R$ ou percentual
    descricao           TEXT,
    vigente_de          DATE NOT NULL,
    vigente_ate         DATE,
    ativo               BOOLEAN NOT NULL DEFAULT TRUE
);


-- ------------------------------------
-- PAGAMENTOS
-- ------------------------------------

CREATE TABLE pagamentos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id),
    tipo            payment_type NOT NULL,
    valor           NUMERIC(10,2) NOT NULL,
    status          payment_status NOT NULL DEFAULT 'pendente',
    referencia      TEXT,           -- ex: ID do lote para comissão de comprador
    ano_referencia  INTEGER,        -- para taxa anual
    vencimento      DATE,
    pago_em         TIMESTAMPTZ,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ------------------------------------
-- NOTIFICAÇÕES
-- ------------------------------------

CREATE TABLE notificacoes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id),
    tipo        TEXT NOT NULL,      -- 'novo_lote', 'leilao_aberto', 'lance_superado', 'entrega_pendente', etc.
    titulo      TEXT NOT NULL,
    mensagem    TEXT,
    lida        BOOLEAN NOT NULL DEFAULT FALSE,
    referencia_id TEXT,             -- ID do lote, leilão, etc.
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notificacoes_user ON notificacoes(user_id, lida, criado_em DESC);


-- ------------------------------------
-- HISTÓRICO DE STATUS (auditoria de mudanças)
-- ------------------------------------

CREATE TABLE historico_status (
    id              SERIAL PRIMARY KEY,
    entidade        TEXT NOT NULL,  -- 'lote', 'leilao', 'produtor', 'auditoria'
    entidade_id     TEXT NOT NULL,
    status_anterior TEXT,
    status_novo     TEXT NOT NULL,
    user_id         UUID REFERENCES users(id),
    observacao      TEXT,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ------------------------------------
-- TRIBUNAL DE ENTREGAS (Processos de Defesa)
-- ------------------------------------

CREATE TABLE processos_defesa (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    produtor_id     UUID NOT NULL REFERENCES produtores(id),
    entrega_id      UUID REFERENCES entregas(id),    -- entrega que originou o bloqueio (pode ser NULL se bloqueio manual)
    -- Motivo do bloqueio
    motivo_bloqueio TEXT NOT NULL,
    -- Defesa do produtor
    descricao       TEXT NOT NULL,                   -- relato do produtor
    evidencias_urls TEXT[] NOT NULL DEFAULT '{}',    -- fotos, documentos, laudos
    -- Julgamento pelo admin
    status          defense_status NOT NULL DEFAULT 'aberto',
    julgado_por     UUID REFERENCES users(id),
    julgado_em      TIMESTAMPTZ,
    decisao         TEXT,                            -- fundamentação da decisão
    multa_valor     NUMERIC(10,2),                   -- se aplicável
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_defesa_produtor ON processos_defesa(produtor_id, status);
CREATE INDEX idx_defesa_status   ON processos_defesa(status) WHERE status IN ('aberto', 'em_analise');


-- ------------------------------------
-- ESCROW FINANCEIRO (Conta Caução)
-- FORA DO MVP — exige subconta por lote em parceiro fintech (Celcoin / Swap / Zoop)
-- e habilitação regulatória como correspondente bancário ou PSP.
-- No MVP, o pagamento entre comprador e produtores ocorre fora da plataforma.
-- Este schema é um placeholder estrutural para a fase pós-captação.
-- ------------------------------------

CREATE TABLE escrow_lotes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lote_id             UUID NOT NULL UNIQUE REFERENCES lotes(id),
    comprador_id        UUID NOT NULL REFERENCES compradores(id),
    -- Valores
    valor_total         NUMERIC(12,2) NOT NULL,      -- preco_final_kg × volume_declarado_kg
    valor_depositado    NUMERIC(12,2),
    valor_liberado      NUMERIC(12,2),               -- liberado ao produtor após validação
    valor_estornado     NUMERIC(12,2),               -- estorno por diferença de peso
    -- Prazos (SLA)
    prazo_deposito      TIMESTAMPTZ NOT NULL,        -- leilão encerrado + 72h
    depositado_em       TIMESTAMPTZ,
    liberado_em         TIMESTAMPTZ,
    -- Multa por não depósito
    multa_aplicada      NUMERIC(10,2),
    -- Status
    status              TEXT NOT NULL DEFAULT 'aguardando_deposito'
                        CHECK (status IN ('aguardando_deposito', 'depositado', 'liberado', 'estornado', 'multado')),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ------------------------------------
-- SPLITS DE PAGAMENTO (repasse por produtor)
-- ------------------------------------

CREATE TABLE splits_pagamento (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escrow_id           UUID NOT NULL REFERENCES escrow_lotes(id),
    produtor_id         UUID NOT NULL REFERENCES produtores(id),
    lote_produtor_id    INTEGER NOT NULL REFERENCES lote_produtores(id),
    -- Cálculo
    volume_declarado_kg NUMERIC(10,2) NOT NULL,
    volume_recebido_kg  NUMERIC(10,2),               -- preenchido após pesagem
    percentual_lote     NUMERIC(7,4) NOT NULL,        -- volume_produtor / volume_lote
    valor_bruto         NUMERIC(12,2),               -- percentual × valor_total_lote
    taxa_plataforma     NUMERIC(10,2),               -- taxa anual já paga = 0; senão desconta aqui
    valor_liquido       NUMERIC(12,2),               -- recebe via PIX
    -- PIX
    chave_pix           TEXT,
    pix_status          TEXT NOT NULL DEFAULT 'pendente'
                        CHECK (pix_status IN ('pendente', 'agendado', 'pago', 'falhou')),
    pix_pago_em         TIMESTAMPTZ,
    pix_id_transacao    TEXT,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_splits_produtor ON splits_pagamento(produtor_id, pix_status);
CREATE INDEX idx_splits_escrow   ON splits_pagamento(escrow_id);


-- ------------------------------------
-- ÍNDICES DE PERFORMANCE
-- ------------------------------------

CREATE INDEX idx_produtores_regiao    ON produtores(regiao_id);
CREATE INDEX idx_produtores_status    ON produtores(audit_status);
CREATE INDEX idx_scores_produtor      ON scores(produtor_id, ativo);
CREATE INDEX idx_expectativas_produtor ON expectativas_producao(produtor_id, status);
CREATE INDEX idx_expectativas_periodo ON expectativas_producao(entrega_inicio, entrega_fim);
CREATE INDEX idx_lotes_ponto_faixa    ON lotes(ponto_entrega_id, faixa_score, status);
CREATE INDEX idx_lotes_regiao_faixa   ON lotes(regiao_id, faixa_score, status);
CREATE INDEX idx_lotes_semana         ON lotes(semana_iso);
CREATE INDEX idx_leiloes_status       ON leiloes(status, fim);
CREATE INDEX idx_entregas_status      ON entregas(status);
CREATE INDEX idx_pagamentos_user      ON pagamentos(user_id, status);
