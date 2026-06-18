from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Importar todos os models aqui para o Alembic detectar
from app.models import (  # noqa: F401, E402
    user, produtor, comprador, regiao, ponto_entrega,
    cscacau_criterio, auditoria, score, expectativa, lote, leilao, entrega,
    pagamento, notificacao,
)
