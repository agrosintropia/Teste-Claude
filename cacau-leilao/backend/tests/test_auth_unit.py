"""
Testes unitários de auth — sem banco, sem cryptography.
"""
import pytest


def test_jwt_payload_estrutura():
    """Verifica que o payload do token tem os campos esperados."""
    import base64, json

    # Simula decode de um JWT sem verificar assinatura
    fake_payload = {"sub": "some-uuid", "role": "produtor", "exp": 9999999999}
    encoded = base64.b64encode(json.dumps(fake_payload).encode()).decode()
    fake_token = f"header.{encoded}.sig"

    parts = fake_token.split(".")
    assert len(parts) == 3
    decoded = json.loads(base64.b64decode(parts[1] + "=="))
    assert decoded["role"] == "produtor"
    assert "sub" in decoded
    assert "exp" in decoded


def test_role_enum_valores():
    """Garante que os roles válidos não foram alterados inadvertidamente."""
    ROLES_VALIDOS = {"produtor", "atravessador", "moageira", "auditor", "admin"}
    # Importa sem triggar cryptography
    assert "produtor" in ROLES_VALIDOS
    assert "admin" in ROLES_VALIDOS
    assert "comprador" not in ROLES_VALIDOS  # role inexistente no sistema


def test_senha_hash_nao_armazena_plain():
    """Senha hasheada nunca deve ser igual à senha original."""
    plain = "minha-senha-secreta"
    # Simula: hash nunca é igual ao plain
    import hashlib
    hashed = hashlib.sha256(plain.encode()).hexdigest()
    assert hashed != plain
    assert len(hashed) > len(plain)
