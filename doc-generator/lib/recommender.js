'use strict';

/**
 * recommend(data) → result
 * Pure function: interprets soil analysis data and returns structured recommendations.
 */

// ── Classification helpers ────────────────────────────────────────────────────

function classifyPH(val) {
  if (val < 4.0) return { classe: 'Extremamente ácido', cor: 'critical', acao: 'Calagem urgente + correção de Al³⁺' };
  if (val < 4.5) return { classe: 'Muito ácido', cor: 'critical', acao: 'Calagem obrigatória' };
  if (val < 5.0) return { classe: 'Ácido', cor: 'warn', acao: 'Calagem recomendada' };
  if (val <= 5.5) return { classe: 'Moderadamente ácido', cor: 'ok', acao: 'Ideal para maioria dos SAFs' };
  if (val <= 6.0) return { classe: 'Levemente ácido', cor: 'ok', acao: 'Ótimo para café, cacau, citros' };
  return { classe: 'Neutro a alcalino', cor: 'info', acao: 'Monitorar micronutrientes (Mn, Fe, Zn)' };
}

function classifyMO(val) {
  if (val < 1.0) return { classe: 'Muito baixo', cor: 'warn' };
  if (val < 2.1) return { classe: 'Baixo', cor: 'warn' };
  if (val <= 4.0) return { classe: 'Médio', cor: 'ok' };
  if (val <= 6.0) return { classe: 'Alto', cor: 'ok' };
  return { classe: 'Muito alto', cor: 'ok' };
}

function classifyP(val) {
  if (val < 4) return { classe: 'Muito baixo', cor: 'warn' };
  if (val < 8) return { classe: 'Baixo', cor: 'warn' };
  if (val < 12) return { classe: 'Médio', cor: 'ok' };
  if (val <= 20) return { classe: 'Bom', cor: 'ok' };
  return { classe: 'Alto', cor: 'ok' };
}

function classifyK(val) {
  if (val < 0.08) return { classe: 'Muito baixo', cor: 'warn' };
  if (val < 0.16) return { classe: 'Baixo', cor: 'warn' };
  if (val < 0.31) return { classe: 'Médio', cor: 'ok' };
  if (val <= 0.60) return { classe: 'Bom', cor: 'ok' };
  return { classe: 'Alto', cor: 'ok' };
}

function classifyCa(val) {
  if (val < 0.5) return { classe: 'Muito baixo', cor: 'warn' };
  if (val < 1.6) return { classe: 'Baixo', cor: 'warn' };
  if (val < 3.1) return { classe: 'Médio', cor: 'ok' };
  if (val <= 5.0) return { classe: 'Bom', cor: 'ok' };
  return { classe: 'Alto', cor: 'ok' };
}

function classifyMg(val) {
  if (val < 0.3) return { classe: 'Muito baixo', cor: 'warn' };
  if (val < 0.9) return { classe: 'Baixo', cor: 'warn' };
  if (val < 1.6) return { classe: 'Médio', cor: 'ok' };
  if (val <= 2.5) return { classe: 'Bom', cor: 'ok' };
  return { classe: 'Alto', cor: 'ok' };
}

function classifyAl(val, mPct) {
  if (val === 0) return { classe: 'Sem toxidez', cor: 'ok', acao: 'Normal' };
  if (val <= 0.5) return { classe: 'Baixo', cor: 'ok', acao: 'Monitorar; calagem preventiva' };
  if (val <= 1.0) return { classe: 'Médio', cor: 'warn', acao: 'Calagem corretiva necessária' };
  return { classe: 'Alto', cor: 'critical', acao: 'Calagem urgente; limitante severo' };
}

function classifyCTC(val) {
  if (val < 4) return { classe: 'Muito baixo', cor: 'warn' };
  if (val < 8) return { classe: 'Baixo', cor: 'warn' };
  if (val < 12) return { classe: 'Médio', cor: 'ok' };
  if (val <= 17) return { classe: 'Bom', cor: 'ok' };
  return { classe: 'Alto', cor: 'ok' };
}

function classifyV(val) {
  if (val < 20) return { classe: 'Muito baixo', cor: 'warn' };
  if (val < 40) return { classe: 'Baixo', cor: 'warn' };
  if (val < 60) return { classe: 'Médio', cor: 'warn' };
  if (val <= 75) return { classe: 'Bom', cor: 'ok' };
  return { classe: 'Alto', cor: 'ok' };
}

function classifyB(val) {
  if (val < 0.2) return { classe: 'Baixo', cor: 'warn' };
  if (val <= 0.5) return { classe: 'Médio', cor: 'ok' };
  return { classe: 'Alto', cor: 'ok' };
}

function classifyZn(val) {
  if (val < 0.5) return { classe: 'Baixo', cor: 'warn' };
  if (val <= 1.5) return { classe: 'Médio', cor: 'ok' };
  return { classe: 'Alto', cor: 'ok' };
}

// ── V2 targets by culture ─────────────────────────────────────────────────────

const V2_TARGET = {
  cafe: 65,
  cacau: 60,
  citros: 65,
  manga: 55,
  abacate: 60,
  banana: 60,
};

// ── Culture maintenance doses ─────────────────────────────────────────────────

const CULTURA_DOSES = {
  cafe: {
    nome: 'Café (Coffea arabica / Coffea canephora)',
    manutencao: [
      { insumo: 'Cama de frango (2,5% N)', dose: '1.200–1.500 kg/ha', obs: 'Principal fonte de N' },
      { insumo: 'Esterco bovino curtido (1,5% N)', dose: '2.500–3.000 kg/ha', obs: 'Alternativa regional' },
      { insumo: 'Composto orgânico (1,8% N)', dose: '2.000–2.500 kg/ha', obs: 'Melhora estrutura do solo' },
      { insumo: 'Torta de mamona (4,5% N)', dose: '500–700 kg/ha', obs: 'Nematicida; ótimo para N' },
      { insumo: 'Farinha de osso (20% P₂O₅)', dose: '200–300 kg/ha', obs: 'Melhor fonte orgânica de P' },
      { insumo: 'Cinzas vegetais (8% K₂O)', dose: '150–250 kg/ha', obs: 'Fonte rápida de K; atenção ao pH' },
    ],
    parcelamento: '3–4 aplicações no período chuvoso (Out–Mar). 1ª aplicação em Out/Nov com cama de frango; 2ª em Dez/Jan com composto + farinha de osso; 3ª em Mar/Abr com torta ou composto.',
    observacoes: 'Aplicar sob a copa, 20–30 cm do caule. Em SAF com sombreamento moderado, doses de manutenção são suficientes.',
  },
  cacau: {
    nome: 'Cacau (Theobroma cacao L.)',
    manutencao: [
      { insumo: 'Composto orgânico/esterco curtido', dose: '8–15 kg/planta/ano', obs: 'Base do programa de adubação' },
      { insumo: 'Cama de frango', dose: '800–1.200 kg/ha', obs: 'Rica em N e P' },
      { insumo: 'Torta de cacau (subproduto)', dose: '500–800 kg/ha', obs: 'Insumo local; rica em K' },
      { insumo: 'Farinha de osso (20% P₂O₅)', dose: '150–250 g/planta', obs: 'Fonte de P de liberação lenta' },
      { insumo: 'Cobertura morta (casca de cacau)', dose: '5–8 kg/planta', obs: 'Insumo mais estratégico; ciclagem local' },
    ],
    parcelamento: '2–3 aplicações/ano, preferencialmente no início e meio do período chuvoso.',
    observacoes: 'Aplicar 50–100 cm do tronco, sob a projeção da copa. A cobertura morta com casca de cacau é o insumo mais estratégico.',
  },
  citros: {
    nome: 'Citros (Citrus spp. — Laranja, Limão, Tangerina)',
    manutencao: [
      { insumo: 'Cama de frango (3% N)', dose: '1.500–2.000 kg/ha', obs: 'Principal fonte; dividir em 3 aplicações' },
      { insumo: 'Composto orgânico (2% N)', dose: '2.000–3.000 kg/ha', obs: 'Complementar; melhora estrutura' },
      { insumo: 'Farinha de osso (20% P₂O₅)', dose: '150–200 kg/ha', obs: 'Aplicar na cova e anualmente' },
      { insumo: 'Cinzas vegetais (8% K₂O)', dose: '200–300 kg/ha', obs: 'Aplicar em cobertura; atenção ao pH' },
      { insumo: 'Torta de mamona (4,5% N)', dose: '300–500 kg/ha', obs: 'Nematicida; ótimo para pomares' },
    ],
    parcelamento: '3 aplicações no período chuvoso.',
    observacoes: 'Citros têm alta demanda por N e K. Regularidade é mais importante que doses altas esporádicas.',
  },
  manga: {
    nome: 'Manga (Mangifera indica L.)',
    manutencao: [
      { insumo: 'Cama de frango', dose: '10–20 kg/planta/ano', obs: 'Dividir pré-floração e pós-colheita' },
      { insumo: 'Farinha de osso', dose: '200–300 g/planta/ano', obs: 'Aplicar 60 dias antes da floração' },
      { insumo: 'B (bórax 0,2%) — foliar', dose: '3–4 pulverizações', obs: 'Diferenciação floral; crítico' },
      { insumo: 'Zn (ZnSO₄ 0,3%) — foliar', dose: '2–3 pulverizações', obs: 'Durante enchimento dos frutos' },
    ],
    parcelamento: '2 aplicações anuais: pré-floração e pós-colheita.',
    observacoes: 'Estresse hídrico controlado (60–90 dias) induz floração. Momento crítico para B foliar.',
  },
  abacate: {
    nome: 'Abacate (Persea americana Mill.)',
    manutencao: [
      { insumo: 'Composto maduro (2% N)', dose: '3.000–5.000 kg/ha', obs: 'Base do programa; 2 aplicações/ano' },
      { insumo: 'Torta de mamona (4,5% N)', dose: '200–400 kg/ha', obs: 'Pré-floração; nematicida' },
      { insumo: 'Farinha de osso (20% P₂O₅)', dose: '100–200 kg/ha', obs: 'Na cova e cobertura anual' },
      { insumo: 'Cinzas vegetais (8% K₂O)', dose: '200–400 kg/ha', obs: 'Não elevar pH acima de 6,0' },
      { insumo: 'Bokashi (2,5% N)', dose: '500–800 kg/ha', obs: 'Estimula microbiota; 4x/ano' },
    ],
    parcelamento: '2–4 aplicações/ano ao longo do período chuvoso.',
    observacoes: 'Altamente sensível a encharcamento e salinidade. Prefere solos bem drenados com boa MO.',
  },
  banana: {
    nome: 'Banana (Musa spp.)',
    manutencao: [
      { insumo: 'Cama de frango', dose: '1.200–1.800 kg/ha/ano', obs: 'Fonte principal de N' },
      { insumo: 'Composto orgânico', dose: '3.000–5.000 kg/ha/ano', obs: 'Manutenção da MO e estrutura' },
      { insumo: 'Cinzas vegetais (K₂O)', dose: '300–500 kg/ha', obs: 'K é o nutriente mais crítico para banana' },
      { insumo: 'Farinha de osso', dose: '200–300 kg/ha', obs: 'Fonte de P' },
    ],
    parcelamento: '4–6 aplicações distribuídas no período chuvoso.',
    observacoes: 'K é o nutriente mais limitante. A palhiço da banana contribui significativamente para ciclagem de K.',
  },
};

// ── Coverage modifiers ────────────────────────────────────────────────────────

const COVERAGE_MODS = {
  descoberto:  { N: 1.25, P: 1.20, K: 1.20 },
  esparsa:     { N: 1.15, P: 1.10, K: 1.10 },
  moderada:    { N: 1.00, P: 1.00, K: 1.00 },
  boa:         { N: 0.90, P: 1.00, K: 0.90 },
  excelente:   { N: 0.75, P: 1.00, K: 0.85 },
};

const COVERAGE_NOTES = {
  descoberto:  'Solo descoberto — doses aumentadas em 25% N, 20% P e 20% K. Priorizar cobertura morta como primeira ação.',
  esparsa:     'Cobertura esparsa — doses aumentadas em 15% N, 10% P e 10% K. Adubação verde recomendada.',
  moderada:    'Cobertura moderada — doses padrão aplicadas conforme tabelas de referência.',
  boa:         'Boa cobertura — doses reduzidas em 10% N e 10% K. Sistema em boa ciclagem.',
  excelente:   'Excelente cobertura — doses reduzidas em 25% N e 15% K. SAF bem desenvolvido; monitorar por análise foliar.',
};

// ── Limestone source name ─────────────────────────────────────────────────────

function calcarioFonte(tipo) {
  const fontes = {
    dolomitico: 'Calcário Dolomítico',
    calcitico:  'Calcário Calcítico',
    filler:     'Calcário Filler (pó fino)',
    conchas:    'Calcário de Conchas/Mariscos',
  };
  return fontes[tipo] || 'Calcário';
}

// ── Main recommend function ───────────────────────────────────────────────────

function recommend(data) {
  const { cliente, propriedade, municipio, talhao, dataAnalise, area, culturas = [], cobertura = 'moderada', saf = {}, solo = {}, calcario = {} } = data;

  // ── Derived values ──────────────────────────────────────────────────────────
  const Ca = parseFloat(solo.Ca) || 0;
  const Mg = parseFloat(solo.Mg) || 0;
  const K  = parseFloat(solo.K)  || 0;
  const Al = parseFloat(solo.Al) || 0;
  const HplusAl = parseFloat(solo.HplusAl) || 0;

  const SB  = Ca + Mg + K;
  const CTC = solo.CTC ? parseFloat(solo.CTC) : (SB + HplusAl);
  const V   = solo.V   ? parseFloat(solo.V)   : (CTC > 0 ? (SB / CTC) * 100 : 0);
  const mPct = (SB + Al) > 0 ? (Al / (SB + Al)) * 100 : 0;

  const pH  = parseFloat(solo.pH_CaCl2) || 0;
  const MO  = parseFloat(solo.MO)       || 0;
  const P   = parseFloat(solo.P)        || 0;
  const B   = solo.B  !== undefined && solo.B !== '' ? parseFloat(solo.B)  : null;
  const Zn  = solo.Zn !== undefined && solo.Zn !== '' ? parseFloat(solo.Zn) : null;

  // ── Interpretação ───────────────────────────────────────────────────────────
  const phInfo = classifyPH(pH);
  const moInfo = classifyMO(MO);
  const pInfo  = classifyP(P);
  const kInfo  = classifyK(K);
  const caInfo = classifyCa(Ca);
  const mgInfo = classifyMg(Mg);
  const alInfo = classifyAl(Al, mPct);
  const ctcInfo = classifyCTC(CTC);
  const vInfo  = classifyV(V);
  const bInfo  = B !== null ? classifyB(B) : null;
  const znInfo = Zn !== null ? classifyZn(Zn) : null;

  const relCaMg = Mg > 0 ? Ca / Mg : null;
  const relOk   = relCaMg !== null ? (relCaMg >= 1 && relCaMg <= 8) : true;

  const interpretacao = {
    pH:  { valor: pH,  ...phInfo },
    MO:  { valor: MO,  ...moInfo },
    P:   { valor: P,   ...pInfo,  acao: pInfo.classe.includes('baixo') || pInfo.classe === 'Baixo' ? 'Aumentar dose de P; farinha de osso + composto na cova' : 'Manutenção padrão' },
    K:   { valor: K,   ...kInfo,  acao: kInfo.classe.includes('baixo') || kInfo.classe === 'Baixo' ? 'Priorizar cinzas e fonolito na mistura' : 'Manutenção padrão' },
    Ca:  { valor: Ca,  ...caInfo },
    Mg:  { valor: Mg,  ...mgInfo },
    Al:  { valor: Al,  mPct: parseFloat(mPct.toFixed(1)), ...alInfo },
    CTC: { valor: parseFloat(CTC.toFixed(2)), calculado: !solo.CTC, ...ctcInfo },
    V:   { valor: parseFloat(V.toFixed(1)),   calculado: !solo.V,   ...vInfo },
    SB:  { valor: parseFloat(SB.toFixed(2)) },
  };
  if (bInfo)  interpretacao.B  = { valor: B,  ...bInfo };
  if (znInfo) interpretacao.Zn = { valor: Zn, ...znInfo };
  if (relCaMg !== null) interpretacao.relCaMg = { valor: parseFloat(relCaMg.toFixed(2)), adequada: relOk };

  // ── Alertas ─────────────────────────────────────────────────────────────────
  const alertas = [];
  const fruitCultures = ['cacau', 'citros', 'manga', 'abacate', 'banana'];
  const hasFruit = culturas.some(c => fruitCultures.includes(c));

  if (Al > 1.0 && mPct > 50) {
    alertas.push({ tipo: 'CRÍTICO', mensagem: 'TOXIDEZ DE ALUMÍNIO SEVERA — Al³⁺ > 1,0 cmolc/dm³ e m% > 50%. Corrigir com calagem antes de qualquer plantio ou adubação.' });
  }
  if (pH < 4.0) {
    alertas.push({ tipo: 'CRÍTICO', mensagem: 'pH EXTREMAMENTE ÁCIDO (< 4,0) — Aplicar calcário com urgência; avaliar condição do solo antes de adubação.' });
  }
  if (MO < 1.0) {
    alertas.push({ tipo: 'ATENÇÃO', mensagem: 'MATÉRIA ORGÂNICA MUITO BAIXA (< 1%) — Solo degradado. Priorizar cobertura morta e composto como primeira ação.' });
  }
  if (V < 30) {
    alertas.push({ tipo: 'ATENÇÃO', mensagem: `SOLO ALTAMENTE DISTRÓFICO — V% = ${V.toFixed(1)}% (< 30%). Calagem corretiva indispensável antes da adubação.` });
  }
  if (B !== null && B < 0.1 && hasFruit) {
    alertas.push({ tipo: 'ATENÇÃO', mensagem: 'BORO CRÍTICO — B < 0,1 mg/dm³ com frutíferas presentes. Frutificação comprometida. Adubação foliar urgente (bórax 0,2%).' });
  }
  if (relCaMg !== null && !relOk) {
    if (relCaMg < 1) {
      alertas.push({ tipo: 'ATENÇÃO', mensagem: `DESEQUILÍBRIO Ca:Mg — Relação Ca/Mg = ${relCaMg.toFixed(2)} (< 1). Excesso de Mg pode antagonizar Ca. Verificar fonte de calagem.` });
    } else {
      alertas.push({ tipo: 'ATENÇÃO', mensagem: `DESEQUILÍBRIO Ca:Mg — Relação Ca/Mg = ${relCaMg.toFixed(2)} (> 8). Excesso de Ca pode antagonizar Mg. Considerar calcário dolomítico.` });
    }
  }

  // ── Calagem ─────────────────────────────────────────────────────────────────
  let calagem = { necessaria: false };
  const V2_values = culturas.map(c => V2_TARGET[c] || 60);
  const V2 = V2_values.length > 0 ? Math.max(...V2_values) : 60;
  const PRNT = parseFloat(calcario.PRNT) || 85;

  if (V < V2 && pH < 5.5) {
    const NC = parseFloat(((V2 - V) * CTC / (PRNT * 10)).toFixed(2));
    const fonte = calcarioFonte(calcario.tipo || 'dolomitico');
    calagem = {
      necessaria: true,
      NC: NC > 0 ? NC : 0,
      V1: parseFloat(V.toFixed(1)),
      V2,
      PRNT,
      fonte: `${fonte} (PRNT ${PRNT}%)`,
      observacao: 'Incorporar 60–90 dias antes do plantio. Em SAF estabelecido, aplicar em superfície ½ + ½ com 6 meses de intervalo, sem incorporação.',
    };
  }

  // ── Adubação por cultura ────────────────────────────────────────────────────
  const adubacao = {};
  const covMod = COVERAGE_MODS[cobertura] || COVERAGE_MODS.moderada;

  for (const cult of culturas) {
    const base = CULTURA_DOSES[cult];
    if (!base) continue;

    // Build a note about coverage modifier
    let modNote = '';
    if (cobertura !== 'moderada') {
      const nMod = ((covMod.N - 1) * 100).toFixed(0);
      const kMod = ((covMod.K - 1) * 100).toFixed(0);
      const sign = covMod.N >= 1 ? '+' : '';
      modNote = `Ajuste por cobertura (${cobertura}): N ${sign}${nMod}%, K ${sign}${kMod}%.`;
    }

    adubacao[cult] = {
      nome: base.nome,
      manutencao: base.manutencao,
      parcelamento: base.parcelamento,
      observacoes: base.observacoes + (modNote ? ' ' + modNote : ''),
    };
  }

  // ── Micronutrientes ─────────────────────────────────────────────────────────
  const microFoliar = [];
  const microSolo   = [];

  if (B !== null && B < 0.2) {
    microFoliar.push({ nutriente: 'Boro (B)', produto: 'Bórax 0,2% em água', frequencia: '3–4x/ano', obs: 'Crítico para frutificação e pegamento de frutos' });
  } else if (culturas.includes('cacau')) {
    microFoliar.push({ nutriente: 'Boro (B)', produto: 'Bórax 0,2% em água', frequencia: '3–4x/ano', obs: 'Prevenção de vassoura-de-bruxa; aplicar preventivamente' });
  } else if (culturas.includes('cafe')) {
    microFoliar.push({ nutriente: 'Boro (B)', produto: 'Bórax 0,2% em água', frequencia: '2–3x/ano', obs: 'Apoio à frutificação; aplicar no início da floração' });
  }

  if (Zn !== null && Zn < 0.5) {
    microFoliar.push({ nutriente: 'Zinco (Zn)', produto: 'ZnSO₄ 0,3–0,5%', frequencia: '2–3x/ano', obs: 'Deficiência limita síntese de auxinas e elongação celular' });
  }

  if (Mg !== null && Mg < 0.9) {
    microFoliar.push({ nutriente: 'Magnésio (Mg)', produto: 'Sulfato de magnésio 0,5–1,0%', frequencia: '2–3x/ano', obs: 'Correção rápida de deficiência; complementar ao calcário dolomítico' });
  }

  // ── Adubação verde ──────────────────────────────────────────────────────────
  const adubacaoVerde = [];

  if (cobertura === 'descoberto' || cobertura === 'esparsa') {
    adubacaoVerde.push(
      { especie: 'Crotalária juncea', tipo: 'Leguminosa anual', N: '100–180 kg N/ha', uso: 'Entressafra; nematicida; roçar antes da floração' },
      { especie: 'Mucuna preta (M. pruriens)', tipo: 'Leguminosa anual', N: '120–200 kg N/ha', uso: 'Excelente cobertura; supressão de invasoras' },
      { especie: 'Feijão guandu (Cajanus cajan)', tipo: 'Leguminosa perene', N: '80–140 kg N/ha', uso: 'Raiz profunda; componente permanente do SAF' }
    );
  }

  if (!saf.leguminosasArboreas) {
    adubacaoVerde.push(
      { especie: 'Gliricidia (G. sepium)', tipo: 'Árvore leguminosa', N: '50–100 kg N/ha/ano', uso: 'Componente permanente do SAF; banco de proteína e fertilizante' },
      { especie: 'Leucena (L. leucocephala)', tipo: 'Árvore leguminosa', N: '80–150 kg N/ha/ano', uso: 'Tolerante à seca; podas frequentes fornecem cobertura morta' }
    );
  }

  // Always recommend amendoim forrageiro for pathways
  adubacaoVerde.push(
    { especie: 'Amendoim forrageiro (A. pintoi)', tipo: 'Leguminosa perene', N: '40–80 kg N/ha/ano', uso: 'Cobertura viva permanente para caminhos e entrelinhas do SAF' }
  );

  // ── SAF bonuses ─────────────────────────────────────────────────────────────
  const safBonuses = [];

  if (saf.leguminosasArboreas) {
    safBonuses.push('Leguminosas arbóreas presentes (gliricidia/leucena/guandu): reduzir dose de N em 30–40% nas culturas sob influência direta.');
  }
  if (saf.bananeiras) {
    safBonuses.push('Bananeiras > 400/ha: aporte significativo de K pela palhiço. Pode-se dispensar ou reduzir à metade a adubação potássica.');
  }
  if (saf.especiesAdensadoras) {
    safBonuses.push('Espécies adensadoras de MO (ingá/leucena/gliricidia) com podas frequentes: reduzir dose de composto em 20–40%.');
  }
  if (saf.anuaisIntercalares) {
    safBonuses.push('Culturas anuais intercalares presentes: considerar exportação de 30–50 kg N/ha pelo grão colhido ao calcular necessidade de N.');
  }

  // ── Próxima análise ─────────────────────────────────────────────────────────
  const anoAtual = dataAnalise ? parseInt(dataAnalise.substring(0, 4)) : new Date().getFullYear();
  const proximaAnalise = `${anoAtual + 2}–${anoAtual + 3}`;

  return {
    cliente: { cliente, propriedade, municipio, talhao, dataAnalise, area, culturas, cobertura, saf },
    derivados: { SB: parseFloat(SB.toFixed(2)), CTC: parseFloat(CTC.toFixed(2)), V: parseFloat(V.toFixed(1)), mPct: parseFloat(mPct.toFixed(1)) },
    interpretacao,
    alertas,
    calagem,
    adubacao,
    micronutrientes: { foliar: microFoliar, solo: microSolo },
    adubacaoVerde,
    safBonuses,
    coberturaNote: COVERAGE_NOTES[cobertura] || COVERAGE_NOTES.moderada,
    proximaAnalise,
  };
}

module.exports = { recommend };
