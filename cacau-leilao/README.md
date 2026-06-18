# LoteForte — Valorizando o bom cacau

Plataforma de leilão e rastreabilidade ESG do cacau brasileiro.

## Início rápido (Docker)

```bash
git clone <repo> && cd cacau-leilao
docker compose up --build
```

Aguarde ~60s para o banco inicializar e o frontend compilar.

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API (docs) | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |

## Usuários de demonstração

| Perfil | E-mail | Senha |
|---|---|---|
| Admin | admin@loteforte.com | demo1234 |
| Produtor (João) | joao@produtor.com | demo1234 |
| Produtor (Maria) | maria@produtor.com | demo1234 |
| Produtor (Carlos) | carlos@produtor.com | demo1234 |
| Atravessador | compras@chocobras.com | demo1234 |
| Moageira | compras@moageirasl.com | demo1234 |
| Auditor | ana@auditoria.com | demo1234 |

O seed já cria um **lote em leilão** (BA-SULBA-A-2026-W25) com 6.500 kg, lance mínimo R$ 8,50/kg, encerramento em ~48h.

## Desenvolvimento local (sem Docker)

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload   # http://localhost:8000/docs

# Frontend (outro terminal)
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

## Stack

- **Backend:** FastAPI · SQLAlchemy 2.0 async · PostgreSQL 16 · Redis · Celery
- **Frontend:** React 18 · TypeScript · TanStack Query 5 · Tailwind CSS 3 · Vite
- **Auth:** JWT RS256, roles: produtor · atravessador · moageira · auditor · admin
