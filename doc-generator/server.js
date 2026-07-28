'use strict';

require('dotenv').config();

const express    = require('express');
const multer     = require('multer');
const path       = require('path');
const { Packer } = require('docx');

const { recommend }       = require('./lib/recommender');
const { buildLaudo }      = require('./lib/builder');
const { buildPlanilha }   = require('./lib/planilha');
const { extractSoilData } = require('./lib/extractor');
const { docxToPdf }       = require('./lib/pdf');

const app    = express();
const PORT   = process.env.PORT || 3000;
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 15 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const ok = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Formato não suportado. Use PDF, JPG, PNG ou WEBP.'), ok);
  },
});

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ── Extração via IA ───────────────────────────────────────────────────────────

app.post('/api/extract', upload.single('laudo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    res.json(await extractSoilData(req.file.buffer, req.file.mimetype));
  } catch (err) {
    console.error('Erro na extração:', err);
    res.status(500).json({ error: err.message || 'Erro ao processar o arquivo.' });
  }
});

// ── Geração de documentos ─────────────────────────────────────────────────────

app.post('/api/generate', async (req, res) => {
  try {
    const buffer = await Packer.toBuffer(buildLaudo(recommend(req.body), req.body));
    res.setHeader('Content-Disposition', `attachment; filename="laudo_${slug(req.body.cliente)}_${Date.now()}.docx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);
  } catch (err) {
    console.error('Erro ao gerar laudo:', err);
    res.status(500).json({ error: err.message || 'Erro ao gerar o laudo.' });
  }
});

app.post('/api/generate-pdf', async (req, res) => {
  try {
    const docx = await Packer.toBuffer(buildLaudo(recommend(req.body), req.body));
    const pdf  = await docxToPdf(docx);
    res.setHeader('Content-Disposition', `attachment; filename="laudo_${slug(req.body.cliente)}_${Date.now()}.pdf"`);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdf);
  } catch (err) {
    console.error('Erro ao gerar PDF:', err);
    res.status(500).json({ error: err.message || 'Erro ao gerar o PDF.' });
  }
});

app.post('/api/generate-planilha', async (req, res) => {
  try {
    const buffer = await buildPlanilha(recommend(req.body), req.body);
    res.setHeader('Content-Disposition', `attachment; filename="planilha_${slug(req.body.cliente)}_${Date.now()}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('Erro ao gerar planilha:', err);
    res.status(500).json({ error: err.message || 'Erro ao gerar a planilha.' });
  }
});

function slug(str) {
  return (str || 'agrosintropia').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
}

app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
