-- =============================================================
-- Seed: Critérios do Currículo de Sustentabilidade do Cacau
-- Fonte: Manual de Implementação CSCacau (MAPA, 2023)
-- =============================================================

INSERT INTO cscacau_criterios (codigo, area, titulo, descricao, pontos_max, obrigatorio) VALUES

-- ============================================================
-- GESTÃO DA PRODUÇÃO
-- ============================================================
('1.1.1', 'gestao_producao', 'Gestão de Propriedade — CAR e Croqui',
 'Possui Cadastro Ambiental Rural (CAR) ativo e croqui/imagem atualizada da propriedade discriminando áreas de produção, preservação e infraestrutura.',
 10, true),

('1.1.2', 'gestao_producao', 'Registro de Operações',
 'Mantém caderno de campo, planilhas ou caderneta com registros diários de insumos, mão de obra, custos e produtividade por quadra.',
 8, false),

('1.2.1', 'gestao_producao', 'Material Propagativo',
 'Utiliza mudas ou sementes de procedência confiável com nota fiscal, registro fitossanitário e comprovantes. Variedades adaptadas à região e tolerantes a pragas/doenças.',
 8, false),

('1.3.1', 'gestao_producao', 'Densidade de Plantas',
 'Avalia e adequa o número de plantas de cacau por hectare em cada quadra com acompanhamento técnico, considerando luminosidade e manejo de sombra.',
 6, false),

('1.4.1', 'gestao_producao', 'Conservação do Solo',
 'Mantém solo coberto com manejo de brotamentos, roçada e poda que geram cobertura morta. Evita erosão e compactação. Favorece matéria orgânica e microrganismos.',
 10, false),

('1.5.1', 'gestao_producao', 'Localização dos Cacauais — Conformidade Legal',
 'O cultivo de cacau ocorre apenas em áreas permitidas por lei, fora de Unidades de Conservação de Proteção Integral, terras indígenas e quilombolas (para não tradicionais).',
 10, true),

('1.6.1', 'gestao_producao', 'Avaliação da Fertilidade do Solo',
 'Realiza análise de solo ao menos uma vez por ano e possui plano de adubação elaborado por técnico especializado, com correções de calcário e gesso conforme laudo.',
 8, false),

('1.7.1', 'gestao_producao', 'Irrigação — Uso Racional',
 'Quando usa irrigação: possui projeto técnico, outorga ou dispensa do órgão competente, tecnologia de menor desperdício (gotejo) e registra volumes aplicados.',
 6, false),

('1.8.1', 'gestao_producao', 'Agrotóxicos — EPIs e Treinamento',
 'Todos os aplicadores possuem EPI adequado (luvas, respirador, viseira, jaleco hidrorrepelente, botas) e treinamento específico. Produtor fornece e exige uso.',
 10, true),

('1.8.2', 'gestao_producao', 'Agrotóxicos — Produtos Registrados',
 'Utiliza exclusivamente produtos aprovados pelo MAPA/ANVISA para a cultura do cacau. Não usa agrotóxicos sem registro para a cultura.',
 10, true),

('1.8.3', 'gestao_producao', 'Agrotóxicos — Receituário e Dosagem',
 'Aplicações baseadas em receituário agronômico. Alterna princípios ativos. Respeita dosagens, períodos de reentrada e carência. Registra aplicações.',
 8, false),

('1.9.1', 'gestao_producao', 'Poda e Manejo da Luz',
 'Realiza poda do cacau e espécies consorciadas com materiais higienizados, sem rasgos na casca. Copa em cálice, sem cruzamento. Remove chupões. Maneja sombra adequadamente.',
 8, false),

-- ============================================================
-- GESTÃO AMBIENTAL
-- ============================================================
('2.1.1', 'gestao_ambiental', 'Cumprimento do Código Florestal',
 'Não desmata florestas existentes desde 22/09/2008. Propriedade regular no CAR. Sem embargos ativos por desmatamento ou queimadas ilegais.',
 10, true),

('2.1.2', 'gestao_ambiental', 'Tratamento de Resíduos',
 'Destina adequadamente resíduos orgânicos (compostagem) e inorgânicos (reciclagem). Não reutiliza embalagens de agrotóxicos. Evita queima de materiais.',
 8, false),

('2.1.3', 'gestao_ambiental', 'Uso de Lenha — Conformidade',
 'Uso de lenha dentro dos limites legais: não retira de florestas não consolidadas sem licença; respeita limite de 2m³/ano/ha em Reserva Legal para uso não comercial.',
 6, false),

('2.1.4', 'gestao_ambiental', 'Identificação e Recuperação de Áreas Degradadas',
 'Identifica áreas degradadas da propriedade e possui ou está implementando plano de recuperação (cercamento para regeneração natural ou plantio de mudas).',
 8, false),

('2.1.5', 'gestao_ambiental', 'Tratamento de Efluentes',
 'Esgoto doméstico tratado em fossa séptica ou BET. Água de lavagem de EPI e maquinários direcionada a caixas de contenção, nunca lançada em APPs ou corpos d''água.',
 8, false),

('2.2.1', 'gestao_ambiental', 'Manuseio de Agrotóxicos',
 'Preparo da calda em local impermeável (piso de concreto ou lona). Local com valas de contenção. Procedimentos seguros que evitam contaminação do solo e água.',
 10, false),

('2.2.2', 'gestao_ambiental', 'Armazenagem de Agrotóxicos',
 'Depósito exclusivo para agrotóxicos: paredes/cobertura resistentes, ventilação externa, a mais de 15m de água/moradias/alimentos, acesso controlado, identificado com sinalização de risco.',
 8, false),

('2.2.3', 'gestao_ambiental', 'Tríplice Lavagem de Embalagens',
 'Realiza tríplice lavagem (ou pressão) das embalagens após uso com EPI. Armazena embalagens lavadas/perfuradas separadas até devolução. Guarda comprovantes.',
 8, false),

('2.3.1', 'gestao_ambiental', 'Devolução de Embalagens Vazias',
 'Devolve 100% das embalagens vazias nas unidades de recebimento indicadas na nota fiscal dentro do prazo legal. Guarda comprovantes de devolução.',
 10, true),

('2.3.2', 'gestao_ambiental', 'Produtos Agrotóxicos Vencidos',
 'Não utiliza produtos vencidos. Devolve produtos vencidos em unidades de recebimento autorizadas.',
 8, false),

('2.4.1', 'gestao_ambiental', 'Armazenagem de Fertilizantes',
 'Fertilizantes armazenados seguindo normas de segurança: local seco, ventilado, separado de agrotóxicos e alimentos, com identificação adequada.',
 6, false),

('2.5.1', 'gestao_ambiental', 'Limite Máximo de Resíduos (LMR)',
 'Adota boas práticas para respeitar LMRs: usa agrotóxicos por monitoramento (MIPD), respeita dosagens e carências, usa tecnologia de aplicação correta.',
 8, false),

-- ============================================================
-- GESTÃO SOCIAL
-- ============================================================
('3.1.1', 'gestao_social', 'Legislação Trabalhista — Proibições',
 'Não usa mão de obra infantil (proibido). Adolescentes (16-17 anos) apenas em funções não insalubres/perigosas e fora do período escolar. Não retém documentos.',
 10, true),

('3.1.2', 'gestao_social', 'Registro e Remuneração de Trabalhadores',
 'Trabalhadores contratados com carteira assinada, contrato ou recibo (diaristas até 3x/semana). Remuneração nunca abaixo do salário mínimo, inclusive por empreita ou produção.',
 10, false),

('3.2.1', 'gestao_social', 'Jornada de Trabalho',
 'Jornada máxima de 44h semanais. No máximo 2h extras/dia (12h extras/semana). Respeita feriados e dia de descanso remunerado. Controle de ponto ou recibos.',
 8, false),

('3.3.1', 'gestao_social', 'Prevenção de Acidentes (PGRTR)',
 'Identifica atividades de risco e toma medidas preventivas. Realiza ou está implementando o Programa de Gerenciamento de Risco no Trabalho Rural (PGRTR). Treinamentos específicos por função.',
 8, false),

('3.4.1', 'gestao_social', 'Saúde do Trabalhador',
 'Trabalhadores contratados passam por exames médicos anuais. Trabalhador inapto não executa função de risco. Na agricultura familiar, membros usam EPIs e fazem exames regulares.',
 8, false),

('3.5.1', 'gestao_social', 'Condições de Moradia',
 'Moradia para trabalhadores residentes: capacidade por família (não coletiva), paredes em alvenaria/madeira, piso lavável, ventilação/iluminação adequadas, condições sanitárias, poço protegido.',
 6, false),

('3.5.2', 'gestao_social', 'Disponibilidade de Água Potável',
 'Fornece água potável e fresca em quantidade suficiente nos locais de trabalho, inclusive no campo. Condições higiênicas sem copos coletivos. Análise de potabilidade anual.',
 8, false),

('3.6.1', 'gestao_social', 'EPIs para Aplicação de Agrotóxicos — Fornecimento',
 'Produtor fornece gratuitamente os EPIs a trabalhadores aplicadores. Instrui sobre uso correto e exige utilização. EPIs lavados em tanque específico, água de lavagem aplicada em carreadores internos.',
 10, true);
