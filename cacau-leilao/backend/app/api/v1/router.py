from fastapi import APIRouter
from app.api.v1.endpoints import auth, produtores, compradores, admin, auditorias

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(produtores.router)
api_router.include_router(compradores.router)
api_router.include_router(admin.router)
api_router.include_router(auditorias.router)

# Próximas fases:
# from app.api.v1.endpoints import lotes, leiloes, entregas
