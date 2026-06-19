#!/bin/bash
set -e

echo "🚀 Configurando LoteForte..."

# ── Backend ──────────────────────────────────────────────────
cd /workspaces/Teste-Claude/cacau-leilao/backend
pip install -r requirements.txt --quiet

# Cria .env com SQLite (sem precisar de PostgreSQL)
cat > .env << 'EOF'
DATABASE_URL=sqlite+aiosqlite:///./loteforte.db
DATABASE_URL_SYNC=sqlite:///./loteforte.db
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=loteforte-dev-secret-key-2024
ACCESS_TOKEN_EXPIRE_MINUTES=1440
EOF

echo "🗄️  Inicializando banco de dados SQLite..."
python init_db.py

# ── Frontend ─────────────────────────────────────────────────
cd /workspaces/Teste-Claude/cacau-leilao/frontend
npm install --silent

echo ""
echo "✅ Setup concluído!"
echo ""
echo "Para iniciar o app, abra 2 terminais e rode:"
echo ""
echo "  Terminal 1 (Backend):"
echo "  cd /workspaces/Teste-Claude/cacau-leilao/backend"
echo "  uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
echo ""
echo "  Terminal 2 (Frontend):"
echo "  cd /workspaces/Teste-Claude/cacau-leilao/frontend"
echo "  npm run dev -- --host 0.0.0.0 --port 3000"
echo ""
