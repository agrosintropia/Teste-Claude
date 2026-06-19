import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
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
# Tudo verificado em TEMPO DE REQUISIÇÃO (não no import), então funciona
# mesmo que o build do frontend só termine depois do servidor subir.
# As rotas de API acima têm precedência; o resto cai aqui.
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    index_file = os.path.join(FRONTEND_DIST, "index.html")

    # Arquivo estático real dentro do dist (assets/*.js, *.css, favicon…)
    candidate = os.path.normpath(os.path.join(FRONTEND_DIST, full_path))
    if full_path and candidate.startswith(FRONTEND_DIST) and os.path.isfile(candidate):
        return FileResponse(candidate)

    # Qualquer rota da SPA → index.html (React Router resolve no cliente)
    if os.path.isfile(index_file):
        return FileResponse(index_file)

    # Frontend ainda não compilado
    return JSONResponse(
        status_code=503,
        content={
            "detail": "Frontend ainda não foi compilado. Rode: cd cacau-leilao/frontend && npm run build"
        },
    )
