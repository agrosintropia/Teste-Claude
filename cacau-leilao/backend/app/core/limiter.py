from slowapi import Limiter
from slowapi.util import get_remote_address

# Limiter compartilhado — importado por main.py e pelos endpoints,
# em módulo próprio para evitar import circular.
limiter = Limiter(key_func=get_remote_address)
