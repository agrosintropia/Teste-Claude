'use strict';

require('dotenv').config();

const express      = require('express');
const multer       = require('multer');
const path         = require('path');
const fs           = require('fs');
const cookieParser = require('cookie-parser');
const { Packer }   = require('docx');

const { recommend }       = require('./lib/recommender');
const { buildLaudo }      = require('./lib/builder');
const { extractSoilData } = require('./lib/extractor');
const { salvarLaudo, listarLaudos, buscarLaudo } = require('./lib/db');
const { docxToPdf }       = require('./lib/pdf');
const { requireAuth, handleLogin } = require('./lib/auth');

// Ensure data dir exists
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

const app    = express();
const PORT   = process.env.PORT || 3000;
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter(req, file, cb) {
    const allowed = ['application/pdf','image/jpeg','image/png','image/webp'];
    cb(allowed.includes(file.mimetype) ? null : new Error('Formato não suportado. Use PDF, JPG, PNG ou WEBP.'), allowed.includes(file.mimetype));
  },
});

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Static files served without auth (login.html, style.css, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Login routes (no auth required)
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.post('/login', express.urlencoded({ extended: false }), handleLogin);

// Auth middleware — protects everything below
app.use(requireAuth);

// ── Main page ─────────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/historico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'historico.html'));
});

// ── API: generate .docx ───────────────────────────────────────────────────────

app.post('/api/generate', async (req, res) => {
  try {
    const result = recommend(req.body);
    const doc    = buildLaudo(result, req.body);
    const buffer = await Packer.toBuffer(doc);

    // Save to history (non-blocking)
    try { salvarLaudo(req.body, result); } catch (e) { console.error('Erro ao salvar histórico:', e); }

    const clienteName = (req.body.cliente || 'agrosintropia').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const filename = `laudo_${clienteName}_${Date.now()}.docx`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);
  } catch (err) {
    console.error('Erro ao gerar laudo:', err);
    res.status(500).json({ error: err.message || 'Erro interno ao gerar o laudo.' });
  }
});

// ── API: generate PDF ─────────────────────────────────────────────────────────

app.post('/api/generate-pdf', async (req, res) => {
  try {
    const result = recommend(req.body);
    const doc    = buildLaudo(result, req.body);
    const buffer = await Packer.toBuffer(doc);
    const pdf    = await docxToPdf(buffer);

    // Save to history (non-blocking)
    try { salvarLaudo(req.body, result); } catch (e) { console.error('Erro ao salvar histórico:', e); }

    const clienteName = (req.body.cliente || 'agrosintropia').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const filename = `laudo_${clienteName}_${Date.now()}.pdf`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdf);
  } catch (err) {
    console.error('Erro ao gerar laudo PDF:', err);
    res.status(500).json({ error: err.message || 'Erro interno ao gerar o laudo em PDF.' });
  }
});

// ── API: extract soil data ────────────────────────────────────────────────────

app.post('/api/extract', upload.single('laudo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    const data = await extractSoilData(req.file.buffer, req.file.mimetype);
    res.json(data);
  } catch (err) {
    console.error('Erro na extração:', err);
    res.status(500).json({ error: err.message || 'Erro ao processar o arquivo.' });
  }
});

// ── API: history ──────────────────────────────────────────────────────────────

app.get('/api/historico', (req, res) => {
  try {
    res.json(listarLaudos());
  } catch (err) {
    console.error('Erro ao listar histórico:', err);
    res.status(500).json({ error: 'Erro ao carregar histórico.' });
  }
});

// ── API: re-download from history ─────────────────────────────────────────────

app.get('/api/laudo/:id/docx', async (req, res) => {
  try {
    const laudo = buscarLaudo(Number(req.params.id));
    if (!laudo) return res.status(404).json({ error: 'Laudo não encontrado.' });

    const data   = { ...JSON.parse(laudo.solo_json || '{}'), ...buildDataFromLaudo(laudo) };
    const result = recommend(data);
    const doc    = buildLaudo(result, data);
    const buffer = await Packer.toBuffer(doc);

    const clienteName = (laudo.cliente || 'agrosintropia').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const filename = `laudo_${clienteName}_${laudo.id}.docx`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);
  } catch (err) {
    console.error('Erro ao re-gerar laudo:', err);
    res.status(500).json({ error: err.message || 'Erro ao re-gerar o laudo.' });
  }
});

app.get('/api/laudo/:id/pdf', async (req, res) => {
  try {
    const laudo = buscarLaudo(Number(req.params.id));
    if (!laudo) return res.status(404).json({ error: 'Laudo não encontrado.' });

    const data   = { ...JSON.parse(laudo.solo_json || '{}'), ...buildDataFromLaudo(laudo) };
    const result = recommend(data);
    const doc    = buildLaudo(result, data);
    const buffer = await Packer.toBuffer(doc);
    const pdf    = await docxToPdf(buffer);

    const clienteName = (laudo.cliente || 'agrosintropia').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const filename = `laudo_${clienteName}_${laudo.id}.pdf`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdf);
  } catch (err) {
    console.error('Erro ao re-gerar laudo PDF:', err);
    res.status(500).json({ error: err.message || 'Erro ao re-gerar o laudo em PDF.' });
  }
});

/** Reconstruct the data object from a saved laudo row */
function buildDataFromLaudo(laudo) {
  return {
    cliente:     laudo.cliente,
    propriedade: laudo.propriedade,
    municipio:   laudo.municipio,
    talhao:      laudo.talhao,
    observacoes: laudo.observacoes,
    culturas:    JSON.parse(laudo.culturas || '[]'),
    solo:        JSON.parse(laudo.solo_json || '{}'),
  };
}

app.listen(PORT, () => {
  console.log(`Agrosintropia — Gerador de Laudos`);
  console.log(`Servidor rodando em: http://localhost:${PORT}`);
});
