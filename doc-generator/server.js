'use strict';

require('dotenv').config();

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const { Packer } = require('docx');

const { recommend }      = require('./lib/recommender');
const { buildLaudo }     = require('./lib/builder');
const { extractSoilData } = require('./lib/extractor');

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
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/generate', async (req, res) => {
  try {
    const result = recommend(req.body);
    const doc    = buildLaudo(result, req.body);
    const buffer = await Packer.toBuffer(doc);

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

app.listen(PORT, () => {
  console.log(`Agrosintropia — Gerador de Laudos`);
  console.log(`Servidor rodando em: http://localhost:${PORT}`);
});
