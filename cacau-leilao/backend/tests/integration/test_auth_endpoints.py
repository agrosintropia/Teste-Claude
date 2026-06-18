import pytest


@pytest.mark.asyncio
async def test_register_and_login(client):
    # Registro
    r = await client.post("/api/v1/auth/register", json={
        "email": "produtor@teste.com",
        "password": "senha123",
        "nome_completo": "João Cacau",
        "role": "produtor",
    })
    assert r.status_code == 201

    # Login antes de ativar → 403
    r = await client.post("/api/v1/auth/login", json={
        "email": "produtor@teste.com",
        "password": "senha123",
    })
    assert r.status_code == 403

    # Credenciais erradas
    r = await client.post("/api/v1/auth/login", json={
        "email": "produtor@teste.com",
        "password": "errada",
    })
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_register_duplicate(client):
    payload = {"email": "x@x.com", "password": "123", "nome_completo": "X", "role": "produtor"}
    await client.post("/api/v1/auth/register", json=payload)
    r = await client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 400
