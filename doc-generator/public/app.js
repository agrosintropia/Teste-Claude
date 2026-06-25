'use strict';

document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const btn      = document.getElementById('btn-gerar');
  const spinner  = document.getElementById('spinner');
  const btnText  = document.getElementById('btn-text');
  const errorDiv = document.getElementById('error-msg');

  // Reset error
  errorDiv.style.display = 'none';
  errorDiv.textContent   = '';

  // Show loading state
  btn.disabled = true;
  btn.classList.add('loading');
  spinner.style.display = 'block';
  btnText.textContent   = 'Gerando laudo...';

  try {
    const data = collectFormData();
    validateData(data);

    const response = await fetch('/api/generate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Erro desconhecido no servidor.' }));
      throw new Error(err.error || `Erro HTTP ${response.status}`);
    }

    // Trigger file download
    const blob     = await response.blob();
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement('a');
    const filename = getFilenameFromResponse(response) || `laudo_${Date.now()}.docx`;
    a.href         = url;
    a.download     = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

  } catch (err) {
    errorDiv.textContent   = '⚠️ ' + (err.message || 'Ocorreu um erro inesperado.');
    errorDiv.style.display = 'block';
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } finally {
    btn.disabled = false;
    btn.classList.remove('loading');
    spinner.style.display = 'none';
    btnText.textContent   = '🌱 Gerar Laudo de Recomendação';
  }
});

function getFilenameFromResponse(response) {
  const cd = response.headers.get('Content-Disposition') || '';
  const match = cd.match(/filename="([^"]+)"/);
  return match ? match[1] : null;
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function getNum(id) {
  const v = getVal(id);
  return v === '' ? undefined : parseFloat(v);
}

function getNumOrNull(id) {
  const v = getVal(id);
  return v === '' ? null : parseFloat(v);
}

function collectFormData() {
  // Culturas (checkboxes)
  const culturaBoxes = document.querySelectorAll('input[name="culturas"]:checked');
  const culturas = Array.from(culturaBoxes).map(cb => cb.value);

  // SAF flags
  const saf = {
    leguminosasArboreas:   document.getElementById('saf_leguminosas').checked,
    bananeiras:            document.getElementById('saf_bananeiras').checked,
    especiesAdensadoras:   document.getElementById('saf_adensadoras').checked,
    anuaisIntercalares:    document.getElementById('saf_anuais').checked,
  };

  // Solo — optional fields use null so recommender knows they're missing
  const solo = {
    pH_CaCl2:   getNum('pH_CaCl2'),
    MO:         getNum('MO'),
    P:          getNum('P'),
    K:          getNum('K'),
    Ca:         getNum('Ca'),
    Mg:         getNum('Mg'),
    Al:         getNum('Al'),
    textura:    getVal('textura') || 'argilosa',
  };

  // Optional fields
  const pH_H2O = getNumOrNull('pH_H2O');
  const HplusAl = getNumOrNull('HplusAl');
  const CTC     = getNumOrNull('CTC');
  const V       = getNumOrNull('V');
  const B       = getNumOrNull('B');
  const Zn      = getNumOrNull('Zn');

  if (pH_H2O  !== null) solo.pH_H2O   = pH_H2O;
  if (HplusAl !== null) solo.HplusAl  = HplusAl;
  if (CTC     !== null) solo.CTC      = CTC;
  if (V       !== null) solo.V        = V;
  if (B       !== null) solo.B        = B;
  if (Zn      !== null) solo.Zn       = Zn;

  // Calcário
  const calcario = {
    PRNT: parseFloat(getVal('calcario_PRNT')) || 85,
    tipo: getVal('calcario_tipo') || 'dolomitico',
  };

  return {
    cliente:     getVal('cliente'),
    propriedade: getVal('propriedade'),
    municipio:   getVal('municipio'),
    talhao:      getVal('talhao'),
    dataAnalise: getVal('dataAnalise'),
    area:        getNum('area'),
    culturas,
    cobertura:   getVal('cobertura') || 'moderada',
    saf,
    solo,
    calcario,
  };
}

function validateData(data) {
  const required = [
    { field: 'cliente',     label: 'Produtor / Cliente' },
    { field: 'propriedade', label: 'Propriedade' },
    { field: 'municipio',   label: 'Município' },
    { field: 'dataAnalise', label: 'Data da Análise' },
    { field: 'cobertura',   label: 'Cobertura do Solo' },
  ];
  for (const { field, label } of required) {
    if (!data[field]) throw new Error(`Campo obrigatório não preenchido: ${label}`);
  }

  const soloRequired = ['pH_CaCl2', 'MO', 'P', 'K', 'Ca', 'Mg', 'Al'];
  const soloLabels   = {
    pH_CaCl2: 'pH (CaCl₂)', MO: 'MO %', P: 'P mg/dm³',
    K: 'K cmolc/dm³', Ca: 'Ca cmolc/dm³', Mg: 'Mg cmolc/dm³', Al: 'Al cmolc/dm³',
  };
  for (const key of soloRequired) {
    if (data.solo[key] === undefined || data.solo[key] === null || isNaN(data.solo[key])) {
      throw new Error(`Campo obrigatório de análise de solo não preenchido: ${soloLabels[key]}`);
    }
  }
}
