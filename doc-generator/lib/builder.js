'use strict';

/**
 * buildLaudo(result, data) → Document
 * Assembles a personalized .docx laudo from recommendation results.
 */

const {
  Document, Paragraph, TextRun, AlignmentType, BorderStyle,
  WidthType, ShadingType, TableRow, TableCell, Table,
  LevelFormat, NumberFormat, VerticalAlign,
} = require('docx');

const { THEME } = require('./theme');
const { run, h1, h2, h3, p, spacer, divider, pageBreak, bullet, makeTable, makeHeader, makeFooter } = require('./helpers');

// ── Color shading for interpretation rows ─────────────────────────────────────

function corParaSombra(cor) {
  if (cor === 'critical') return 'F8D7DA';
  if (cor === 'warn')     return 'FFF3CD';
  return null;
}

// ── Cover page ────────────────────────────────────────────────────────────────

function sectionCapa(result, data) {
  const { cliente, propriedade, municipio, talhao, dataAnalise, area, culturas } = result.cliente;
  const cultNomes = {
    cafe: 'Café', cacau: 'Cacau', citros: 'Citros', manga: 'Manga', abacate: 'Abacate', banana: 'Banana',
  };
  const cultStr = (culturas || []).map(c => cultNomes[c] || c).join(', ') || 'Não especificada';
  const dataGer = new Date().toLocaleDateString('pt-BR');
  const areaStr = area ? `${area} ha` : '—';

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
      children: [run('LAUDO DE RECOMENDAÇÃO DE ADUBAÇÃO ORGÂNICA', { bold: true, size: THEME.size.title, color: THEME.color.dark })],
    }),
    divider(),
    spacer(),
    // Client info table
    new Table({
      width: { size: 8640, type: WidthType.DXA },
      rows: [
        makeInfoRow('Produtor / Cliente', cliente || '—'),
        makeInfoRow('Propriedade', propriedade || '—'),
        makeInfoRow('Município', municipio || '—'),
        makeInfoRow('Talhão', talhao || '—'),
        makeInfoRow('Data da Análise', dataAnalise || '—'),
        makeInfoRow('Área', areaStr),
        makeInfoRow('Culturas', cultStr),
        makeInfoRow('Data de Emissão', dataGer),
        ...(data.agronomo?.nome ? [makeInfoRow('Responsável Técnico', `${data.agronomo.nome}${data.agronomo.crea ? ` — CREA ${data.agronomo.crea}` : ''}`)] : []),
      ],
    }),
    spacer(), spacer(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 60 },
      children: [run('Serra Grande, Uruçuca — Bahia, Brasil', { size: THEME.size.body, color: THEME.color.gray })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [run('Documento gerado pelo Sistema de Recomendação Agrosintropia', { size: THEME.size.small, color: THEME.color.pale, italics: true })],
    }),
    pageBreak(),
  ];
}

function makeInfoRow(label, value) {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 2800, type: WidthType.DXA },
        shading: { fill: THEME.color.mid, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: THEME.color.border },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: THEME.color.border },
          left: { style: BorderStyle.SINGLE, size: 1, color: THEME.color.border },
          right: { style: BorderStyle.SINGLE, size: 1, color: THEME.color.border },
        },
        children: [new Paragraph({ children: [run(label, { bold: true, size: THEME.size.small, color: THEME.color.white })] })],
      }),
      new TableCell({
        width: { size: 5840, type: WidthType.DXA },
        shading: { fill: THEME.color.rowEven, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: THEME.color.border },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: THEME.color.border },
          left: { style: BorderStyle.SINGLE, size: 1, color: THEME.color.border },
          right: { style: BorderStyle.SINGLE, size: 1, color: THEME.color.border },
        },
        children: [new Paragraph({ children: [run(value, { size: THEME.size.small })] })],
      }),
    ],
  });
}

// ── Aviso técnico ─────────────────────────────────────────────────────────────

function sectionAviso() {
  return [
    h1('AVISO TÉCNICO'),
    p('Este laudo constitui rascunho de recomendação gerado pelo sistema automatizado da Agrosintropia e deve ser obrigatoriamente revisado por agrônomo credenciado (CREA/CFBio) antes do envio ao cliente.'),
    spacer(),
    p('As recomendações são baseadas nos parâmetros informados e nas tabelas de referência técnica da Embrapa, CEPLAC e Manual de Adubação e Calagem da Bahia. As doses têm caráter orientativo e devem ser ajustadas conforme condições locais, histórico de manejo e disponibilidade regional de insumos.'),
    spacer(),
    p('Fontes: Embrapa Mandioca e Fruticultura, CEPLAC (Ilhéus-BA), IAC, INCAPER, Manual de Adubação e Calagem para a Bahia, CFSEMG 5ª Aproximação.', { italics: true, size: THEME.size.small, color: THEME.color.gray }),
    pageBreak(),
  ];
}

// ── Soil interpretation section ───────────────────────────────────────────────

function sectionInterpretacao(result) {
  const interp = result.interpretacao;

  const params = [
    { label: 'pH (CaCl₂)',      info: interp.pH,  unid: '',             extra: interp.pH.acao },
    { label: 'MO (%)',          info: interp.MO,  unid: '%',            extra: '' },
    { label: 'P (mg/dm³)',      info: interp.P,   unid: 'mg/dm³',       extra: interp.P.acao || '' },
    { label: 'K (cmolc/dm³)',   info: interp.K,   unid: 'cmolc/dm³',    extra: interp.K.acao || '' },
    { label: 'Ca (cmolc/dm³)',  info: interp.Ca,  unid: 'cmolc/dm³',    extra: '' },
    { label: 'Mg (cmolc/dm³)',  info: interp.Mg,  unid: 'cmolc/dm³',    extra: '' },
    { label: 'Al (cmolc/dm³)',  info: interp.Al,  unid: 'cmolc/dm³',    extra: interp.Al.acao || '' },
    { label: 'CTC (cmolc/dm³)', info: interp.CTC, unid: 'cmolc/dm³',    extra: interp.CTC.calculado ? 'Calculado: Ca+Mg+K+H+Al' : '' },
    { label: 'V% (sat. bases)', info: interp.V,   unid: '%',            extra: interp.V.calculado ? 'Calculado: SB/CTC×100' : '' },
  ];
  if (interp.B)  params.push({ label: 'B (mg/dm³)',  info: interp.B,  unid: 'mg/dm³', extra: '' });
  if (interp.Zn) params.push({ label: 'Zn (mg/dm³)', info: interp.Zn, unid: 'mg/dm³', extra: '' });

  const rows = params.map(({ label, info, unid, extra }) => [
    label,
    String(info.valor),
    info.classe || '—',
    extra || (info.acao || ''),
  ]);

  const shading = params.map(({ info }) => corParaSombra(info.cor));

  const alInfo = interp.Al;
  const mPctStr = alInfo && alInfo.mPct !== undefined ? `m% = ${alInfo.mPct}%` : '';

  const derivados = result.derivados;
  const derivadosStr = `SB = ${derivados.SB} cmolc/dm³ | CTC = ${derivados.CTC} cmolc/dm³ | V% = ${derivados.V}% | m% = ${derivados.mPct}%`;

  const relCaMg = interp.relCaMg;

  return [
    h1('1. INTERPRETAÇÃO DA ANÁLISE DE SOLO'),
    p('Os parâmetros abaixo foram interpretados com base nos critérios da Embrapa e do Manual de Adubação da Bahia para solos tropicais úmidos. Linhas em amarelo indicam atenção; em vermelho, situação crítica.'),
    spacer(),
    makeTable(
      ['Parâmetro', 'Valor', 'Classificação', 'Observação / Ação'],
      rows,
      [2000, 1400, 2000, 3700],
      shading
    ),
    spacer(),
    p(`Valores derivados: ${derivadosStr}`, { italics: true, size: THEME.size.small, color: THEME.color.gray }),
    relCaMg ? p(`Relação Ca:Mg = ${relCaMg.valor} (${relCaMg.adequada ? 'adequada' : 'DESEQUILIBRADA — ver alertas'})`, { italics: true, size: THEME.size.small, color: relCaMg.adequada ? THEME.color.gray : THEME.color.warnText || '856404' }) : spacer(),
    spacer(),
  ];
}

// ── Alerts section ────────────────────────────────────────────────────────────

function sectionAlertas(result) {
  if (!result.alertas || result.alertas.length === 0) return [];

  const items = [
    h2('⚠️ ALERTAS'),
    spacer(),
  ];

  for (const alerta of result.alertas) {
    const isCrit = alerta.tipo === 'CRÍTICO';
    items.push(
      new Paragraph({
        spacing: { before: 100, after: 100 },
        shading: { fill: isCrit ? 'F8D7DA' : 'FFF3CD', type: ShadingType.CLEAR },
        border: {
          left: { style: BorderStyle.THICK, size: 6, color: isCrit ? 'DC3545' : 'FFC107', space: 4 },
        },
        children: [
          run(`[${alerta.tipo}] `, { bold: true, size: THEME.size.small, color: isCrit ? 'DC3545' : '856404' }),
          run(alerta.mensagem, { size: THEME.size.small, color: isCrit ? '721C24' : '856404' }),
        ],
      }),
      spacer(),
    );
  }

  return items;
}

// ── Calagem section ───────────────────────────────────────────────────────────

function sectionCalagem(result) {
  const cal = result.calagem;
  if (!cal.necessaria) {
    return [
      h1('2. RECOMENDAÇÃO DE CALAGEM'),
      p('Calagem não necessária no momento. pH e V% dentro dos limites para as culturas selecionadas. Monitorar a cada 2–3 anos.'),
      spacer(),
    ];
  }

  return [
    h1('2. RECOMENDAÇÃO DE CALAGEM'),
    p(`O pH atual (${result.interpretacao.pH.valor} CaCl₂) e a saturação por bases (V% = ${cal.V1}%) indicam necessidade de correção para atingir a meta de V% = ${cal.V2}% para as culturas selecionadas.`),
    spacer(),
    makeTable(
      ['Parâmetro', 'Valor'],
      [
        ['Necessidade de Calagem (NC)', `${cal.NC} t/ha`],
        ['V% atual (V1)', `${cal.V1}%`],
        ['V% meta (V2)', `${cal.V2}%`],
        ['Fonte recomendada', cal.fonte],
        ['PRNT', `${cal.PRNT}%`],
        ['Fórmula aplicada', `NC = (V2 - V1) × CTC / (PRNT × 10)`],
      ],
      [3500, 5600],
    ),
    spacer(),
    h3('Modo de Aplicação:'),
    p(cal.observacao),
    spacer(),
    p('Após a calagem, aguardar 60–90 dias para início do programa de adubação orgânica. Em SAFs estabelecidos, realizar análise foliar para confirmar resposta.', { italics: true }),
    spacer(),
  ];
}

// ── Fertilization section ─────────────────────────────────────────────────────

function sectionAdubacao(result) {
  if (!result.adubacao || Object.keys(result.adubacao).length === 0) {
    return [
      h1('3. PROGRAMA DE ADUBAÇÃO ORGÂNICA'),
      p('Nenhuma cultura selecionada. Informe as culturas para receber recomendações específicas.'),
      spacer(),
    ];
  }

  const items = [
    h1('3. PROGRAMA DE ADUBAÇÃO ORGÂNICA'),
    p(result.coberturaNote),
    spacer(),
  ];

  let cultIdx = 1;
  for (const [key, cult] of Object.entries(result.adubacao)) {
    items.push(h2(`3.${cultIdx}. ${cult.nome}`));
    cultIdx++;

    if (cult.manutencao && cult.manutencao.length > 0) {
      items.push(h3('Insumos recomendados (adubação de manutenção anual):'));
      items.push(spacer());
      items.push(
        makeTable(
          ['Insumo', 'Dose por hectare', 'Observação'],
          cult.manutencao.map(m => [m.insumo, m.dose, m.obs || '']),
          [3400, 2200, 3500],
        )
      );
      items.push(spacer());
    }

    if (cult.parcelamento) {
      items.push(h3('Parcelamento e Épocas de Aplicação:'));
      items.push(p(cult.parcelamento));
      items.push(spacer());
    }

    if (cult.observacoes) {
      items.push(p(cult.observacoes, { italics: true, size: THEME.size.small, color: THEME.color.gray }));
      items.push(spacer());
    }
  }

  return items;
}

// ── Micronutrients section ────────────────────────────────────────────────────

function sectionMicro(result) {
  const micro = result.micronutrientes;
  if (!micro || (micro.foliar.length === 0 && micro.solo.length === 0)) return [];

  const items = [
    h1('4. MICRONUTRIENTES'),
    spacer(),
  ];

  if (micro.foliar.length > 0) {
    items.push(h2('4.1 Adubação Foliar'));
    items.push(spacer());
    items.push(
      makeTable(
        ['Nutriente', 'Produto / Concentração', 'Frequência', 'Observação'],
        micro.foliar.map(m => [m.nutriente, m.produto, m.frequencia, m.obs]),
        [1800, 2500, 1800, 3000],
      )
    );
    items.push(spacer());
    items.push(p('Aplicar nas horas mais frescas do dia (manhã cedo ou final da tarde). Evitar aplicação em dias de chuva ou ventos fortes.', { italics: true, size: THEME.size.small, color: THEME.color.gray }));
    items.push(spacer());
  }

  if (micro.solo.length > 0) {
    items.push(h2('4.2 Micronutrientes no Solo'));
    items.push(spacer());
    items.push(
      makeTable(
        ['Nutriente', 'Fonte', 'Dose', 'Observação'],
        micro.solo.map(m => [m.nutriente, m.fonte, m.dose, m.obs]),
        [1800, 2500, 1800, 3000],
      )
    );
    items.push(spacer());
  }

  return items;
}

// ── Biological fertilizers section ───────────────────────────────────────────

function sectionBiofertilizantes(result) {
  const bio = result.biofertilizantes;
  if (!bio) return [];

  return [
    h1('5. FERTILIZANTES BIOLÓGICOS E CONDICIONADORES'),
    p('O uso de biofertilizantes e inoculantes microbiológicos potencializa a eficiência da adubação orgânica, ativa a microbiota do solo e reduz a pressão de doenças. As recomendações abaixo baseiam-se em evidências da Embrapa Agrobiologia, CEPLAC, IAC e Pesagro-Rio.'),
    spacer(),
    h2('5.1 Aplicação Foliar'),
    spacer(),
    makeTable(
      ['Produto', 'Dose', 'Frequência', 'Observação'],
      bio.foliares.map(m => [m.produto, m.dose, m.frequencia, m.obs]),
      [2500, 1800, 1500, 3300],
    ),
    spacer(),
    h2('5.2 Inoculantes e Condicionadores de Solo'),
    spacer(),
    makeTable(
      ['Produto', 'Dose', 'Frequência', 'Observação'],
      bio.solo.map(m => [m.produto, m.dose, m.frequencia, m.obs]),
      [2500, 1800, 1500, 3300],
    ),
    spacer(),
    p('Não aplicar fungicidas químicos nas 48 horas anteriores ou posteriores à inoculação com Trichoderma, Bacillus ou FMA. Armazenar inoculantes em local fresco, ao abrigo da luz solar direta.', { italics: true, size: THEME.size.small, color: THEME.color.gray }),
    spacer(),
  ];
}

// ── Green manure section ──────────────────────────────────────────────────────

function sectionAdubacaoVerde(result) {
  const items = [
    h1('6. ADUBAÇÃO VERDE, COBERTURA DO SOLO E HIDROGEL'),
  ];

  if (result.adubacaoVerde && result.adubacaoVerde.length > 0) {
    items.push(
      h2('6.1 Espécies Recomendadas'),
      p('Espécies para melhoria da cobertura, fixação de N e ciclagem de nutrientes no SAF:'),
      spacer(),
      makeTable(
        ['Espécie', 'Tipo', 'N Fixado/Fornecido', 'Uso no SAF'],
        result.adubacaoVerde.map(av => [av.especie, av.tipo, av.N, av.uso]),
        [2300, 1800, 1800, 3200],
      ),
      spacer(),
    );
  }

  if (result.hidrogel && result.hidrogel.recomendar) {
    const hg = result.hidrogel;
    items.push(
      h2('6.2 Hidrogel Biodegradável (Plantios de Sequeiro)'),
      p(hg.descricao),
      spacer(),
      makeTable(
        ['Cultura / Situação', 'Dose recomendada por cova'],
        hg.doses.map(d => [d.cultura, d.dose]),
        [4500, 4600],
      ),
      spacer(),
      h3('Modo de Aplicação:'),
      p(hg.modo),
      spacer(),
      p(hg.obs, { italics: true, size: THEME.size.small, color: THEME.color.gray }),
      spacer(),
    );
  }

  return items;
}

// ── SAF considerations section ────────────────────────────────────────────────

function sectionSAF(result) {
  if (!result.safBonuses || result.safBonuses.length === 0) return [];

  const items = [
    h1('7. CONSIDERAÇÕES SOBRE O SISTEMA AGROFLORESTAL'),
    p('Com base na estrutura do SAF informada, os seguintes ajustes e observações se aplicam:'),
    spacer(),
  ];
  for (const bonus of result.safBonuses) {
    items.push(bullet(bonus));
  }
  items.push(spacer());

  return items;
}

// ── Next steps section ────────────────────────────────────────────────────────

function sectionProximosPassos(result) {
  const items = [
    h1('8. PRÓXIMOS PASSOS E MONITORAMENTO'),
  ];

  if (result.analiseDesatualizada) {
    items.push(
      h2('⚠️ 8.1 NOVA COLETA DE SOLO — URGENTE'),
      p('A análise de solo utilizada neste laudo está desatualizada (mais de 12 meses). As condições do solo podem ter se alterado significativamente após calagem, adubações e ciclos de cultivo. Siga o roteiro abaixo para a nova coleta:'),
      spacer(),
      makeTable(
        ['Etapa', 'Orientação técnica'],
        [
          ['Época ideal', 'Final da estação seca (julho–setembro na Bahia). Aguardar no mínimo 60 dias após calagem ou adubação.'],
          ['Profundidade', '0–20 cm (horizonte superficial). Coletar também 20–40 cm se houver suspeita de impedimentos em subsuperfície.'],
          ['Subamostras', '15–20 pontos por área homogênea (máx. 2–5 ha por amostra composta). Caminhar em zigue-zague por toda a área.'],
          ['Utensílio', 'Trado holandês ou calador de metal limpo e seco. Não usar ferramentas enferrujadas ou com resíduos de outros solos.'],
          ['Homogeneização', 'Misturar todas as subamostras em balde plástico limpo. Retirar ~500 g da mistura para o saco de envio.'],
          ['Identificação', 'Etiquetar com: produtor, propriedade, talhão, profundidade e data de coleta.'],
          ['Envio', 'Enviar ao laboratório em até 48h. Se necessário, refrigerar por no máximo 7 dias.'],
          ['Evitar', 'Coleta sob chuva; próximo a formigueiros, cupinzeiros ou cercas; áreas de queima recente; áreas recém-adubadas.'],
        ],
        [2800, 6300],
      ),
      spacer(),
      p('Fontes: Embrapa Solos (Manual de Métodos de Análise de Solo), CEPLAC (Boletim Técnico 202), EMATER-BA.', { italics: true, size: THEME.size.small, color: THEME.color.gray }),
      spacer(),
      h3('Próxima Análise Prevista:'),
    );
  } else {
    items.push(h3('Recomendação de Nova Análise de Solo:'));
  }

  items.push(
    p(`Realizar nova análise de solo no período ${result.proximaAnalise}. Preferencialmente no final da estação seca, antes do início do período chuvoso.`),
    spacer(),
    h3('Monitoramento Contínuo:'),
    bullet('Observar sintomas visuais de deficiências (clorose, manchas, malformação de folhas e frutos) ao longo do ciclo.'),
    bullet('Realizar análise foliar 1–2 anos após a calagem para verificar resposta e ajustar micronutrientes.'),
    bullet('Registrar doses aplicadas, datas e produtividade para correlacionar com resultados futuros.'),
    bullet('Manter cobertura morta permanente sob as copas das culturas principais.'),
    bullet('Em SAFs novos, repetir análise de solo após 18–24 meses.'),
    spacer(),
  );

  return items;
}

// ── Agronomist observations section ──────────────────────────────────────────

function sectionObservacoes(data) {
  if (!data.observacoes) return [];

  return [
    h1('OBSERVAÇÕES DO AGRÔNOMO'),
    p(data.observacoes),
    spacer(),
  ];
}

// ── Signature field ───────────────────────────────────────────────────────────

function sectionAssinatura(data) {
  const agr  = data?.agronomo || {};
  const nome = agr.nome || '_______________________________________________';
  const crea = agr.crea ? `CREA nº: ${agr.crea}` : 'CREA nº: _____________________';
  const data_ = new Date().toLocaleDateString('pt-BR');
  const dataStr = agr.nome ? `Data: ${data_}` : 'Data: _____/_____/________';
  const hasName = !!agr.nome;

  return [
    divider(),
    h2('RESPONSÁVEL TÉCNICO'),
    spacer(),
    new Paragraph({
      spacing: { before: hasName ? 120 : 600, after: 60 },
      children: [run(nome, { bold: hasName, size: hasName ? THEME.size.body : THEME.size.body, color: hasName ? THEME.color.dark : THEME.color.gray })],
    }),
    ...(hasName ? [] : [p('Nome do Agrônomo Responsável', { italics: true, color: THEME.color.gray })]),
    spacer(),
    new Paragraph({
      spacing: { before: 80, after: 60 },
      children: [run(crea, { color: hasName ? THEME.color.dark : THEME.color.gray })],
    }),
    new Paragraph({
      spacing: { before: 80, after: 60 },
      children: [run(dataStr, { color: hasName ? THEME.color.dark : THEME.color.gray })],
    }),
    spacer(),
    divider(),
    spacer(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [run('Agrosintropia — Consultoria em Sistemas Agroflorestais', { size: THEME.size.small, color: THEME.color.mid, italics: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [run('Serra Grande, Uruçuca — Bahia, Brasil', { size: THEME.size.small, color: THEME.color.pale })],
    }),
  ];
}

// ── Main builder function ─────────────────────────────────────────────────────

function buildLaudo(result, data) {
  const { cliente, propriedade, municipio } = result.cliente || {};
  const headerTitle = `Laudo de Recomendação${propriedade ? ` — ${propriedade}` : ''}`;

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
      headers: { default: makeHeader(headerTitle) },
      footers: { default: makeFooter() },
      children: [
        ...sectionCapa(result, data),
        ...sectionAviso(),
        ...sectionInterpretacao(result),
        ...sectionAlertas(result),
        ...sectionCalagem(result),
        ...sectionAdubacao(result),
        ...sectionMicro(result),
        ...sectionBiofertilizantes(result),
        ...sectionAdubacaoVerde(result),
        ...sectionSAF(result),
        ...sectionProximosPassos(result),
        ...sectionObservacoes(data),
        ...sectionAssinatura(data),
      ],
    }],
  });
}

module.exports = { buildLaudo };
