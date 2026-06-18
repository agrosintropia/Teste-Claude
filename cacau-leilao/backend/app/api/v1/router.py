from fastapi import APIRouter
from app.api.v1.endpoints import auth

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)

# Próximas fases:
# from app.api.v1.endpoints import produtores, auditorias, lotes, leiloes, entregas
# api_router.include_router(produtores.router)
# api_router.include_router(auditorias.router)
# api_router.include_router(lotes.router)
# api_router.include_router(leiloes.router)
# api_router.include_router(entregas.router)
