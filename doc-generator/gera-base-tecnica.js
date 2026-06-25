'use strict';

/**
 * Gerador da Base Técnica de Referência — Adubação Orgânica em SAFs
 * Agrosintropia — uso interno
 *
 * Uso:
 *   node gera-base-tecnica.js
 *   node gera-base-tecnica.js ./meu-relatorio.docx
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageNumber, PageBreak, VerticalAlign, Footer, Header,
  NumberFormat,
} = require('docx');
const fs   = require('fs');
const path = require('path');

// ── Tema ─────────────────────────────────────────────────────────────────────

const THEME = {
  font: 'Arial',
  color: {
    dark:    '1B4332',
    mid:     '2D6A4F',
    light:   '40916C',
    pale:    '74C69D',
    white:   'FFFFFF',
    gray:    '555555',
    rowEven: 'F0FAF4',
    border:  'CCCCCC',
  },
  size: {
    cover:    52,
    title:    40,
    subtitle: 30,
    tagline:  28,
    h1:       32,
    h2:       26,
    h3:       24,
    body:     22,
    small:    20,
  },
};

// ── Bordas reutilizáveis ──────────────────────────────────────────────────────

const CELL_BORDER   = { style: BorderStyle.SINGLE, size: 1, color: THEME.color.border };
const CELL_BORDERS  = { top: CELL_BORDER, bottom: CELL_BORDER, left: CELL_BORDER, right: CELL_BORDER };
const HEAD_BORDER   = { style: BorderStyle.SINGLE, size: 1, color: THEME.color.mid };
const HEAD_BORDERS  = { top: HEAD_BORDER, bottom: HEAD_BORDER, left: HEAD_BORDER, right: HEAD_BORDER };

// ── Primitivos ────────────────────────────────────────────────────────────────

/** TextRun com padrão do tema; aceita overrides via opts. */
function run(text, opts = {}) {
  return new TextRun({ text, font: THEME.font, size: THEME.size.body, ...opts });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    children: [run(text, { bold: true, size: THEME.size.h1, color: THEME.color.dark })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 100 },
    children: [run(text, { bold: true, size: THEME.size.h2, color: THEME.color.mid })],
  });
}

function h3(text) {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [run(text, { bold: true, size: THEME.size.h3, color: THEME.color.light })],
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [run(text, opts)],
  });
}

function spacer() {
  return new Paragraph({ spacing: { before: 80, after: 80 }, children: [run('')] });
}

function divider() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: THEME.color.mid, space: 1 } },
    spacing: { before: 120, after: 120 },
    children: [run('')],
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

/** Item de lista com marcador (bullets). */
function bullet(text) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { before: 60, after: 60 },
    children: [run(text)],
  });
}

// ── Tabela ────────────────────────────────────────────────────────────────────

function makeTable(headers, rows, colWidths) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((label, i) =>
      new TableCell({
        borders: HEAD_BORDERS,
        width: { size: colWidths[i], type: WidthType.DXA },
        shading: { fill: THEME.color.mid, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          children: [run(label, { bold: true, size: THEME.size.small, color: THEME.color.white })],
        })],
      })
    ),
  });

  const dataRows = rows.map((cells, rowIdx) =>
    new TableRow({
      children: cells.map((cellText, colIdx) =>
        new TableCell({
          borders: CELL_BORDERS,
          width: { size: colWidths[colIdx], type: WidthType.DXA },
          shading: { fill: rowIdx % 2 === 0 ? THEME.color.rowEven : THEME.color.white, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({
            children: [run(cellText, { size: THEME.size.small })],
          })],
        })
      ),
    })
  );

  return new Table({
    width: { size: colWidths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...dataRows],
  });
}

// ── Seções do documento ───────────────────────────────────────────────────────

function sectionCover() {
  return [
    spacer(), spacer(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 480, after: 120 },
      children: [run('AGROSINTROPIA', { bold: true, size: THEME.size.cover, color: THEME.color.dark })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 480 },
      children: [run('Consultoria em Sistemas Agroflorestais', { size: THEME.size.tagline, color: THEME.color.light, italics: true })],
    }),
    divider(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 480, after: 120 },
      children: [run('BASE TÉCNICA DE REFERÊNCIA', { bold: true, size: THEME.size.title, color: THEME.color.dark })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 60 },
      children: [run('Adubação Orgânica em Sistemas Agroflorestais', { bold: true, size: THEME.size.subtitle, color: THEME.color.mid })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 480 },
      children: [run(
        'Foco em Café, Cacau, Citros, Abacate, Manga e Frutíferas Tropicais — Solos Tropicais do Sul da Bahia',
        { size: THEME.size.body, color: THEME.color.pale, italics: true },
      )],
    }),
    divider(),
    spacer(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 60 },
      children: [run('Serra Grande, Uruçuca — Bahia, Brasil', { size: THEME.size.body, color: THEME.color.gray })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [run('Versão 1.0 — 2025', { size: THEME.size.body, color: THEME.color.gray })],
    }),
    pageBreak(),
  ];
}

function sectionNota() {
  return [
    h1('NOTA DE USO E RESPONSABILIDADE TÉCNICA'),
    p('Este documento constitui a base de referência técnica do sistema de recomendação de adubação orgânica da Agrosintropia. As recomendações geradas pelo sistema automatizado são rascunhos e devem obrigatoriamente ser revisadas por agrônomo credenciado (CREA/CFBio) antes do envio ao cliente.'),
    spacer(),
    p('As fontes primárias consultadas incluem: Embrapa Mandioca e Fruticultura (Cruz das Almas-BA), CEPLAC (Ilhéus-BA), IAC (Campinas-SP), INCAPER (ES), Manual de Adubação e Calagem para a Bahia, Comissão de Fertilidade do Solo de Minas Gerais (5ª Aproximação) e literatura científica revisada por pares (SciELO, Embrapa Infoteca).'),
    spacer(),
    p('As doses e recomendações têm caráter orientativo e devem considerar: condições edafoclimáticas locais, histórico de manejo da área, disponibilidade regional de insumos orgânicos, estágio fenológico das culturas e legislação vigente para produção orgânica (Lei nº 10.831/2003 e IN MAPA nº 46/2011).'),
    pageBreak(),
  ];
}

function sectionParte1() {
  return [
    h1('PARTE 1 — INTERPRETAÇÃO DE ANÁLISE DE SOLO'),
    p('A correta interpretação dos laudos laboratoriais é o ponto de partida de qualquer recomendação de adubação. Os parâmetros abaixo seguem os critérios adaptados da Embrapa e do Manual de Adubação da Bahia para solos tropicais úmidos.'),
    spacer(),

    h2('1.1 pH do Solo'),
    p('O pH é o parâmetro mais fundamental, pois condiciona a disponibilidade de praticamente todos os nutrientes. Em solos tropicais, o pH CaCl₂ é o método padrão (valores ~0,5 unidade abaixo do pH em água).'),
    spacer(),
    makeTable(
      ['Faixa pH (CaCl₂)', 'Faixa pH (H₂O)', 'Classificação', 'Ação Recomendada'],
      [
        ['< 4,0',    '< 4,5',    'Extremamente ácido',   'Calagem urgente + correção Al³⁺'],
        ['4,0 – 4,4','4,5 – 5,0','Muito ácido',          'Calagem obrigatória'],
        ['4,5 – 4,9','5,0 – 5,5','Ácido',                'Calagem recomendada'],
        ['5,0 – 5,5','5,5 – 6,0','Moderadamente ácido',  'Ideal para maioria dos SAFs'],
        ['5,6 – 6,0','6,0 – 6,5','Levemente ácido',      'Ótimo para café, cacau, citros'],
        ['> 6,0',    '> 6,5',    'Neutro a alcalino',    'Monitorar micronutrientes (Mn, Fe, Zn)'],
      ],
      [2000, 2000, 2000, 3100],
    ),
    spacer(),
    p('pH ideal por cultura (CaCl₂): Café: 5,5–6,0 | Cacau: 5,5–6,5 | Citros: 5,5–6,0 | Manga: 5,0–5,5 | Abacate: 5,0–6,0 | Frutíferas tropicais geral: 5,0–6,0', { italics: true }),
    spacer(),

    h2('1.2 Matéria Orgânica (MO)'),
    p('Em solos tropicais, a matéria orgânica é o principal reservatório de N e o maior contribuinte para a CTC. Nos SAFs, a meta é elevar progressivamente o teor de MO.'),
    spacer(),
    makeTable(
      ['Teor MO (dag/kg ou %)', 'Classificação', 'Implicações para SAF'],
      [
        ['< 1,0',    'Muito baixo', 'Solo degradado; priorizar adubação verde e cobertura morta'],
        ['1,0 – 2,0','Baixo',       'Adubação orgânica regular; incorporar composto e palhada'],
        ['2,1 – 4,0','Médio',       'Manutenção; continuar aportes orgânicos'],
        ['4,1 – 6,0','Alto',        'Boa fertilidade; reduzir doses, monitorar N disponível'],
        ['> 6,0',    'Muito alto',  'Excelente; SAF em estágio avançado de ciclagem'],
      ],
      [2100, 1800, 5200],
    ),
    spacer(),

    h2('1.3 Fósforo Disponível (P — Mehlich-1)'),
    p('O fósforo é o nutriente de maior fixação em solos tropicais oxídicos (Latossolos). A interpretação varia com a textura do solo.'),
    spacer(),
    makeTable(
      ['Teor P (mg/dm³)', 'Classificação', 'Textura Argilosa (> 35% argila)', 'Textura Média/Arenosa (< 35%)'],
      [
        ['0 – 4',    'Muito baixo', 'Aplicar 100–200% da dose base', 'Aplicar 100–200% da dose base'],
        ['4,1 – 8',  'Baixo',       'Aplicar 100% da dose base',     'Aplicar 100% da dose base'],
        ['8,1 – 12', 'Médio',       'Aplicar 50–75% da dose base',   'Aplicar 75% da dose base'],
        ['12,1 – 20','Bom',         'Manutenção: 25–50% da dose',    'Manutenção: 50% da dose'],
        ['> 20',     'Alto',        'Não aplicar ou dose mínima',    'Não aplicar'],
      ],
      [1500, 1500, 3300, 2800],
    ),
    spacer(),

    h2('1.4 Potássio Trocável (K — cmolc/dm³ ou mg/dm³)'),
    spacer(),
    makeTable(
      ['Teor K (cmolc/dm³)', 'Teor K (mg/dm³)', 'Classificação', 'Ação'],
      [
        ['< 0,08',     '< 31',      'Muito baixo', 'Aplicar 150% da dose base'],
        ['0,08 – 0,15','31 – 59',   'Baixo',       'Aplicar 100% da dose base'],
        ['0,16 – 0,30','60 – 117',  'Médio',       'Aplicar 75% da dose base'],
        ['0,31 – 0,60','118 – 235', 'Bom',         'Aplicar 50% da dose base'],
        ['> 0,60',     '> 235',     'Alto',        'Manutenção ou sem aplicação'],
      ],
      [1800, 1800, 1800, 3700],
    ),
    spacer(),

    h2('1.5 Cálcio (Ca²⁺) e Magnésio (Mg²⁺) — cmolc/dm³'),
    spacer(),
    makeTable(
      ['Nutriente', 'Muito Baixo', 'Baixo', 'Médio', 'Bom', 'Alto'],
      [
        ['Ca²⁺ (cmolc/dm³)', '< 0,5', '0,5 – 1,5', '1,6 – 3,0', '3,1 – 5,0', '> 5,0'],
        ['Mg²⁺ (cmolc/dm³)', '< 0,3', '0,3 – 0,8', '0,9 – 1,5', '1,6 – 2,5', '> 2,5'],
        ['Relação Ca/Mg',     '—',     '< 1 (deseq.)','1 – 4 (ideal)','—',     '> 6 (deseq.)'],
      ],
      [1800, 1500, 1500, 1500, 1600, 1200],
    ),
    spacer(),
    p('Relação ideal Ca:Mg:K no complexo de troca: 65–70% : 10–15% : 3–5% da CTC. Desequilíbrios afetam absorção mesmo com teores absolutos adequados.', { italics: true }),
    spacer(),

    h2('1.6 Capacidade de Troca Catiônica (CTC) e Saturação por Bases (V%)'),
    spacer(),
    makeTable(
      ['Parâmetro', 'Muito Baixo', 'Baixo', 'Médio', 'Bom', 'Alto'],
      [
        ['CTC pH7 (cmolc/dm³)', '< 4',  '4 – 8',   '8 – 12',  '12 – 17', '> 17'],
        ['V% (sat. bases)',     '< 20%', '20 – 40%','40 – 60%','60 – 75%','> 75%'],
      ],
      [2000, 1500, 1500, 1500, 1500, 1100],
    ),
    spacer(),
    p('V% alvo por cultura: Café: 60–70% | Cacau: 55–65% | Citros: 60–70% | Manga: 50–60% | Abacate: 55–65% | Frutíferas tropicais: 50–60%', { italics: true }),
    spacer(),

    h2('1.7 Alumínio Trocável (Al³⁺) e Saturação por Alumínio (m%)'),
    spacer(),
    makeTable(
      ['Al³⁺ (cmolc/dm³)', 'm% (sat. alumínio)', 'Classificação', 'Ação'],
      [
        ['= 0',     '0%',       'Sem toxidez', 'Normal'],
        ['0,1 – 0,5','< 20%',   'Baixo',       'Monitorar; calagem preventiva'],
        ['0,6 – 1,0','20 – 50%','Médio',        'Calagem corretiva necessária'],
        ['> 1,0',   '> 50%',    'Alto',         'Calagem urgente; limitante severo'],
      ],
      [2000, 2000, 2000, 3100],
    ),
    spacer(),
    p('Fórmula: m% = Al³⁺ / (SB + Al³⁺) × 100. Culturas de SAF têm tolerâncias distintas: cacau e café toleram até m% ~20%; frutíferas em geral exigem m% < 20%.', { italics: true }),
    spacer(),

    h2('1.8 Micronutrientes (Extrator Mehlich-1, mg/dm³)'),
    spacer(),
    makeTable(
      ['Nutriente', 'Baixo', 'Médio', 'Alto', 'Função Principal'],
      [
        ['Boro (B)',       '< 0,2','0,2 – 0,5','> 0,5', 'Floração, frutificação, translocação de açúcares'],
        ['Zinco (Zn)',     '< 0,5','0,5 – 1,5','> 1,5', 'Síntese de auxinas, elongação celular'],
        ['Manganês (Mn)',  '< 1,9','1,9 – 5,0','> 5,0', 'Fotossíntese, metabolismo do N'],
        ['Cobre (Cu)',     '< 0,3','0,3 – 0,8','> 0,8', 'Lignificação, defesa contra fungos'],
        ['Ferro (Fe)',     '< 9',  '9 – 18',   '> 18',  'Clorofila, transporte de elétrons'],
        ['Enxofre (S-SO₄)','< 5', '5 – 10',   '> 10',  'Síntese de proteínas, aminoácidos'],
      ],
      [1600, 1300, 1300, 1300, 3600],
    ),
    spacer(),
    p('B e Zn são os micronutrientes mais limitantes em SAFs tropicais, especialmente para café, cacau e frutíferas. Deficiências de B causam malformação de frutos (\'chumbinho\' no café, \'mazorka\' no cacau).', { italics: true }),
    pageBreak(),
  ];
}

function sectionParte2() {
  return [
    h1('PARTE 2 — CALAGEM E CORREÇÃO DE SOLO'),
    p('A calagem é o alicerce de qualquer programa de adubação. Em SAFs tropicais, a correção deve ser gradual e bem planejada para não chocar o sistema microbiano e as raízes já estabelecidas.'),
    spacer(),

    h2('2.1 Cálculo da Necessidade de Calagem (NC)'),
    h3('Método da Saturação por Bases (recomendado para solos tropicais):'),
    p('NC (t/ha) = [V2 – V1] × CTC / (PRNT × 10)'),
    p('Onde: V2 = saturação de bases desejada (%) | V1 = saturação atual (%) | CTC = capacidade de troca catiônica (cmolc/dm³) | PRNT = poder relativo de neutralização total do calcário (%)'),
    spacer(),
    p('Exemplo prático: Solo com V1 = 35%, CTC = 8 cmolc/dm³, meta V2 = 60%, calcário PRNT = 85%'),
    p('NC = (60 – 35) × 8 / (85 × 10) = 200 / 850 = 2,35 t/ha', { bold: true }),
    spacer(),

    h2('2.2 Fontes de Calcário Permitidas na Produção Orgânica'),
    spacer(),
    makeTable(
      ['Fonte', 'PRNT Típico', 'Efeito', 'Observação'],
      [
        ['Calcário Calcítico (CaCO₃)',    '80–95%',   'Eleva pH, fornece Ca',        'Indicado quando Ca < Mg ou Ca/Mg > 4'],
        ['Calcário Dolomítico (Ca+Mg)',   '80–90%',   'Eleva pH, fornece Ca e Mg',   'Mais indicado para SAFs; equilibra relação Ca:Mg'],
        ['Calcário Filler (pó fino)',     '95–100%',  'Ação mais rápida',             'Permitido em org.; aplicar com umidade'],
        ['Conchas/mariscos',             '85–95%',   'Calcário calcítico natural',   'Disponível no litoral baiano; excelente opção'],
        ['Cal hidratada [Ca(OH)₂]',      '120–135%', 'Ação muito rápida',            'Usar com cautela; pode elevar pH excessivamente'],
        ['Gesso agrícola (CaSO₄)',       '—',         'Não corrige pH; fornece Ca e S','Uso no subsolo; não substitui calagem'],
      ],
      [2300, 1500, 2000, 3300],
    ),
    spacer(),
    p('Incorporação: Quando possível, incorporar 60–90 dias antes do plantio. Em áreas já estabelecidas (SAF adulto), aplicar em superfície parcelado (½ + ½ com 6 meses de intervalo), sem incorporação.', { italics: true }),
    spacer(),

    h2('2.3 Correção com Pós de Rocha (Remineralização)'),
    p('Em sistemas orgânicos, os pós de rocha são insumos estratégicos e permitidos pela legislação. Contribuem para correção gradual e fornecimento de micronutrientes.'),
    spacer(),
    makeTable(
      ['Pó de Rocha', 'Nutrientes Principais', 'Dose Indicativa (t/ha)', 'Observação'],
      [
        ['Basalto',              'Ca, Mg, K, Si, micronutrientes','2 – 5 t/ha','Excelente para SAF; melhora estrutura do solo'],
        ['Fonolito',             'K, Si, Ca',                     '1 – 3 t/ha','Fonte de K de liberação lenta'],
        ['Granito/Granodiorito', 'K, Si, Ca, Mg',                 '2 – 4 t/ha','Ação muito lenta; melhora física do solo'],
        ['Biotita xisto',        'K, Mg',                         '2 – 4 t/ha','Boa fonte de K para solos com V% baixo'],
        ['Dunito/Serpentinito',  'Mg, Si, Ni',                    '1 – 3 t/ha','Excelente para corrigir Mg; cuidado com Ni'],
      ],
      [2000, 2200, 2200, 2700],
    ),
    pageBreak(),
  ];
}

function sectionParte3() {
  return [
    h1('PARTE 3 — FONTES ORGÂNICAS E COMPOSIÇÃO NUTRICIONAL'),
    p('A escolha das fontes orgânicas deve considerar disponibilidade regional, custo, relação C:N, velocidade de liberação de nutrientes e adequação ao estágio do SAF. Abaixo está a composição média das principais fontes utilizadas em SAFs tropicais.'),
    spacer(),

    h2('3.1 Composição Nutricional das Principais Fontes Orgânicas'),
    spacer(),
    makeTable(
      ['Fonte Orgânica', 'N (%)', 'P₂O₅ (%)', 'K₂O (%)', 'C:N', 'Observações Agronômicas'],
      [
        ['Composto orgânico maduro',          '1,0–2,5',          '0,5–2,0', '0,5–2,0', '10:1–15:1',  'Liberação lenta e equilibrada; ideal para manutenção'],
        ['Esterco bovino curtido',            '1,0–2,0',          '0,5–1,5', '0,8–1,5', '15:1–20:1',  'Mais disponível no Sudoeste da Bahia; boa para Ca e Mg'],
        ['Cama de frango curtida',            '2,5–5,0',          '1,5–3,5', '1,5–3,0', '8:1–12:1',   'Melhor fonte orgânica de N; rica em P; alto risco de salinidade em excesso'],
        ['Esterco de caprino/ovino',          '1,5–2,5',          '0,5–1,5', '1,5–2,5', '12:1–18:1',  'Boa fonte de K; frequente no Semiárido baiano'],
        ['Esterco de suíno (curtido)',         '2,0–4,0',          '1,5–3,0', '0,5–1,0', '8:1–12:1',   'Rico em N e P; atenção ao Cu acumulado'],
        ['Húmus de minhoca',                  '1,5–3,0',          '1,0–2,5', '0,5–1,5', '8:1–12:1',   'Alta atividade microbiana; promotor de crescimento'],
        ['Farinha de osso grossa',            '1,0–2,0',          '18–22',   '0,1–0,3', '4:1–6:1',    'Melhor fonte orgânica de P; liberação lenta'],
        ['Farinha de osso calcinada',         '0,5–1,0',          '28–36',   '0,1–0,2', '< 4:1',      'P mais disponível; não fornece N significativo'],
        ['Farinha de sangue',                 '10–14',            '1,0–2,0', '0,5–1,0', '3:1–5:1',    'Fonte rápida de N; usar em doses baixas (100–200 kg/ha)'],
        ['Farinha de peixe',                  '8–12',             '4–8',     '0,5–2,0', '4:1–6:1',    'N e P de alta disponibilidade; custo elevado'],
        ['Torta de mamona',                   '4–6',              '1,5–2,5', '1,0–2,0', '6:1–10:1',   'Excelente fonte de N; nematicida natural; disponível no NE'],
        ['Torta de algodão',                  '5–7',              '2,0–3,0', '1,5–2,5', '5:1–8:1',    'Rica em N; alternativa regional na Bahia'],
        ['Torta de cacau',                    '3,0–5,0',          '1,5–2,5', '2,5–4,0', '8:1–12:1',   'Subproduto local; rica em K; favorece produção de cacau'],
        ['Cascas de café (silagem/compostagem)','1,5–2,5',         '0,5–1,0', '2,5–4,5', '15:1–25:1',  'Fonte de K para cafeeiros; compost antes de usar'],
        ['Cinzas vegetais',                   '0,1–0,5',          '2,0–4,0', '4,0–12,0','< 2:1',      'K e P rapidamente disponíveis; eleva pH; usar com cautela'],
        ['Bokashi',                           '1,5–3,5',          '1,0–3,0', '1,5–3,0', '8:1–12:1',   'Inoculado com microrganismos eficientes; melhora biologia'],
        ['Biofertilizante líquido',           '0,1–0,5',          '0,05–0,2','0,3–1,0', '—',           'Ação foliar ou radicular; mais atividade microbiana que nutricional'],
        ['Adubação verde leguminosas',        '80–200 kg N/ha/ano','—',       '—',       '15:1–25:1',  'Fixação biológica de N; crotalária, mucuna, guandu recomendados'],
      ],
      [2300, 900, 1000, 900, 900, 3100],
    ),
    spacer(),

    h2('3.2 Fontes de Micronutrientes Permitidas na Produção Orgânica'),
    spacer(),
    makeTable(
      ['Fonte', 'Nutriente', 'Dose Foliar', 'Dose Solo', 'Observação'],
      [
        ['Bórax (Na₂B₄O₇)',      'B',  '0,1–0,3%',  '1–3 kg B/ha',     'Principal fonte de B; solúvel em água'],
        ['Ácido bórico (H₃BO₃)', 'B',  '0,1–0,2%',  '—',               'Mais solúvel; menor risco de fitotox.'],
        ['Sulfato de zinco (ZnSO₄)','Zn','0,3–0,5%', '3–5 kg Zn/ha',    'Permitido em sistemas em conversão'],
        ['Quelato de Zn (EDTA)',  'Zn', '0,1–0,3%',  '—',               'Disponível em ampla faixa de pH'],
        ['Sulfato de manganês',   'Mn', '0,2–0,4%',  '2–4 kg Mn/ha',    'Cuidado em solos ácidos (já elevado)'],
        ['Sulfato de cobre',      'Cu', '0,1–0,2%',  '1–3 kg Cu/ha',    'Fitotóxico em excesso; monitorar'],
        ['Molibdato de sódio',    'Mo', '0,03–0,05%','80–100 g Mo/ha',  'Crítico para fixação de N em leguminosas'],
        ['Calcário dolomítico',   'Mg', '—',          'Conforme NC',     'Principal fonte de Mg no solo'],
        ['Sulfato de magnésio',   'Mg', '0,5–1,0%',  '20–40 kg MgO/ha', 'Correção rápida de deficiência de Mg'],
      ],
      [2000, 1200, 1400, 1500, 3000],
    ),
    pageBreak(),
  ];
}

function sectionParte4() {
  return [
    h1('PARTE 4 — RECOMENDAÇÕES DE ADUBAÇÃO POR CULTURA'),
    p('As tabelas a seguir apresentam as necessidades nutricionais e doses base de adubação orgânica para cada cultura, considerando sistemas agroflorestais em solos tropicais do Sul da Bahia. As doses devem ser ajustadas conforme os resultados da análise de solo (Parte 1).'),
    spacer(),

    // Café
    h2('4.1 Café (Coffea arabica / Coffea canephora)'),
    p('O cafeeiro é uma das culturas com maior exigência em N e K. Em SAFs sombreados, a demanda é moderada pela ciclagem das árvores de serviço, mas a adubação de manutenção é sempre necessária.'),
    spacer(),
    h3('Necessidade nutricional de referência (por saca de 60 kg beneficiado):'),
    spacer(),
    makeTable(
      ['Nutriente', 'Exportação/saca', 'Vegetação/saca', 'Total/saca', 'Ref. Produtividade'],
      [
        ['N',    '2,6 kg/sc','3,6 kg/sc','6,2 kg/sc',        '20–30 sc/ha (SAF)'],
        ['P₂O₅','0,23 kg/sc','0,38 kg/sc','0,61 kg/sc',      '20–30 sc/ha (SAF)'],
        ['K₂O', '3,0 kg/sc','2,9 kg/sc','5,9 kg/sc',         '20–30 sc/ha (SAF)'],
        ['Ca',  '0,8 kg/sc','—',        '~1,0 kg/sc',        'Variável com calagem'],
        ['Mg',  '0,4 kg/sc','—',        '~0,6 kg/sc',        'Variável com solo'],
        ['B',   '—',         '—',        '80–100 g/sc',       'Crítico para frutificação'],
        ['Zn',  '—',         '—',        '50–80 g/sc',        'Crítico para desenvolvimento'],
      ],
      [1800, 1800, 1800, 1800, 1900],
    ),
    spacer(),
    h3('Doses base de adubo orgânico (implantação — por cova):'),
    spacer(),
    makeTable(
      ['Teor MO Solo', 'Composto/Esterco Curtido', 'Farinha de Osso', 'Cinzas/Fonte K'],
      [
        ['Muito Baixo (< 1%)', '10–15 L/cova (3–5 kg)',   '200–300 g/cova','100–150 g/cova'],
        ['Baixo (1–2%)',       '8–12 L/cova (2,5–4 kg)', '150–200 g/cova','80–120 g/cova'],
        ['Médio (2–4%)',       '5–8 L/cova (1,5–2,5 kg)','100–150 g/cova','50–80 g/cova'],
        ['Alto (> 4%)',        '3–5 L/cova (1–1,5 kg)',  '50–100 g/cova', '30–50 g/cova'],
      ],
      [2200, 2600, 2200, 2100],
    ),
    spacer(),
    h3('Adubação de manutenção anual (por hectare — café em produção):'),
    spacer(),
    makeTable(
      ['Fonte', 'Dose Baixa Produtividade (< 20 sc/ha)', 'Dose Média (20–30 sc/ha)', 'Dose Alta (> 30 sc/ha)'],
      [
        ['Cama de frango (2,5% N)',       '800–1.000 kg/ha',  '1.200–1.500 kg/ha','1.500–2.000 kg/ha'],
        ['Esterco bovino curtido (1,5% N)','1.500–2.000 kg/ha','2.500–3.000 kg/ha','3.000–4.000 kg/ha'],
        ['Composto orgânico (1,8% N)',    '1.200–1.500 kg/ha','2.000–2.500 kg/ha','2.500–3.500 kg/ha'],
        ['Torta de mamona (4,5% N)',      '300–400 kg/ha',    '500–700 kg/ha',    '700–900 kg/ha'],
        ['Farinha de osso (20% P₂O₅)',   '150–200 kg/ha',    '200–300 kg/ha',    '300–400 kg/ha'],
        ['Cinzas (8% K₂O)',              '100–150 kg/ha',    '150–250 kg/ha',    '250–350 kg/ha'],
      ],
      [2400, 2300, 2300, 2100],
    ),
    spacer(),
    p('Parcelamento: 3–4 aplicações no período chuvoso (Out–Mar). 1ª aplicação em Out/Nov com cama de frango; 2ª em Dez/Jan com composto + farinha de osso; 3ª em Mar/Abr com torta ou composto. Aplicar sob a copa, 20–30 cm do caule.', { italics: true }),
    spacer(),

    // Cacau
    h2('4.2 Cacau (Theobroma cacao L.)'),
    p('O cacaueiro é naturalmente adaptado ao sistema agroflorestal sombreado. Suas raízes superficiais se beneficiam enormemente da cobertura morta e da matéria orgânica incorporada pelas árvores de sombra.'),
    spacer(),
    makeTable(
      ['Nutriente', 'Exportação por t de amêndoa seca', 'Necessidade anual (500 kg/ha produção)', 'Prioridade'],
      [
        ['N',    '25–30 kg/t','12,5–15 kg/ha','Alta'],
        ['P₂O₅','6–8 kg/t',  '3–4 kg/ha',   'Média (solo ácido fixa P)'],
        ['K₂O', '15–20 kg/t','7,5–10 kg/ha', 'Alta'],
        ['Ca',  '8–10 kg/t', '4–5 kg/ha',   'Média (calagem supre)'],
        ['Mg',  '3–5 kg/t',  '1,5–2,5 kg/ha','Média'],
        ['B',   '—',          '100–150 g/ha', 'Crítico (vassoura-de-bruxa)'],
        ['Zn',  '—',          '200–300 g/ha', 'Alta'],
      ],
      [2500, 2800, 2500, 1300],
    ),
    spacer(),
    h3('Adubação anual de manutenção em SAF cacaueiro:'),
    spacer(),
    makeTable(
      ['Insumo', 'Dose Cacau Jovem (1–3 anos)', 'Dose Cacau Adulto (> 3 anos)'],
      [
        ['Composto orgânico/esterco',  '5–8 kg/planta (2–3x/ano)', '8–15 kg/planta/ano'],
        ['Cama de frango (se disponível)','500–800 kg/ha',           '800–1.200 kg/ha'],
        ['Torta de cacau (subproduto)', '300–500 kg/ha',             '500–800 kg/ha'],
        ['Farinha de osso',            '100–150 g/planta',           '150–250 g/planta'],
        ['Cobertura morta (casca de cacau)','3–5 kg/planta',         '5–8 kg/planta'],
        ['B (bórax foliar)',            '0,2% (2x/ano)',             '0,2% (3–4x/ano)'],
      ],
      [3000, 2800, 3300],
    ),
    spacer(),
    p('Local de aplicação: preferencialmente sob a copa, na zona de maior concentração de raízes absorventes (50–100 cm do tronco). Evitar aplicação no período seco sem irrigação. A casca de cacau como cobertura morta é o insumo mais estratégico — disponível localmente e com alto potencial de ciclagem.', { italics: true }),
    spacer(),

    // Citros
    h2('4.3 Citros (Citrus spp. — Laranja, Lima, Limão, Tangerina, Pomelo)'),
    p('Os citros têm alta demanda por N e K. Em sistemas orgânicos, a regularidade da adubação é mais importante do que doses altas esporádicas.'),
    spacer(),
    makeTable(
      ['Nutriente', 'Necessidade Anual por Planta (adulta)', 'Necessidade por ha (300–400 pl/ha)', 'Fonte Orgânica Preferencial'],
      [
        ['N',    '150–250 g N/planta/ano', '50–100 kg N/ha/ano',   'Cama de frango, torta de mamona, composto'],
        ['P₂O₅','40–80 g/planta/ano',     '15–30 kg P₂O₅/ha/ano', 'Farinha de osso, fosfato natural'],
        ['K₂O', '120–200 g/planta/ano',   '40–80 kg K₂O/ha/ano',  'Cinzas, cascas de café, fonolito'],
        ['Ca',  'Suprir com calagem',      'V% 60–70%',            'Calcário dolomítico'],
        ['Mg',  '30–60 g/planta/ano',     '10–25 kg MgO/ha/ano',  'Calcário dolomítico, sulfato de Mg'],
        ['B',   '2–4 g/planta/ano',       '0,5–1,5 kg B/ha/ano',  'Bórax foliar (0,2–0,3%)'],
        ['Zn',  '3–6 g/planta/ano',       '1–2 kg Zn/ha/ano',     'Sulfato de zinco foliar ou no solo'],
      ],
      [2200, 2400, 2400, 2100],
    ),
    spacer(),
    h3('Tradução em insumos orgânicos por hectare/ano (produção média 20–30 t/ha):'),
    spacer(),
    makeTable(
      ['Insumo', 'Dose', 'N Fornecido', 'Observação'],
      [
        ['Cama de frango (3% N)',       '1.500–2.000 kg/ha','45–60 kg N', 'Principal fonte; dividir em 3 aplicações'],
        ['Composto orgânico (2% N)',    '2.000–3.000 kg/ha','40–60 kg N', 'Complementar; melhora estrutura do solo'],
        ['Farinha de osso (20% P₂O₅)', '150–200 kg/ha',    '—',          'Aplicar na cova na implantação e anualmente'],
        ['Cinzas vegetais (8% K₂O)',   '200–300 kg/ha',    '—',          'Aplicar em cobertura; atenção ao pH'],
        ['Torta de mamona (4,5% N)',    '300–500 kg/ha',    '13–22 kg N', 'Nematicida; ótimo para reformas de pomares'],
      ],
      [2600, 1800, 1800, 2900],
    ),
    spacer(),

    // Manga
    h2('4.4 Manga (Mangifera indica L.)'),
    p('A mangueira é tolerante a solos pobres, mas responde bem à adubação orgânica para produtividade e qualidade dos frutos. É exigente em Ca e B durante a frutificação.'),
    spacer(),
    makeTable(
      ['Fase', 'Fonte Orgânica', 'Dose por Planta', 'Frequência'],
      [
        ['Implantação (cova)',   'Composto/esterco curtido',    '20–30 L / 8–12 kg',  'Única na implantação'],
        ['Implantação (cova)',   'Farinha de osso',             '300–500 g',           'Única na implantação'],
        ['1º ano',              'Esterco bovino/composto',     '5–8 kg/planta',       '3–4 vezes no período chuvoso'],
        ['2º–3º ano',           'Composto + cama frango',      '8–15 kg/planta',      '2–3 vezes/ano'],
        ['Produção (> 4 anos)', 'Cama de frango',              '10–20 kg/planta/ano', 'Dividir pré-floração e pós-colheita'],
        ['Produção',            'Farinha de osso',             '200–300 g/planta/ano','Aplicar 60 dias antes da floração'],
        ['Foliar (pré-floração)','B (bórax 0,2%)',             '3–4 pulverizações',   'Início da diferenciação floral'],
        ['Foliar (frutos)',      'Zn (ZnSO₄ 0,3%)',            '2–3 pulverizações',   'Durante enchimento dos frutos'],
      ],
      [2300, 2300, 2300, 2200],
    ),
    spacer(),
    p('Mangueiras em SAF com sombreamento parcial reduzem a demanda hídrica e nutricional em ~20–30% em relação ao cultivo solteiro. O estresse hídrico controlado (déficit de 60–90 dias) induz floração — momento crítico para aplicação de B foliar.', { italics: true }),
    spacer(),

    // Abacate
    h2('4.5 Abacate (Persea americana Mill.)'),
    p('O abacateiro é altamente sensível ao encharcamento e à salinidade. Prefere solos bem drenados, pH 5,0–6,0, com boa matéria orgânica. Muito responsivo ao aporte de K e B.'),
    spacer(),
    makeTable(
      ['Nutriente', 'Necessidade Anual (planta adulta 100 kg fruto)', 'Fonte Preferencial', 'Observação Especial'],
      [
        ['N',    '150–250 g N/planta',       'Composto, torta de mamona', 'Excesso de N retarda frutificação'],
        ['P₂O₅','50–100 g/planta',           'Farinha de osso',           'Fixado em solos ácidos; aplicar na cova'],
        ['K₂O', '200–350 g/planta',          'Cinzas, fonolito',          'Muito exigente; K melhora qualidade do fruto'],
        ['Ca',  'Calagem para V% 55–65%',    'Calcário dolomítico',       'Deficiência causa podridão apical'],
        ['Mg',  '40–80 g/planta',            'Calcário dolomítico',       'Relação Ca:Mg ideal 3:1 a 4:1'],
        ['B',   '2–4 g/planta',              'Bórax foliar 0,2%',         'Crítico para pegamento dos frutos'],
        ['Zn',  '3–5 g/planta',              'ZnSO₄ foliar ou solo',      'Deficiência causa \'nariz de borracha\''],
      ],
      [2300, 2300, 2300, 2200],
    ),
    spacer(),
    h3('Adubação de manutenção (ha/ano — 100–150 plantas/ha):'),
    spacer(),
    makeTable(
      ['Insumo', 'Dose/ha/ano', 'N Eq.', 'Observações'],
      [
        ['Composto maduro (2% N)',    '3.000–5.000 kg','60–100 kg N','Base do programa; 2 aplicações/ano'],
        ['Torta de mamona (4,5% N)',  '200–400 kg',    '9–18 kg N',  'Pré-floração; nematicida'],
        ['Farinha de osso (20% P₂O₅)','100–200 kg',   '—',          'Na cova e cobertura anual'],
        ['Cinzas (8% K₂O)',          '200–400 kg',    '—',          'Não elevar pH > 6,0'],
        ['Bokashi (2,5% N)',          '500–800 kg',    '12–20 kg N', 'Estimula microbiota; aplicar 4x/ano'],
      ],
      [2500, 1800, 1200, 3600],
    ),
    spacer(),

    // Frutíferas diversas
    h2('4.6 Outras Frutíferas Tropicais em SAF'),
    p('Parâmetros gerais para frutíferas tropicais diversas (banana, maracujá, pupunha, açaí, jaca, graviola, jabuticaba, fruta-do-conde, cupuaçu, etc.) frequentemente componentes de SAFs multiestratificados.'),
    spacer(),
    makeTable(
      ['Cultura', 'N kg/ha/ano', 'P₂O₅ kg/ha/ano', 'K₂O kg/ha/ano', 'pH Ideal (CaCl₂)', 'Observação-chave SAF'],
      [
        ['Banana',        '100–200','30–60', '150–300','5,5–6,5','K mais exigente de todas; essencial para frutos de qualidade'],
        ['Maracujá',      '80–150', '40–80', '80–150', '5,5–6,5','Ciclo curto; adubação parcelada mensal no plantio'],
        ['Pupunha',       '60–100', '20–40', '60–120', '5,0–6,0','Nativa; responde bem a composto; excelente p/ sombreamento'],
        ['Açaí',          '40–80',  '15–30', '40–80',  '4,5–5,5','Adaptado a solos úmidos; tolera Al; baixa exigência'],
        ['Cupuaçu',       '60–120', '20–40', '60–100', '5,0–6,0','Planta de sombra; ciclagem eficiente no SAF'],
        ['Graviola/Atemóia','60–120','20–50','80–150', '5,5–6,5','Muito exigente em B; floração influenciada por K'],
        ['Jabuticaba',    '40–80',  '20–40', '50–80',  '5,0–5,5','Crescimento lento; composto bem maturado preferencial'],
        ['Urucum (colorau)','40–80','15–30', '30–60',  '4,5–6,0','Tolerante; excelente cobertura e dossel intermediário SAF'],
        ['Pimenta-do-reino','80–150','30–60','80–150', '5,5–6,5','Exigente em N; sensível ao excesso de Al; boa para renda'],
      ],
      [1800, 1200, 1300, 1300, 1400, 3100],
    ),
    pageBreak(),
  ];
}

function sectionParte5() {
  return [
    h1('PARTE 5 — MANEJO DE ADUBAÇÃO ESPECÍFICO PARA SAF'),
    spacer(),

    h2('5.1 Cobertura do Solo e seu Impacto na Adubação'),
    p('O estado da cobertura do solo é determinante para a eficiência da adubação orgânica. O sistema solicita ao cliente esta informação porque ela modifica significativamente as recomendações.'),
    spacer(),
    makeTable(
      ['Condição de Cobertura', 'Impacto na Fertilidade', 'Ajuste na Adubação'],
      [
        ['Solo descoberto (sem cobertura)',   'Alta perda de MO; lixiviação intensa; baixa atividade microbiana',          'Aumentar doses em 20–30%; priorizar cobertura morta como 1ª ação'],
        ['Cobertura esparsa (< 30%)',         'Perda moderada; solo ainda vulnerável',                                    'Aumentar doses em 10–15%; incluir adubação verde recomendada'],
        ['Cobertura moderada (30–70%)',       'Situação intermediária; solo em processo de recuperação',                   'Doses padrão conforme tabelas'],
        ['Boa cobertura (70–90%)',            'Retenção de umidade; atividade microbiana elevada; ciclo de N otimizado',   'Reduzir doses em 10–15%; aproveitar ciclagem'],
        ['Excelente cobertura (> 90%)',       'Solo em plena ciclagem; SAF bem desenvolvido',                              'Reduzir doses em 20–30%; monitorar por análise foliar'],
      ],
      [2200, 3000, 3900],
    ),
    spacer(),

    h2('5.2 Estrato do SAF e Sinergia de Adubação'),
    p('Em SAFs bem estruturados, espécies de diferentes estratos contribuem diferentemente para a fertilidade. A recomendação deve considerar esse capital ecológico.'),
    spacer(),
    makeTable(
      ['Estrato / Componente', 'Contribuição para Fertilidade', 'Implicação na Recomendação'],
      [
        ['Árvores madeireiras (emergente)',              'Bombeamento de nutrientes das camadas profundas',              'Reduz necessidade de P e K em 10–15% em SAFs > 5 anos'],
        ['Leguminosas arbóreas (serviço)',              'Fixação de N: 50–200 kg N/ha/ano dependendo da espécie',       'Reduzir N em 30–60% conforme densidade de leguminosas'],
        ['Bananeiras (pioneiro/suporte)',               'Aporte rápido de MO e K pela palha e palhiço',                'Dispensar adubação potássica se > 400 bananeiras/ha'],
        ['Espécies adensadoras de MO (ingá, leucena, gliricidia)','Podas frequentes: 3–8 t MO seca/ha/ano',          'Reduzir composto em 20–40% por poda manejada'],
        ['Culturas anuais intercalares',                'Consomem N do solo; mas sua palhada retorna',                  'Considerar exportação de 30–50 kg N/ha pelo grão'],
      ],
      [2500, 3000, 3600],
    ),
    spacer(),

    h2('5.3 Adubação Verde Recomendada para SAFs Tropicais'),
    spacer(),
    makeTable(
      ['Espécie', 'Tipo', 'N Fixado/Fornecido', 'Biomassa (t/ha)', 'Uso em SAF'],
      [
        ['Crotalária juncea (C. juncea)',    'Leguminosa anual',   '100–180 kg N/ha',       '6–10 t/ha',        'Entressafra; nematicida; roçar antes de floração'],
        ['Crotalária spectabilis',           'Leguminosa anual',   '80–150 kg N/ha',        '4–8 t/ha',         'Nematicida mais eficiente; não lapidar animais próximos'],
        ['Mucuna preta (M. pruriens)',       'Leguminosa anual',   '120–200 kg N/ha',       '8–12 t/ha',        'Excelente cobertura; abafa plantas daninhas'],
        ['Feijão guandu (Cajanus cajan)',    'Leguminosa perene',  '80–140 kg N/ha',        '5–8 t/ha',         'Perene; raiz profunda; ideal como componente do SAF'],
        ['Gliricidia (G. sepium)',           'Árvore leguminosa',  '50–100 kg N/ha/ano',    '4–8 t poda/ha/ano','Permanente no SAF; banco de proteína e fertilizante'],
        ['Leucena (L. leucocephala)',        'Árvore leguminosa',  '80–150 kg N/ha/ano',    '6–12 t poda/ha/ano','Tolerante à seca; xerocobertura; atenção à alelopatia'],
        ['Feijão de porco (C. ensiformis)', 'Leguminosa anual',   '70–130 kg N/ha',        '4–7 t/ha',         'Resistente à seca; boa no Sul da Bahia'],
        ['Amendoim forrageiro (A. pintoi)', 'Leguminosa perene',  '40–80 kg N/ha/ano',     '3–5 t/ha/ano',     'Cobertura viva permanente; excelente para caminhos do SAF'],
      ],
      [2300, 1600, 1700, 1600, 2900],
    ),
    pageBreak(),
  ];
}

function sectionParte6() {
  return [
    h1('PARTE 6 — CRITÉRIOS PARA O SISTEMA DE RECOMENDAÇÃO AUTOMATIZADA'),
    p('Esta seção define as regras lógicas que o sistema de IA deve seguir ao gerar o rascunho de recomendação. O agrônomo revisor deve verificar se estas regras foram aplicadas corretamente.'),
    spacer(),

    h2('6.1 Hierarquia de Decisão'),
    spacer(),
    makeTable(
      ['Prioridade', 'Parâmetro', 'Ação Obrigatória se Fora do Ideal'],
      [
        ['1ª (Urgente)',      'pH muito ácido (< 4,5) ou Al³⁺ alto (> 1,0)', 'CALAGEM CORRETIVA antes de qualquer adubação. Informar cliente.'],
        ['2ª (Alta)',         'MO muito baixa (< 1,5%)',                      'Priorizar cobertura morta e composto/esterco na recomendação.'],
        ['3ª (Alta)',         'V% muito baixo (< 40%)',                        'Recomendar calagem corretiva + aguardar 60–90 dias antes de adubação NPK'],
        ['4ª (Média)',        'P muito baixo + solo argiloso',                'Aumentar dose de P e recomendar fosfato natural + composto na cova'],
        ['5ª (Média)',        'K baixo + cultura exigente (café, citros, manga)','Priorizar fontes de K na mistura (cinzas, fonolito, cascas de café)'],
        ['6ª (Padrão)',       'Parâmetros médios',                            'Seguir tabelas da Parte 4 com ajuste por cultura e cobertura'],
        ['7ª (Monitoramento)','Micronutrientes baixos',                       'Incluir recomendação foliar de B e/ou Zn; agendar nova análise'],
      ],
      [1400, 2300, 5400],
    ),
    spacer(),

    h2('6.2 Ajuste por Cobertura do Solo (modificadores)'),
    spacer(),
    makeTable(
      ['Condição Cobertura', 'Modificador N', 'Modificador P', 'Modificador K'],
      [
        ['Solo descoberto',    '+25%', '+20%', '+20%'],
        ['Cobertura esparsa',  '+15%', '+10%', '+10%'],
        ['Cobertura moderada', '0%',   '0%',   '0%'],
        ['Boa cobertura',      '–10%', '0%',   '–10%'],
        ['Excelente cobertura','–25%', '0%',   '–15%'],
      ],
      [2500, 1700, 1700, 1700],
    ),
    spacer(),

    h2('6.3 Estrutura Mínima do Laudo de Recomendação'),
    p('Todo documento de saída deve conter obrigatoriamente:'),
    spacer(),
    bullet('Identificação da propriedade e do talhão'),
    bullet('Resumo interpretativo dos parâmetros da análise de solo (destaque para os pontos críticos)'),
    bullet('Recomendação de calagem (se necessária) com dose e fonte'),
    bullet('Programa de adubação orgânica: fontes, doses, épocas de aplicação e local de aplicação'),
    bullet('Recomendação de adubação foliar para micronutrientes (se necessário)'),
    bullet('Recomendações de adubação verde/cobertura do solo'),
    bullet('Prazo recomendado para nova análise de solo (geralmente 2–3 anos)'),
    bullet('Assinatura e número CREA/CFBio do agrônomo responsável'),
    spacer(),

    h2('6.4 Alertas Obrigatórios do Sistema'),
    p('O sistema deve emitir alerta destacado nos seguintes casos:'),
    spacer(),
    makeTable(
      ['Condição', 'Tipo de Alerta', 'Texto Padrão no Relatório'],
      [
        ['Al³⁺ > 1,0 cmolc/dm³ e m% > 50%',     'CRÍTICO', '⚠️ TOXIDEZ DE ALUMÍNIO SEVERA — Corrigir antes de qualquer plantio ou adubação.'],
        ['pH < 4,0',                              'CRÍTICO', '⚠️ pH EXTREMAMENTE ÁCIDO — Aplicar calcário com urgência; avaliar replantio.'],
        ['MO < 1,0%',                             'ATENÇÃO', '⚠️ MATÉRIA ORGÂNICA MUITO BAIXA — Priorizar cobertura morta e composto.'],
        ['V% < 30%',                              'ATENÇÃO', '⚠️ SOLO ALTAMENTE DISTRÓFICO — Calcagem corretiva indispensável.'],
        ['B < 0,1 mg/dm³ + Cultura frutífera',   'ATENÇÃO', '⚠️ BORO CRÍTICO — Frutificação comprometida. Adubação foliar urgente.'],
        ['Relação Ca:Mg < 1 ou > 8',              'ATENÇÃO', '⚠️ DESEQUILÍBRIO Ca:Mg — Pode comprometer absorção mesmo com teores adequados.'],
      ],
      [2500, 1200, 5400],
    ),
    pageBreak(),
  ];
}

function sectionParte7() {
  return [
    h1('PARTE 7 — REFERÊNCIAS TÉCNICAS E BIBLIOGRÁFICAS'),
    p('Esta base de dados foi construída a partir das seguintes referências principais:'),
    spacer(),
    bullet('EMBRAPA Mandioca e Fruticultura. Recomendações de Calagem e Adubação para Abacaxi, Acerola, Banana, Citros, Mamão, Mandioca, Manga e Maracujá. Cruz das Almas, BA: Embrapa, 2ª ed., 2023.'),
    bullet('EMBRAPA. Manual de Adubação e Calagem para o Estado da Bahia. Salvador: SEAGRI/Embrapa, 2ª ed.'),
    bullet('CEPLAC — Comissão Executiva do Plano da Lavoura Cacaueira. Manejo do solo e adubação em cacaueiros. Ilhéus, BA.'),
    bullet('RIBEIRO, A.C.; GUIMARÃES, P.T.G.; ALVAREZ V., V.H. (Eds.). Recomendação para o uso de corretivos e fertilizantes em Minas Gerais — 5ª Aproximação. Viçosa, MG: CFSEMG, 1999.'),
    bullet('INCAPER. Guia de Interpretação de Análise de Solo e Foliar. Vitória: INCAPER, 2010.'),
    bullet('IAC — Instituto Agronômico de Campinas. Recomendações de adubação e calagem para o Estado de São Paulo. Boletim Técnico 100, 2ª ed., 1996.'),
    bullet('EMBRAPA Agrobiologia. Adubação orgânica em sistemas agroflorestais. Seropédica, RJ: Embrapa, 2002.'),
    bullet('SALGADO, B.G. et al. Avaliação da fertilidade dos solos de sistemas agroflorestais com cafeeiro. Revista Árvore, Viçosa, 2006 (SciELO).'),
    bullet('EMBRAPA Infoteca. Adubação orgânica do cafeeiro. Doc. 17432. 2020.'),
    bullet('EMBRAPA Circular Técnica. Adubação no sistema orgânico de produção de hortaliças. Brasília, 2004.'),
    bullet('BRASIL. Lei nº 10.831/2003 — Lei da Agricultura Orgânica. Instrução Normativa MAPA nº 46/2011 — Regulamento Técnico.'),
    spacer(),
    divider(),
    spacer(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [run('Agrosintropia — Consultoria em Sistemas Agroflorestais', { size: THEME.size.small, color: THEME.color.mid, italics: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [run('Serra Grande, Uruçuca — Bahia, Brasil | agrosintropia.com.br', { size: THEME.size.small, color: THEME.color.pale })],
    }),
  ];
}

// ── Header e Footer ───────────────────────────────────────────────────────────

function makeHeader() {
  return new Header({
    children: [
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: THEME.color.mid, space: 1 } },
        spacing: { after: 80 },
        children: [
          run('AGROSINTROPIA', { bold: true, size: THEME.size.small, color: THEME.color.mid }),
          run('   |   Base Técnica de Referência — Adubação Orgânica em SAFs', { size: THEME.size.small, color: THEME.color.gray }),
        ],
      }),
    ],
  });
}

function makeFooter() {
  return new Footer({
    children: [
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 2, color: THEME.color.border, space: 1 } },
        spacing: { before: 80 },
        alignment: AlignmentType.RIGHT,
        children: [
          run('Página ', { size: THEME.size.small, color: THEME.color.gray }),
          new TextRun({ children: [PageNumber.CURRENT], size: THEME.size.small, font: THEME.font, color: THEME.color.gray }),
          run(' de ', { size: THEME.size.small, color: THEME.color.gray }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: THEME.size.small, font: THEME.font, color: THEME.color.gray }),
        ],
      }),
    ],
  });
}

// ── Montagem do documento ─────────────────────────────────────────────────────

function buildDocument() {
  return new Document({
    styles: {
      default: { document: { run: { font: THEME.font, size: THEME.size.body } } },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: THEME.size.h1, bold: true, font: THEME.font, color: THEME.color.dark },
          paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: THEME.size.h2, bold: true, font: THEME.font, color: THEME.color.mid },
          paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1 },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [{
            level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 540, hanging: 360 } } },
          }],
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
        },
      },
      headers: { default: makeHeader() },
      footers: { default: makeFooter() },
      children: [
        ...sectionCover(),
        ...sectionNota(),
        ...sectionParte1(),
        ...sectionParte2(),
        ...sectionParte3(),
        ...sectionParte4(),
        ...sectionParte5(),
        ...sectionParte6(),
        ...sectionParte7(),
      ],
    }],
  });
}

// ── Geração do arquivo ────────────────────────────────────────────────────────

const outputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, 'base_tecnica_adubacao_agrosintropia.docx');

Packer.toBuffer(buildDocument())
  .then(buffer => {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, buffer);
    console.log(`Documento gerado: ${outputPath}`);
  })
  .catch(err => {
    console.error('Erro ao gerar documento:', err.message);
    process.exit(1);
  });
