'use strict';

const Anthropic = require('@anthropic-ai/sdk');

const PROMPT = `Você é um assistente agrônomo especializado em análise de solos tropicais brasileiros.

PASSO 1 — CONTE AS AMOSTRAS ANTES DE EXTRAIR:
Observe o documento com atenção. Laudos de laboratório brasileiros apresentam múltiplas amostras de diversas formas:
- Linhas ou colunas separadas na mesma tabela (cada coluna = uma amostra)
- Tabelas repetidas em blocos verticais (cada bloco = uma amostra)
- Seções nomeadas: "Talhão 1 / Talhão 2", "A1 / A2 / A3", "Gleba A / Gleba B", "Ponto 1 / Ponto 2", "Amostra 01 / Amostra 02", etc.
- Páginas separadas do mesmo laudo

Antes de extrair, mentalmente conte: "Quantas amostras distintas existem neste documento?" Cada conjunto independente de valores de pH, P, K, Ca, Mg, Al é uma amostra separada. NUNCA retorne menos amostras do que realmente existem no documento.

PASSO 2 — EXTRAIA CADA AMOSTRA INDIVIDUALMENTE:
Para cada amostra identificada no Passo 1, preencha um objeto no array "amostras".
- NÃO combine amostras. NÃO extraia apenas a primeira. NÃO omita amostras por serem semelhantes.
- Se uma coluna de identificação mostrar "T1, T2, T3", extraia três objetos separados.

REGRAS DE EXTRAÇÃO DOS DADOS DE SOLO (aplicar em cada amostra):
1. Potássio (K): se em mg/dm³ (valores entre 10 e 400), divida por 391 para obter cmolc/dm³. Se já em cmolc/dm³ (entre 0,05 e 1,5), use diretamente.
2. Matéria Orgânica (MO): extraia o valor numérico (%, g/dm³ e dag/kg são equivalentes).
3. V%: pode aparecer como "V%", "Sat. Bases (%)" ou "Saturação por Bases".
4. H+Al: pode aparecer como "H+Al", "Acidez Potencial" ou "Tampão SMP".
5. Substitua vírgula por ponto decimal (4,8 → 4.8).
6. Textura: "argilosa" se argila > 35% ou mencionado "argiloso/muito argiloso". "media_arenosa" caso contrário.
7. id: use o identificador mais específico (talhão, gleba, ponto, número). Se não houver, use "Amostra 1", "Amostra 2", etc.

REGRAS DE EXTRAÇÃO DE IDENTIFICAÇÃO (dados gerais, extraídos uma única vez):
- cliente: nome do produtor/agricultor/cliente exatamente como aparece
- propriedade: nome da fazenda, sítio ou propriedade
- municipio: município e UF no formato "Município-UF"
- dataAnalise: data da coleta ou análise no formato YYYY-MM-DD
- area: área total em hectares se mencionada

Retorne APENAS um JSON válido neste formato (sem texto antes ou depois):
{
  "identificacao": {
    "cliente": "string ou null",
    "propriedade": "string ou null",
    "municipio": "string ou null",
    "dataAnalise": "YYYY-MM-DD ou null",
    "area": número ou null
  },
  "amostras": [
    {
      "id": "identificador da amostra",
      "pH_CaCl2": número ou null,
      "pH_H2O": número ou null,
      "MO": número ou null,
      "P": número ou null,
      "K": número ou null,
      "Ca": número ou null,
      "Mg": número ou null,
      "Al": número ou null,
      "HplusAl": número ou null,
      "CTC": número ou null,
      "V": número ou null,
      "B": número ou null,
      "Zn": número ou null,
      "textura": "argilosa" ou "media_arenosa" ou null,
      "notas": "conversões e campos não encontrados"
    }
  ]
}

LEMBRETE FINAL: o array "amostras" DEVE conter um objeto por amostra encontrada no documento. Se houver 3 talhões, retorne 3 objetos. Se houver apenas 1 amostra, retorne array com 1 objeto.`;

const NUM_FIELDS = ['pH_CaCl2','pH_H2O','MO','P','K','Ca','Mg','Al','HplusAl','CTC','V','B','Zn'];
const ID_FIELDS  = ['cliente','propriedade','municipio','dataAnalise'];

function processAmostra(am, idx) {
  const result = { id: (am.id && String(am.id).trim()) || `Amostra ${idx + 1}` };
  for (const f of NUM_FIELDS) {
    const v = am[f];
    if (v !== null && v !== undefined && !isNaN(Number(v))) result[f] = Number(v);
  }
  if (am.textura) result.textura = am.textura;
  if (am.notas)   result.notas   = am.notas;
  return result;
}

function processId(idObj) {
  const result = {};
  for (const f of ID_FIELDS) {
    if (idObj[f]) result[f] = String(idObj[f]).trim();
  }
  if (idObj.area !== null && idObj.area !== undefined && !isNaN(Number(idObj.area))) {
    result.area = Number(idObj.area);
  }
  return result;
}

/**
 * Extrai amostras de análise de solo de um PDF ou imagem usando Claude.
 * Retorna { amostras: [...], identificacao: {...} }
 * Sempre um array, mesmo que haja apenas uma amostra.
 */
async function extractSoilData(buffer, mimeType) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada no servidor.');

  const client = new Anthropic({ apiKey });

  const isImage = mimeType.startsWith('image/');
  const contentBlock = isImage
    ? { type: 'image',    source: { type: 'base64', media_type: mimeType,           data: buffer.toString('base64') } }
    : { type: 'document', source: { type: 'base64', media_type: 'application/pdf',  data: buffer.toString('base64') } };

  const message = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 8000,
    messages:   [{ role: 'user', content: [contentBlock, { type: 'text', text: PROMPT }] }],
  });

  const text = message.content[0]?.text || '';
  const jsonMatch = text.match(/\{[\s\S]+\}/);
  if (!jsonMatch) throw new Error('Claude não conseguiu extrair dados estruturados do arquivo. Tente uma imagem mais nítida ou o PDF original do laboratório.');

  const cleanJson = jsonMatch[0]
    .replace(/,\s*([\}\]])/g, '$1')
    .replace(/:\s*"([^"]*)"/g, (_, v) => `: "${v.replace(/\n/g, ' ').replace(/\r/g, '')}"`);

  let extracted;
  try {
    extracted = JSON.parse(cleanJson);
  } catch (e) {
    throw new Error(`Falha ao interpretar resposta da IA. Tente novamente ou use o PDF original. (${e.message})`);
  }

  // Support both new { amostras, identificacao } format and old flat format
  let rawAmostras, rawId;
  if (extracted.amostras && Array.isArray(extracted.amostras)) {
    rawAmostras  = extracted.amostras;
    rawId        = extracted.identificacao || {};
  } else {
    // Old flat format — wrap in array for compatibility
    rawAmostras  = [extracted];
    rawId        = { cliente: extracted.cliente, propriedade: extracted.propriedade,
                     municipio: extracted.municipio, dataAnalise: extracted.dataAnalise, area: extracted.area };
  }

  const amostras      = rawAmostras.map(processAmostra);
  const identificacao = processId(rawId);

  // Log
  const soilKeys = ['pH_CaCl2','MO','P','K','Ca','Mg','Al'];
  amostras.forEach((a, i) => {
    const found   = soilKeys.filter(k => a[k] !== undefined);
    const missing = soilKeys.filter(k => a[k] === undefined);
    console.log(`[extractor] Amostra ${i+1} (${a.id}): encontrado=[${found.join(', ')||'nenhum'}] ausente=[${missing.join(', ')||'nenhum'}]`);
    if (a.notas) console.log(`[extractor] Notas: ${a.notas}`);
  });

  return { amostras, identificacao };
}

module.exports = { extractSoilData };
