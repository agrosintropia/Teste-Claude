#!/bin/bash
# LoteForte — inicia tudo em UMA porta só (8000), sem proxy, sem dois terminais.
# Uso: bash .devcontainer/start.sh
set -e

ROOT=/workspaces/Teste-Claude/cacau-leilao

# ── Backend: dependências + .env ─────────────────────────────
echo "📦 Instalando dependências do backend..."
cd "$ROOT/backend"
pip install -r requirements.txt

cat > .env << 'EOF'
DATABASE_URL=sqlite+aiosqlite:///./loteforte.db
DATABASE_URL_SYNC=sqlite:///./loteforte.db
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=loteforte-dev-secret-key-2024
ACCESS_TOKEN_EXPIRE_MINUTES=1440
EOF

# ── Frontend: compila para arquivos estáticos ────────────────
echo "🛠️  Compilando o frontend (pode levar 1-2 min)..."
cd "$ROOT/frontend"
npm install --silent
npm run build

# ── Sobe UM servidor que serve API + frontend juntos ─────────
echo ""
echo "✅ Pronto! Abra a porta 8000 na aba PORTAS do VS Code."
echo ""
echo "Logins demo (senha: demo1234):"
echo "  admin@loteforte.com  ·  joao@produtor.com  ·  compras@chocobras.com"
echo ""
cd "$ROOT/backend"
uvicorn app.main:app --host 0.0.0.0 --port 8000
