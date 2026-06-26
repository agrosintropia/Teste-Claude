'use strict';

// ── Upload e extração via IA ──────────────────────────────────────────────────

const dropZone      = document.getElementById('drop-zone');
const uploadInput   = document.getElementById('upload-input');
const btnBrowse     = document.getElementById('btn-browse');
const btnExtract    = document.getElementById('btn-extract');
const uploadStatus  = document.getElementById('upload-status');
const extractResult = document.getElementById('extract-result');
const extractError  = document.getElementById('extract-error');
const extractNotes  = document.getElementById('extract-notes');

let selectedFile = null;
let analises = []; // pool de análises extraídas para cálculo de média

btnBrowse.addEventListener('click', () => uploadInput.click());
uploadInput.addEventListener('change', () => setFile(uploadInput.files[0]));

dropZone.addEventListener('click', (e) => { if (e.target !== btnBrowse) uploadInput.click(); });
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  setFile(e.dataTransfer.files[0]);
});

function setFile(file) {
  if (!file) return;
  const allowed = ['application/pdf','image/jpeg','image/png','image/webp'];
  if (!allowed.includes(file.type)) {
    showExtractError('Formato inválido. Use PDF, JPG, PNG ou WEBP.');
    return;
  }
  selectedFile = file;
  dropZone.classList.add('has-file');
  uploadStatus.textContent = `📎 ${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
  uploadStatus.style.display = 'block';
  btnExtract.style.display = 'flex';
  hideExtractFeedback();
}

btnExtract.addEventListener('click', async () => {
  if (!selectedFile) return;

  btnExtract.disabled = true;
  btnExtract.classList.add('loading');
  document.getElementById('spinner-extract').style.display = 'block';
  document.getElementById('btn-extract-text').textContent = 'Extraindo com IA...';
  hideExtractFeedback();

  try {
    const formData = new FormData();
    formData.append('laudo', selectedFile);

    const res = await fetch('/api/extract', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Erro HTTP ${res.status}`);

    prefillIdFields(data);
    prefillSoilFields(data);
    adicionarAnalise(data);

    extractResult.style.display = 'block';
    if (data.notas) {
      extractNotes.textContent = `ℹ️ ${data.notas}`;
      extractNotes.style.display = 'block';
    }
  } catch (err) {
    showExtractError(err.message || 'Erro ao processar o arquivo.');
  } finally {
    btnExtract.disabled = false;
    btnExtract.classList.remove('loading');
    document.getElementById('spinner-extract').style.display = 'none';
    document.getElementById('btn-extract-text').textContent = '⚡ Extrair Dados com IA';
  }
});

/** Pre-preenche os campos de análise de solo e anima os que foram preenchidos. */
function prefillSoilFields(data) {
  const mapping = {
    pH_CaCl2: 'pH_CaCl2', pH_H2O: 'pH_H2O',
    MO: 'MO', P: 'P', K: 'K',
    Ca: 'Ca', Mg: 'Mg', Al: 'Al',
    HplusAl: 'HplusAl', CTC: 'CTC', V: 'V',
    B: 'B', Zn: 'Zn',
  };
  for (const [key, id] of Object.entries(mapping)) {
    if (data[key] !== undefined && data[key] !== null) {
      const el = document.getElementById(id);
      if (el) {
        el.value = data[key];
        el.classList.remove('ai-filled');
        void el.offsetWidth; // reflow para reiniciar animação
        el.classList.add('ai-filled');
      }
    }
  }
  if (data.textura) {
    const sel = document.getElementById('textura');
    if (sel) sel.value = data.textura;
  }
  // rolar para a seção de solo
  document.getElementById('pH_CaCl2')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showExtractError(msg) {
  extractError.textContent = '⚠️ ' + msg;
  extractError.style.display = 'block';
}
function hideExtractFeedback() {
  extractResult.style.display = 'none';
  extractError.style.display  = 'none';
  extractNotes.style.display  = 'none';
  extractNotes.textContent    = '';
}

/** Preenche campos de identificação com dados da IA, sem sobrescrever o que o usuário já digitou. */
function prefillIdFields(data) {
  const mapping = {
    cliente:     'cliente',
    propriedade: 'propriedade',
    municipio:   'municipio',
    talhao:      'talhao',
    dataAnalise: 'dataAnalise',
    area:        'area',
  };
  for (const [key, id] of Object.entries(mapping)) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
      const el = document.getElementById(id);
      if (el && !el.value.trim()) {
        el.value = data[key];
        el.classList.remove('ai-filled');
        void el.offsetWidth;
        el.classList.add('ai-filled');
        if (id === 'dataAnalise') verificarIdadeAnalise();
      }
    }
  }
}

/** Adiciona análise ao pool e atualiza a barra de múltiplas análises. */
function adicionarAnalise(data) {
  analises.push(data);
  const bar = document.getElementById('multi-analise-bar');
  const count = document.getElementById('analises-count');
  bar.style.display = 'flex';
  count.textContent = analises.length === 1
    ? '1 análise carregada'
    : `${analises.length} análises carregadas — use a média para recomendação`;
  document.getElementById('btn-media').style.display = analises.length >= 2 ? 'inline-flex' : 'none';
}

/** Calcula a média campo a campo de todas as análises acumuladas e preenche o formulário. */
function calcularMedia() {
  if (analises.length < 2) return;
  const numKeys = ['pH_CaCl2','pH_H2O','MO','P','K','Ca','Mg','Al','HplusAl','CTC','V','B','Zn'];
  const media = {};
  for (const key of numKeys) {
    const vals = analises.map(a => a[key]).filter(v => v !== undefined && v !== null && !isNaN(v));
    if (vals.length > 0) media[key] = parseFloat((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(3));
  }
  // Textura: usar a mais frequente
  const texturas = analises.map(a => a.textura).filter(Boolean);
  if (texturas.length > 0) {
    const freq = {};
    texturas.forEach(t => freq[t] = (freq[t] || 0) + 1);
    media.textura = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
  }
  media.notas = `Média calculada de ${analises.length} análises.`;
  prefillSoilFields(media);
  extractResult.style.display = 'block';
  extractNotes.textContent = `ℹ️ Média de ${analises.length} análises aplicada nos campos de solo.`;
  extractNotes.style.display = 'block';
}

/** Limpa o pool de análises. */
function limparAnalises() {
  analises = [];
  document.getElementById('multi-analise-bar').style.display = 'none';
}

document.getElementById('btn-media').addEventListener('click', calcularMedia);
document.getElementById('btn-limpar-analises').addEventListener('click', limparAnalises);

// ── Alerta de análise desatualizada ───────────────────────────────────────────

function verificarIdadeAnalise() {
  const val = document.getElementById('dataAnalise').value;
  const aviso = document.getElementById('aviso-analise-antiga');
  if (!val) { aviso.style.display = 'none'; return; }
  const meses = (Date.now() - new Date(val).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  aviso.style.display = meses > 12 ? 'block' : 'none';
}

document.getElementById('dataAnalise').addEventListener('change', verificarIdadeAnalise);

// ── Geração do laudo ──────────────────────────────────────────────────────────

async function submitForm(endpoint, format, btn, spinner, btnTextEl, defaultLabel, ext) {
  const errorDiv = document.getElementById('error-msg');

  // Reset error
  errorDiv.style.display = 'none';
  errorDiv.textContent   = '';

  // Show loading state
  btn.disabled = true;
  btn.classList.add('loading');
  spinner.style.display = 'block';
  btnTextEl.textContent = 'Gerando laudo...';

  try {
    const data = collectFormData();
    validateData(data);

    const response = await fetch(endpoint, {
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
    const filename = getFilenameFromResponse(response) || `laudo_${Date.now()}.${ext}`;
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
    btnTextEl.textContent = defaultLabel;
  }
}

document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  await submitForm(
    '/api/generate', 'docx',
    document.getElementById('btn-gerar'),
    document.getElementById('spinner'),
    document.getElementById('btn-text'),
    '🌱 Gerar Laudo (.docx)',
    'docx'
  );
});

document.getElementById('btn-pdf').addEventListener('click', async () => {
  await submitForm(
    '/api/generate-pdf', 'pdf',
    document.getElementById('btn-pdf'),
    document.getElementById('spinner-pdf'),
    document.getElementById('btn-pdf-text'),
    '📄 Gerar Laudo (.pdf)',
    'pdf'
  );
});

document.getElementById('btn-planilha').addEventListener('click', async () => {
  await submitForm(
    '/api/generate-planilha', 'xlsx',
    document.getElementById('btn-planilha'),
    document.getElementById('spinner-planilha'),
    document.getElementById('btn-planilha-text'),
    '📊 Planilha para Projeto (.xlsx)',
    'xlsx'
  );
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
    observacoes: getVal('observacoes'),
    agronomo: {
      nome: getVal('agronomo_nome'),
      crea: getVal('agronomo_crea'),
    },
    projeto: {
      nome:    getVal('projeto_nome'),
      linear:  getNum('projeto_linear'),
      area_m2: getNum('projeto_area_m2'),
    },
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
