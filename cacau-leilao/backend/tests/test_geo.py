from app.services.geo import haversine_km, produtor_dentro_do_raio


def test_haversine_ilheus_itabuna():
    # Ilhéus → Itabuna ≈ 30km
    dist = haversine_km(-14.789, -39.049, -14.785, -39.280)
    assert 25 < dist < 35


def test_produtor_dentro_raio():
    # Mesmo ponto → dentro
    assert produtor_dentro_do_raio(-14.789, -39.049, -14.789, -39.049, raio_km=50)


def test_produtor_fora_raio():
    # Salvador → Ilhéus ≈ 400km → fora do raio de 50km
    assert not produtor_dentro_do_raio(-12.971, -38.501, -14.789, -39.049, raio_km=50)
