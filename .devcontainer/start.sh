#!/bin/bash
# Inicia backend e frontend juntos
# Uso: bash .devcontainer/start.sh

echo "🟢 Iniciando Backend (porta 8000)..."
cd /workspaces/Teste-Claude/cacau-leilao/backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

sleep 3

echo "🟢 Iniciando Frontend (porta 3000)..."
cd /workspaces/Teste-Claude/cacau-leilao/frontend
npm run dev -- --host 0.0.0.0 --port 3000 &
FRONTEND_PID=$!

echo ""
echo "✅ App rodando!"
echo "   Frontend → porta 3000 (clique em PORTAS no VS Code)"
echo "   API Docs → porta 8000/docs"
echo ""
echo "Logins demo (senha: demo1234):"
echo "  admin@loteforte.com"
echo "  joao@produtor.com"
echo "  compras@chocobras.com"
echo ""
echo "Pressione Ctrl+C para parar tudo."

wait $BACKEND_PID $FRONTEND_PID
