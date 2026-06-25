'use strict';
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs   = require('fs');

const dataDir = path.join(__dirname, '../data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'laudos.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS laudos (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    cliente        TEXT,
    propriedade    TEXT,
    municipio      TEXT,
    talhao         TEXT,
    culturas       TEXT,
    observacoes    TEXT,
    solo_json      TEXT,
    resultado_json TEXT,
    agronomo_json  TEXT
  )
`);

// Migration: add agronomo_json if DB was created before this column existed
try { db.exec(`ALTER TABLE laudos ADD COLUMN agronomo_json TEXT`); } catch (_) { /* column already exists */ }

function salvarLaudo(data, resultado) {
  const stmt = db.prepare(`
    INSERT INTO laudos (cliente, propriedade, municipio, talhao, culturas, observacoes, solo_json, resultado_json, agronomo_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    data.cliente || null,
    data.propriedade || null,
    data.municipio || null,
    data.talhao || null,
    JSON.stringify(data.culturas || []),
    data.observacoes || null,
    JSON.stringify(data.solo || {}),
    JSON.stringify(resultado || {}),
    data.agronomo ? JSON.stringify(data.agronomo) : null
  );
  return info.lastInsertRowid;
}

function listarLaudos(limit = 50) {
  return db.prepare(`
    SELECT id, created_at, cliente, propriedade, municipio, talhao, culturas
    FROM laudos ORDER BY id DESC LIMIT ?
  `).all(limit);
}

function buscarLaudo(id) {
  return db.prepare('SELECT * FROM laudos WHERE id = ?').get(id);
}

module.exports = { salvarLaudo, listarLaudos, buscarLaudo };
