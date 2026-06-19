import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.limiter import limiter
from app.api.v1.router import api_router
from app.db.seed import init_database

# Caminho para o frontend compilado (npm run build → frontend/dist)
FRONTEND_DIST = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Cria tabelas e semeia usuários demo automaticamente ao subir.
    await init_database()
    yield


app = FastAPI(
    title="LoteForte — Valorizando o bom cacau",
    description="Plataforma de leilão e rastreabilidade ESG do cacau brasileiro.",
    version="0.1.0",
    docs_url="/docs",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restringir em produção
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "loteforte-api"}


# ── Servir o frontend compilado na mesma porta (sem proxy) ──────────────
# As rotas de API acima têm precedência; o que sobra cai no SPA.
if os.path.isdir(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    index_file = os.path.join(FRONTEND_DIST, "index.html")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Arquivos estáticos na raiz do dist (favicon, etc.)
        candidate = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)
        # Qualquer outra rota → index.html (React Router resolve no cliente)
        return FileResponse(index_file)
