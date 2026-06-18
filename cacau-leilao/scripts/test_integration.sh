#!/usr/bin/env bash
# Roda testes de integração contra um PostgreSQL real via Docker.
# Uso: ./scripts/test_integration.sh [pytest args extras]
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."

echo "▶ Subindo banco de teste..."
docker compose -f "$ROOT/docker-compose.yml" up -d db
sleep 3  # aguarda pg_isready

echo "▶ Criando banco loteforte_test (se não existir)..."
docker compose -f "$ROOT/docker-compose.yml" exec -T db \
  psql -U loteforte -c "CREATE DATABASE loteforte_test;" 2>/dev/null || true

echo "▶ Rodando testes de integração..."
cd "$ROOT/backend"
DATABASE_URL_TEST="postgresql+asyncpg://loteforte:loteforte@localhost:5432/loteforte_test" \
  python -m pytest tests/integration/ -v "$@"

echo "▶ Limpando banco de teste..."
docker compose -f "$ROOT/docker-compose.yml" exec -T db \
  psql -U loteforte -c "DROP DATABASE IF EXISTS loteforte_test;" 2>/dev/null || true

echo "✓ Testes de integração concluídos."
