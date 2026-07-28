'use strict';

// ── Upload e extração via IA ──────────────────────────────────────────────────

const dropZone      = document.getElementById('drop-zone');
const uploadInput   = document.getElementById('upload-input');
const uploadStatus  = document.getElementById('upload-status');
const btnExtract    = document.getElementById('btn-extract');
const extractResult = document.getElementById('extract-result');
const extractError  = document.getElementById('extract-error');
const extractNotes  = document.getElementById('extract-notes');

let selectedFile = null;
let analises     = [];

// Selecionar arquivo
document.getElementById('btn-browse').addEventListener('click', () => uploadInput.click());
uploadInput.addEventListener('change', () => setFile(uploadInput.files[0]));
dropZone.addEventListener('click', (e) => { if (e.target.id !== 'btn-browse') uploadInput.click(); });
dropZone.addEventListener('dragover',  (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', ()  => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  setFile(e.dataTransfer.files[0]);
});

function setFile(file) {
  if (!file) return;
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
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

// Extrair dados
btnExtract.addEventListener('click', async () => {
  if (!selectedFile) return;
  setExtracting(true);
  hideExtractFeedback();

  try {
    const form = new FormData();
    form.append('laudo', selectedFile);
    const res  = await fetch('/api/extract', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Erro HTTP ${res.status}`);

    prefillIdFields(data);
    const filled = prefillSoilFields(data);
    adicionarAnalise(data);
    extractResult.style.display = 'block';

    const notas = [];
    if (filled === 0) {
      notas.push('⚠️ Nenhum valor de análise de solo encontrado. Verifique se o documento contém uma tabela de resultados legível.');
    } else if (filled < 5) {
      notas.push(`⚠️ Apenas ${filled} campo(s) preenchido(s). Confira os valores na Seção 4 e preencha os restantes manualmente.`);
    }
    if (data.notas) notas.push(`ℹ️ ${data.notas}`);
    if (notas.length) {
      extractNotes.innerHTML = notas.join('<br>');
      extractNotes.style.display = 'block';
    }
  } catch (err) {
    showExtractError(err.message || 'Erro ao processar o arquivo.');
  } finally {
    setExtracting(false);
  }
});

function setExtracting(on) {
  btnExtract.disabled = on;
  btnExtract.classList.toggle('loading', on);
  document.getElementById('spinner-extract').style.display = on ? 'block' : 'none';
  document.getElementById('btn-extract-text').textContent = on ? 'Extraindo com IA...' : '⚡ Extrair Dados com IA';
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

// ── Preenchimento de campos ───────────────────────────────────────────────────

function prefillSoilFields(data) {
  const fields = ['pH_CaCl2', 'pH_H2O', 'MO', 'P', 'K', 'Ca', 'Mg', 'Al', 'HplusAl', 'CTC', 'V', 'B', 'Zn'];
  let filled = 0;
  for (const key of fields) {
    if (data[key] !== undefined && data[key] !== null) {
      const el = document.getElementById(key);
      if (el) { el.value = data[key]; flashFill(el); filled++; }
    }
  }
  if (data.textura) {
    const sel = document.getElementById('textura');
    if (sel) sel.value = data.textura;
  }
  if (filled > 0) document.getElementById('pH_CaCl2')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return filled;
}

function prefillIdFields(data) {
  const fields = { cliente: 'cliente', propriedade: 'propriedade', municipio: 'municipio',
                   talhao: 'talhao', dataAnalise: 'dataAnalise', area: 'area' };
  for (const [key, id] of Object.entries(fields)) {
    if (data[key] != null && data[key] !== '') {
      const el = document.getElementById(id);
      if (el && !el.value.trim()) {
        el.value = data[key];
        flashFill(el);
        if (id === 'dataAnalise') verificarIdadeAnalise();
      }
    }
  }
}

function flashFill(el) {
  el.classList.remove('ai-filled');
  void el.offsetWidth;
  el.classList.add('ai-filled');
}

// ── Múltiplas análises (média) ────────────────────────────────────────────────

function adicionarAnalise(data) {
  analises.push(data);
  document.getElementById('multi-analise-bar').style.display = 'flex';
  document.getElementById('analises-count').textContent = analises.length === 1
    ? '1 análise carregada'
    : `${analises.length} análises carregadas — use a média para recomendação`;
  document.getElementById('btn-media').style.display = analises.length >= 2 ? 'inline-flex' : 'none';
}

document.getElementById('btn-media').addEventListener('click', () => {
  if (analises.length < 2) return;
  const numKeys = ['pH_CaCl2', 'pH_H2O', 'MO', 'P', 'K', 'Ca', 'Mg', 'Al', 'HplusAl', 'CTC', 'V', 'B', 'Zn'];
  const media = {};
  for (const key of numKeys) {
    const vals = analises.map(a => a[key]).filter(v => v != null && !isNaN(v));
    if (vals.length) media[key] = parseFloat((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(3));
  }
  const texturas = analises.map(a => a.textura).filter(Boolean);
  if (texturas.length) {
    const freq = {};
    texturas.forEach(t => freq[t] = (freq[t] || 0) + 1);
    media.textura = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
  }
  prefillSoilFields(media);
  extractResult.style.display = 'block';
  extractNotes.textContent = `ℹ️ Média de ${analises.length} análises aplicada nos campos de solo.`;
  extractNotes.style.display = 'block';
});

document.getElementById('btn-limpar-analises').addEventListener('click', () => {
  analises = [];
  document.getElementById('multi-analise-bar').style.display = 'none';
});

// ── Alerta de análise desatualizada ───────────────────────────────────────────

function verificarIdadeAnalise() {
  const val   = document.getElementById('dataAnalise').value;
  const aviso = document.getElementById('aviso-analise-antiga');
  if (!val) { aviso.style.display = 'none'; return; }
  const meses = (Date.now() - new Date(val).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  aviso.style.display = meses > 12 ? 'block' : 'none';
}

document.getElementById('dataAnalise').addEventListener('change', verificarIdadeAnalise);

// ── Coleta e validação dos dados do formulário ────────────────────────────────

function getVal(id)       { return (document.getElementById(id)?.value ?? '').trim(); }
function getNum(id)       { const v = getVal(id); return v === '' ? undefined : parseFloat(v); }
function getNumOrNull(id) { const v = getVal(id); return v === '' ? null : parseFloat(v); }

function collectFormData() {
  const culturas = Array.from(document.querySelectorAll('input[name="culturas"]:checked')).map(cb => cb.value);

  const solo = {
    pH_CaCl2: getNum('pH_CaCl2'),
    MO:       getNum('MO'),
    P:        getNum('P'),
    K:        getNum('K'),
    Ca:       getNum('Ca'),
    Mg:       getNum('Mg'),
    Al:       getNum('Al'),
    textura:  getVal('textura') || 'argilosa',
  };

  for (const key of ['pH_H2O', 'HplusAl', 'CTC', 'V', 'B', 'Zn']) {
    const v = getNumOrNull(key);
    if (v !== null) solo[key] = v;
  }

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
    saf: {
      leguminosasArboreas: document.getElementById('saf_leguminosas').checked,
      bananeiras:          document.getElementById('saf_bananeiras').checked,
      especiesAdensadoras: document.getElementById('saf_adensadoras').checked,
      anuaisIntercalares:  document.getElementById('saf_anuais').checked,
    },
    solo,
    calcario: {
      PRNT: parseFloat(getVal('calcario_PRNT')) || 85,
      tipo: getVal('calcario_tipo') || 'dolomitico',
    },
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
  const soloLabels = { pH_CaCl2: 'pH (CaCl₂)', MO: 'MO %', P: 'P mg/dm³',
                       K: 'K cmolc/dm³', Ca: 'Ca cmolc/dm³', Mg: 'Mg cmolc/dm³', Al: 'Al cmolc/dm³' };
  for (const [key, label] of Object.entries(soloLabels)) {
    if (data.solo[key] === undefined || isNaN(data.solo[key])) {
      throw new Error(`Campo obrigatório de solo não preenchido: ${label}`);
    }
  }
}

// ── Download de documentos ────────────────────────────────────────────────────

async function generate(endpoint, ext, btn, spinnerId, textId, defaultLabel) {
  const errorDiv = document.getElementById('error-msg');
  errorDiv.style.display = 'none';
  btn.disabled = true;
  btn.classList.add('loading');
  document.getElementById(spinnerId).style.display = 'block';
  document.getElementById(textId).textContent = 'Gerando...';

  try {
    const data = collectFormData();
    validateData(data);

    const res = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro desconhecido.' }));
      throw new Error(err.error || `Erro HTTP ${res.status}`);
    }

    const blob = await res.blob();
    const cd   = res.headers.get('Content-Disposition') || '';
    const name = cd.match(/filename="([^"]+)"/)?.[1] || `documento_${Date.now()}.${ext}`;
    const a    = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch (err) {
    errorDiv.textContent = '⚠️ ' + (err.message || 'Ocorreu um erro inesperado.');
    errorDiv.style.display = 'block';
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } finally {
    btn.disabled = false;
    btn.classList.remove('loading');
    document.getElementById(spinnerId).style.display = 'none';
    document.getElementById(textId).textContent = defaultLabel;
  }
}

document.getElementById('form').addEventListener('submit', (e) => {
  e.preventDefault();
  generate('/api/generate', 'docx', document.getElementById('btn-gerar'),
           'spinner', 'btn-text', '🌱 Gerar Laudo (.docx)');
});

document.getElementById('btn-pdf').addEventListener('click', () => {
  generate('/api/generate-pdf', 'pdf', document.getElementById('btn-pdf'),
           'spinner-pdf', 'btn-pdf-text', '📄 Gerar Laudo (.pdf)');
});

document.getElementById('btn-planilha').addEventListener('click', () => {
  generate('/api/generate-planilha', 'xlsx', document.getElementById('btn-planilha'),
           'spinner-planilha', 'btn-planilha-text', '📊 Planilha para Projeto (.xlsx)');
});
