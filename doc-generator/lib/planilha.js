'use strict';

const ExcelJS = require('exceljs');

// ── Agrosintropia brand colors ─────────────────────────────────────────────
const C = {
  VERDE_ESCURO: '1B4332',
  VERDE_MID:    '2D6A4F',
  VERDE_LIGHT:  '52B788',
  VERDE_BG:     'D8F3DC',
  VERDE_ROW:    'B7E4C7',
  AMARELO:      'FFF3CD',
  VERMELHO:     'F8D7DA',
  BRANCO:       'FFFFFF',
  CINZA:        'F8F9FA',
};

// ── Fixed insumos with doses and calculation formulas ─────────────────────
// broadcast = (linear × 4) + m2     (total area in m²)
// linear    = metros lineares de plantio
// m2        = m² de canteiros (entrelinha)
// plantas   = linear / 0.5  (1 muda a cada 0,5 m)

const INSUMOS = [
  {
    nome:         'Calcário',
    dose:         34,          // g / m² broadcast
    area:         'broadcast',
    emb_kg:       20,
    emb_texto:    'sacos de 20 kg',
    condicional:  'calagem',   // omit if calagem not needed
  },
  {
    nome:         'Gesso Agrícola',
    dose:         240,         // g / m linear
    area:         'linear',
    emb_kg:       50,
    emb_texto:    'sacos de 50 kg',
  },
  {
    nome:         'Yoorin Master (termofosfato)',
    dose:         250,         // g / m linear
    area:         'linear',
    emb_kg:       40,
    emb_texto:    'sacos de 40 kg',
  },
  {
    nome:         'Agrolito',
    dose:         150,         // g / m² broadcast
    area:         'broadcast',
    emb_kg:       1000,
    emb_texto:    'tonelada(s)',
  },
  {
    nome:         'Cama de frango (entrelinha)',
    dose:         1150,        // g / m² canteiro
    area:         'm2',
    emb_kg:       1000,
    emb_texto:    'tonelada(s)',
  },
  {
    nome:         'Cama de frango (linha)',
    dose:         2900,        // g / m linear
    area:         'linear',
    emb_kg:       1000,
    emb_texto:    'tonelada(s)',
  },
  {
    nome:         'Hidrogel biodegradável (muda)',
    dose:         5,           // g / planta (1 planta a cada 0,5 m)
    area:         'plantas',
    emb_kg:       2,
    emb_texto:    'sacos de 2 kg',
  },
];

function calcKg(ins, linear, m2) {
  const broadcast = linear * 4 + m2;
  const plantas   = linear / 0.5;
  let g = 0;
  if (ins.area === 'broadcast') g = ins.dose * broadcast;
  else if (ins.area === 'linear')  g = ins.dose * linear;
  else if (ins.area === 'm2')      g = ins.dose * m2;
  else if (ins.area === 'plantas') g = ins.dose * plantas;
  return parseFloat((g / 1000).toFixed(1));
}

function formatDoseUnit(area) {
  if (area === 'broadcast') return 'm²';
  if (area === 'linear')    return 'm linear';
  if (area === 'm2')        return 'm² canteiro';
  return 'planta';
}

function formatEmbalagem(kg, emb_kg, emb_texto) {
  if (emb_texto === 'tonelada(s)') {
    const tons = (kg / 1000).toFixed(2).replace('.', ',');
    return `${parseFloat((kg / 1000).toFixed(2)).toLocaleString('pt-BR')} t`;
  }
  const n = Math.ceil(kg / emb_kg);
  return `${n} ${emb_texto}`;
}

function cellFill(argb) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function headerFont(white = true) {
  return { bold: true, size: 10, color: { argb: white ? 'FF' + C.BRANCO : 'FF' + C.VERDE_ESCURO } };
}

// ── Sheet 1: Quantitativo de Insumos ──────────────────────────────────────
function buildSheet1(wb, result, data) {
  const ws = wb.addWorksheet('Quantitativo de Insumos', {
    properties: { tabColor: { argb: 'FF2D6A4F' } },
    pageSetup:  { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  ws.getColumn(1).width = 38;
  ws.getColumn(2).width = 18;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 26;

  const linear = parseFloat(data.projeto?.linear)  || 0;
  const m2     = parseFloat(data.projeto?.area_m2) || 0;
  const nome   = data.projeto?.nome || data.propriedade || 'Projeto';

  let row = 1;

  // Title row
  const hdr = ws.getRow(row++);
  ws.mergeCells(`A1:D1`);
  hdr.getCell(1).value     = 'AGROSINTROPIA — PLANO DE ADUBAÇÃO ORGÂNICA';
  hdr.getCell(1).font      = { bold: true, size: 14, color: { argb: 'FF' + C.BRANCO } };
  hdr.getCell(1).fill      = cellFill('FF' + C.VERDE_ESCURO);
  hdr.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  hdr.height = 30;

  // Project subtitle
  ws.mergeCells(`A2:D2`);
  const sub = ws.getRow(row++);
  sub.getCell(1).value     = `Projeto: ${nome}`;
  sub.getCell(1).font      = { bold: true, size: 11, color: { argb: 'FF' + C.BRANCO } };
  sub.getCell(1).fill      = cellFill('FF' + C.VERDE_MID);
  sub.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  sub.height = 22;

  // Dimensions info
  ws.mergeCells(`A3:D3`);
  const info = ws.getRow(row++);
  const total = linear * 4 + m2;
  info.getCell(1).value     = `${linear.toLocaleString('pt-BR')} metros lineares  •  ${m2.toLocaleString('pt-BR')} m² de canteiros  •  Área total aprox.: ${total.toLocaleString('pt-BR')} m²`;
  info.getCell(1).font      = { italic: true, size: 10, color: { argb: 'FF444444' } };
  info.getCell(1).fill      = cellFill('FF' + C.VERDE_BG);
  info.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  info.height = 18;

  row++; // blank

  // Column headers
  ws.mergeCells(`A4:D4`); // already merged — skip, re-do
  const th = ws.getRow(row++);
  ['Insumo', 'Dose', 'Total (kg)', 'Embalagem'].forEach((label, i) => {
    const cell = th.getCell(i + 1);
    cell.value     = label;
    cell.font      = headerFont();
    cell.fill      = cellFill('FF' + C.VERDE_ESCURO);
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border    = { bottom: { style: 'medium', color: { argb: 'FF' + C.VERDE_LIGHT } } };
  });
  th.height = 20;

  // Insumo rows
  let odd = true;
  for (const ins of INSUMOS) {
    if (ins.condicional === 'calagem' && !result.calagem?.necessaria) continue;

    const kg  = calcKg(ins, linear, m2);
    const emb = formatEmbalagem(kg, ins.emb_kg, ins.emb_texto);
    const bg  = 'FF' + (odd ? C.CINZA : C.BRANCO);
    odd = !odd;

    const r = ws.getRow(row++);
    r.getCell(1).value = ins.nome;
    r.getCell(2).value = `${ins.dose} g / ${formatDoseUnit(ins.area)}`;
    r.getCell(3).value = kg;
    r.getCell(4).value = emb;

    for (let i = 1; i <= 4; i++) {
      r.getCell(i).fill      = cellFill(bg);
      r.getCell(i).font      = { size: 10 };
      r.getCell(i).alignment = { horizontal: i === 1 ? 'left' : 'center', vertical: 'middle' };
      r.getCell(i).border    = { bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } } };
    }
    r.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    r.getCell(3).numFmt = '#,##0.0';
    r.height = 17;
  }

  row++; // blank

  // Footer note
  ws.mergeCells(`A${row}:D${row}`);
  const note = ws.getRow(row++);
  note.getCell(1).value     = 'O plano de adubação foi elaborado com base nos resultados da análise de solo, visando otimizar a relação custo-benefício para o projeto de reflorestamento, garantindo a máxima eficácia com o menor investimento possível.';
  note.getCell(1).font      = { italic: true, size: 9, color: { argb: 'FF555555' } };
  note.getCell(1).fill      = cellFill('FF' + C.VERDE_BG);
  note.getCell(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  note.height = 38;
}

// ── Sheet 2: Interpretação do Solo ────────────────────────────────────────
function buildSheet2(wb, result, data) {
  const ws = wb.addWorksheet('Interpretação do Solo', {
    properties: { tabColor: { argb: 'FF1B4332' } },
    pageSetup:  { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  ws.getColumn(1).width = 24;
  ws.getColumn(2).width = 14;
  ws.getColumn(3).width = 22;
  ws.getColumn(4).width = 44;

  let row = 1;

  // Title
  ws.mergeCells('A1:D1');
  const hdr = ws.getRow(row++);
  hdr.getCell(1).value     = 'AGROSINTROPIA — INTERPRETAÇÃO DA ANÁLISE DE SOLO';
  hdr.getCell(1).font      = { bold: true, size: 13, color: { argb: 'FF' + C.BRANCO } };
  hdr.getCell(1).fill      = cellFill('FF' + C.VERDE_ESCURO);
  hdr.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  hdr.height = 28;

  // Client / property info
  ws.mergeCells('A2:D2');
  const sub = ws.getRow(row++);
  const parts = [data.cliente, data.propriedade, data.municipio, data.talhao, data.dataAnalise].filter(Boolean);
  sub.getCell(1).value     = parts.join('  |  ');
  sub.getCell(1).font      = { size: 10, color: { argb: 'FF' + C.BRANCO } };
  sub.getCell(1).fill      = cellFill('FF' + C.VERDE_MID);
  sub.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  sub.height = 18;

  row++; // blank

  // Column headers
  const th = ws.getRow(row++);
  ['Parâmetro', 'Valor', 'Classificação', 'Observação / Ação'].forEach((label, i) => {
    const cell = th.getCell(i + 1);
    cell.value     = label;
    cell.font      = headerFont();
    cell.fill      = cellFill('FF' + C.VERDE_ESCURO);
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  th.height = 20;

  const interp = result.interpretacao || {};
  const deriv  = result.derivados    || {};

  // Build rows for each soil parameter
  const soilRows = [
    { label: 'pH (CaCl₂)',        val: interp.pH?.valor,  cls: interp.pH?.classe,  acao: interp.pH?.acao,  cor: interp.pH?.cor },
    { label: 'MO (dag/kg)',        val: interp.MO?.valor,  cls: interp.MO?.classe,  acao: '',               cor: interp.MO?.cor },
    { label: 'P (mg/dm³)',         val: interp.P?.valor,   cls: interp.P?.classe,   acao: interp.P?.acao,   cor: interp.P?.cor },
    { label: 'K (cmolc/dm³)',      val: interp.K?.valor,   cls: interp.K?.classe,   acao: interp.K?.acao,   cor: interp.K?.cor },
    { label: 'Ca (cmolc/dm³)',     val: interp.Ca?.valor,  cls: interp.Ca?.classe,  acao: '',               cor: interp.Ca?.cor },
    { label: 'Mg (cmolc/dm³)',     val: interp.Mg?.valor,  cls: interp.Mg?.classe,  acao: '',               cor: interp.Mg?.cor },
    { label: 'Al (cmolc/dm³)',     val: interp.Al?.valor,  cls: interp.Al?.classe,  acao: interp.Al?.acao,  cor: interp.Al?.cor },
    { label: 'SB (cmolc/dm³)',     val: deriv.SB,          cls: '—',                acao: 'Soma de Bases (Ca + Mg + K)', cor: 'info' },
    { label: 'CTC (cmolc/dm³)',    val: interp.CTC?.valor, cls: interp.CTC?.classe, acao: interp.CTC?.calculado ? 'Calculado a partir de SB + H+Al' : '', cor: interp.CTC?.cor },
    { label: 'V% (sat. de bases)', val: interp.V?.valor,   cls: interp.V?.classe,   acao: interp.V?.calculado ? 'Calculado a partir de SB / CTC' : '',   cor: interp.V?.cor },
  ];
  if (interp.B)        soilRows.push({ label: 'B (mg/dm³)',  val: interp.B?.valor,  cls: interp.B?.classe,  acao: '', cor: interp.B?.cor });
  if (interp.Zn)       soilRows.push({ label: 'Zn (mg/dm³)', val: interp.Zn?.valor, cls: interp.Zn?.classe, acao: '', cor: interp.Zn?.cor });
  if (interp.relCaMg)  soilRows.push({ label: 'Rel. Ca/Mg',  val: interp.relCaMg?.valor, cls: interp.relCaMg?.adequada ? 'Adequada' : 'Desequilíbrio', acao: '', cor: interp.relCaMg?.adequada ? 'ok' : 'warn' });

  let alt = true;
  for (const sr of soilRows) {
    const bgDefault = alt ? C.CINZA : C.BRANCO;
    const bgClassif = sr.cor === 'critical' ? C.VERMELHO
                    : sr.cor === 'warn'     ? C.AMARELO
                    : sr.cor === 'ok'       ? (alt ? 'D8F3DC' : 'B7E4C7')
                    : bgDefault;
    alt = !alt;

    const r = ws.getRow(row++);
    r.getCell(1).value = sr.label;
    r.getCell(2).value = sr.val !== undefined && sr.val !== null ? sr.val : '—';
    r.getCell(3).value = sr.cls || '—';
    r.getCell(4).value = sr.acao || '';

    for (let i = 1; i <= 4; i++) {
      const fgArgb = (i === 2 || i === 3) ? 'FF' + bgClassif : 'FF' + bgDefault;
      r.getCell(i).fill      = cellFill(fgArgb);
      r.getCell(i).font      = { size: 10 };
      r.getCell(i).border    = { bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } } };
      r.getCell(i).alignment = { horizontal: 'center', vertical: 'middle', wrapText: i === 4 };
    }
    r.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    r.getCell(4).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    r.height = 17;
  }

  // Calagem alert if needed
  if (result.calagem?.necessaria) {
    row++;
    ws.mergeCells(`A${row}:D${row}`);
    const cr = ws.getRow(row++);
    cr.getCell(1).value     = `CALAGEM NECESSÁRIA — NC = ${result.calagem.NC} t/ha com ${result.calagem.fonte}  |  V1 = ${result.calagem.V1}%  →  V2 = ${result.calagem.V2}%`;
    cr.getCell(1).font      = { bold: true, size: 10, color: { argb: 'FF721C24' } };
    cr.getCell(1).fill      = cellFill('FFF8D7DA');
    cr.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    cr.height = 22;
  }

  // Alertas
  if (result.alertas?.length > 0) {
    row++;
    for (const alerta of result.alertas) {
      ws.mergeCells(`A${row}:D${row}`);
      const ar = ws.getRow(row++);
      const isCrit = alerta.tipo === 'CRÍTICO';
      ar.getCell(1).value     = `[${alerta.tipo}] ${alerta.mensagem}`;
      ar.getCell(1).font      = { size: 9, color: { argb: isCrit ? 'FF721C24' : 'FF856404' } };
      ar.getCell(1).fill      = cellFill(isCrit ? 'FFF8D7DA' : 'FFFFF3CD');
      ar.getCell(1).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 };
      ar.height = 32;
    }
  }
}

/**
 * Build a two-tab .xlsx workbook.
 * @param {object} result — output of recommend()
 * @param {object} data   — original form data (includes data.projeto)
 * @returns {Promise<Buffer>}
 */
async function buildPlanilha(result, data) {
  const wb     = new ExcelJS.Workbook();
  wb.creator   = 'Agrosintropia';
  wb.created   = new Date();
  wb.modified  = new Date();

  buildSheet1(wb, result, data);
  buildSheet2(wb, result, data);

  return wb.xlsx.writeBuffer();
}

module.exports = { buildPlanilha };
