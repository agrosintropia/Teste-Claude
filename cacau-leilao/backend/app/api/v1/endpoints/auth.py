from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserInfo
from app.core.security import hash_password, verify_password, create_access_token
from app.core.limiter import limiter

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.scalar(select(User).where(User.email == body.email))
    if existing:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        role=body.role,
        nome_completo=body.nome_completo,
        telefone=body.telefone,
        ativo=False,  # aguarda aprovação/auditoria
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"id": str(user.id), "message": "Cadastro realizado. Aguardando ativação."}


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.email == body.email))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    if not user.ativo:
        raise HTTPException(status_code=403, detail="Conta ainda não ativada")

    return TokenResponse(
        access_token=create_access_token(user.id, user.role),
        role=user.role,
        user_id=str(user.id),
        user=UserInfo(id=str(user.id), nome=user.nome_completo, email=user.email, role=user.role),
    )
