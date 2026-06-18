#!/usr/bin/env bash
# Roda testes unitários (sem banco, sem cryptography).
# Uso: ./scripts/test_unit.sh
set -e
cd "$(dirname "${BASH_SOURCE[0]}")/../backend"
python -m pytest tests/ --ignore=tests/integration --noconftest -q "$@"
echo "✓ Testes unitários concluídos."
