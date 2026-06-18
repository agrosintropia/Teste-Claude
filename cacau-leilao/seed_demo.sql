-- =============================================================
-- LoteForte — Seed de demonstração
-- Senhas: todas são "demo1234" (bcrypt hash abaixo)
-- Hash gerado com: python -c "from passlib.context import CryptContext; print(CryptContext(['bcrypt']).hash('demo1234'))"
-- =============================================================

-- ─── Usuários ────────────────────────────────────────────────
INSERT INTO users (id, nome, email, hashed_password, role, ativo, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Admin LoteForte',   'admin@loteforte.com',      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGmizmzuD0RI.GqZT8uUQ8DSsVu', 'admin',       true, NOW()),
  ('00000000-0000-0000-0000-000000000002', 'João Cacaueiro',     'joao@produtor.com',        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGmizmzuD0RI.GqZT8uUQ8DSsVu', 'produtor',    true, NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Maria Rocha',        'maria@produtor.com',       '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGmizmzuD0RI.GqZT8uUQ8DSsVu', 'produtor',    true, NOW()),
  ('00000000-0000-0000-0000-000000000004', 'Carlos Silva',       'carlos@produtor.com',      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGmizmzuD0RI.GqZT8uUQ8DSsVu', 'produtor',    true, NOW()),
  ('00000000-0000-0000-0000-000000000005', 'Chocobras Ltda',     'compras@chocobras.com',    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGmizmzuD0RI.GqZT8uUQ8DSsVu', 'atravessador',true, NOW()),
  ('00000000-0000-0000-0000-000000000006', 'Moageira Sul Bahia', 'compras@moageirasl.com',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGmizmzuD0RI.GqZT8uUQ8DSsVu', 'moageira',   true, NOW()),
  ('00000000-0000-0000-0000-000000000007', 'Ana Auditora',       'ana@auditoria.com',        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGmizmzuD0RI.GqZT8uUQ8DSsVu', 'auditor',     true, NOW())
ON CONFLICT (email) DO NOTHING;

-- ─── Regiões ─────────────────────────────────────────────────
INSERT INTO regioes (id, nome, uf, codigo, ativo) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Sul da Bahia',       'BA', 'SUL-BA', true),
  ('10000000-0000-0000-0000-000000000002', 'Extremo Sul Bahia',  'BA', 'EXT-BA', true),
  ('10000000-0000-0000-0000-000000000003', 'Norte do Espírito Santo', 'ES', 'NOR-ES', true)
ON CONFLICT DO NOTHING;

-- ─── Pontos de entrega ────────────────────────────────────────
INSERT INTO pontos_entrega (id, regiao_id, nome, municipio, estado, latitude, longitude, ativo) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'Cooperativa Ilhéus Centro', 'Ilhéus', 'BA', -14.7892, -39.0490, true),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001',
   'Armazém Itabuna', 'Itabuna', 'BA', -14.7862, -39.2803, true),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002',
   'Ponto Porto Seguro', 'Porto Seguro', 'BA', -16.4499, -39.0649, true)
ON CONFLICT DO NOTHING;

-- ─── Produtores ───────────────────────────────────────────────
INSERT INTO produtores (id, user_id, cpf_cnpj, municipio, estado, regiao_id, car, ativo, created_at) VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
   '111.222.333-44', 'Ilhéus', 'BA', '10000000-0000-0000-0000-000000000001',
   'BA-2927408-ABCD1234EFGH5678', true, NOW()),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003',
   '222.333.444-55', 'Ilhéus', 'BA', '10000000-0000-0000-0000-000000000001',
   'BA-2927408-IJKL9012MNOP3456', true, NOW()),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004',
   '333.444.555-66', 'Itabuna', 'BA', '10000000-0000-0000-0000-000000000001',
   'BA-2914802-QRST7890UVWX1234', true, NOW())
ON CONFLICT DO NOTHING;

-- ─── Tarifa arroba (ano 2025) — R$ 450/arroba ────────────────
INSERT INTO tarifas (id, tipo, valor, ano_referencia, vigente_de, ativo, created_at) VALUES
  ('40000000-0000-0000-0000-000000000001', 'preco_medio_arroba',  450.00, 2025,
   '2025-01-01', true, NOW()),
  ('40000000-0000-0000-0000-000000000002', 'taxa_anual_produtor', 450.00, 2026,
   '2026-01-01', true, NOW()),
  ('40000000-0000-0000-0000-000000000003', 'comissao_comprador_pct', 2.50, NULL,
   '2025-01-01', true, NOW())
ON CONFLICT DO NOTHING;

-- ─── Scores (faixa A para os 3 produtores) ───────────────────
INSERT INTO scores (id, produtor_id, score_total, gestao_producao, gestao_ambiental,
                    gestao_social, faixa, ativo, valido_ate, created_at) VALUES
  ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
   87.5, 90.0, 85.0, 86.0, 'A', true, NOW() + INTERVAL '1 year', NOW()),
  ('50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002',
   82.0, 83.0, 80.0, 83.0, 'A', true, NOW() + INTERVAL '1 year', NOW()),
  ('50000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003',
   78.5, 80.0, 76.0, 79.0, 'B', true, NOW() + INTERVAL '1 year', NOW())
ON CONFLICT DO NOTHING;

-- ─── Expectativas publicadas ──────────────────────────────────
INSERT INTO expectativas_producao (id, produtor_id, volume_kg, entrega_inicio, entrega_fim,
                                    status, created_at) VALUES
  ('60000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
   3000.0, NOW()::date + 7, NOW()::date + 14, 'publicada', NOW()),
  ('60000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002',
   2000.0, NOW()::date + 7, NOW()::date + 14, 'publicada', NOW()),
  ('60000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003',
   1500.0, NOW()::date + 7, NOW()::date + 14, 'publicada', NOW())
ON CONFLICT DO NOTHING;

-- ─── Lote demo (faixa A, semana atual) ───────────────────────
INSERT INTO lotes (id, codigo, regiao_id, ponto_entrega_id, faixa_score,
                   volume_declarado_kg, volume_minimo_kg, entrega_inicio, entrega_fim,
                   status, created_at) VALUES
  ('70000000-0000-0000-0000-000000000001',
   'BA-SULBA-A-2026-W25',
   '10000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001',
   'A', 6500.0, 3000.0,
   NOW()::date + 7, NOW()::date + 14,
   'em_leilao', NOW())
ON CONFLICT DO NOTHING;

-- ─── Vínculos expectativa ↔ lote ─────────────────────────────
INSERT INTO lote_produtores (id, lote_id, produtor_id, expectativa_id, volume_kg, created_at) VALUES
  ('80000000-0000-0000-0000-000000000001',
   '70000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
   '60000000-0000-0000-0000-000000000001', 3000.0, NOW()),
  ('80000000-0000-0000-0000-000000000002',
   '70000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002',
   '60000000-0000-0000-0000-000000000002', 2000.0, NOW()),
  ('80000000-0000-0000-0000-000000000003',
   '70000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003',
   '60000000-0000-0000-0000-000000000003', 1500.0, NOW())
ON CONFLICT DO NOTHING;

-- ─── Leilão aberto para o lote demo ──────────────────────────
INSERT INTO leiloes (id, lote_id, status, lance_minimo_kg, inicio, fim, created_at) VALUES
  ('90000000-0000-0000-0000-000000000001',
   '70000000-0000-0000-0000-000000000001',
   'em_leilao', 8.50,
   NOW() - INTERVAL '1 hour',
   NOW() + INTERVAL '47 hours',
   NOW())
ON CONFLICT DO NOTHING;

-- ─── Atualiza expectativas como alocadas ─────────────────────
UPDATE expectativas_producao
SET status = 'alocada', lote_id = '70000000-0000-0000-0000-000000000001'
WHERE id IN (
  '60000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000002',
  '60000000-0000-0000-0000-000000000003'
);
