'use strict';

const Anthropic = require('@anthropic-ai/sdk');

const PROMPT = `Você é um assistente agrônomo especializado em análise de solos tropicais brasileiros.

Analise este laudo de análise de solo e extraia TODOS os valores numéricos encontrados.

REGRAS DE EXTRAÇÃO:
1. Potássio (K): se estiver em mg/dm³ (valores típicos entre 10 e 400), converta para cmolc/dm³ dividindo por 391. Se já estiver em cmolc/dm³ (valores típicos entre 0,05 e 1,5), use diretamente.
2. Matéria Orgânica (MO): extraia o valor numérico independente da unidade (%, g/dm³, dag/kg — são equivalentes para solos tropicais com densidade ~1).
3. V%: pode aparecer como "V%", "Sat. Bases (%)", "Saturação por Bases" ou similar.
4. H+Al: pode aparecer como "H+Al", "Acidez Potencial" ou "Tampão SMP".
5. Substitua vírgula por ponto decimal em todos os números (padrão brasileiro: 4,8 → 4.8).
6. Textura: "argilosa" se mencionar argiloso, muito argiloso, ou argila > 35%. "media_arenosa" se franco-arenoso, arenoso, ou argila < 35%.

Retorne APENAS um JSON válido, sem texto antes ou depois:
{
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
  "notas": "string com conversões realizadas e campos não encontrados"
}`;

/**
 * Extrai valores de análise de solo de um PDF ou imagem usando Claude.
 * @param {Buffer} buffer - conteúdo do arquivo
 * @param {string} mimeType - 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp'
 * @returns {Promise<object>} valores extraídos no formato esperado pelo recommender
 */
async function extractSoilData(buffer, mimeType) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada no servidor.');

  const client = new Anthropic({ apiKey });

  const isImage = mimeType.startsWith('image/');
  const contentBlock = isImage
    ? { type: 'image',    source: { type: 'base64', media_type: mimeType,              data: buffer.toString('base64') } }
    : { type: 'document', source: { type: 'base64', media_type: 'application/pdf',     data: buffer.toString('base64') } };

  const message = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages:   [{ role: 'user', content: [contentBlock, { type: 'text', text: PROMPT }] }],
  });

  const text = message.content[0]?.text || '';
  const jsonMatch = text.match(/\{[\s\S]+\}/);
  if (!jsonMatch) throw new Error('Claude não conseguiu extrair dados estruturados do arquivo. Tente uma imagem mais nítida ou o PDF original do laboratório.');

  const extracted = JSON.parse(jsonMatch[0]);

  // Garantir que todos os campos numéricos são number ou undefined (não null)
  const numericFields = ['pH_CaCl2','pH_H2O','MO','P','K','Ca','Mg','Al','HplusAl','CTC','V','B','Zn'];
  const result = {};
  for (const f of numericFields) {
    const v = extracted[f];
    if (v !== null && v !== undefined && !isNaN(Number(v))) result[f] = Number(v);
  }
  if (extracted.textura) result.textura = extracted.textura;
  if (extracted.notas)   result.notas   = extracted.notas;

  return result;
}

module.exports = { extractSoilData };
