import math


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distância em km entre dois pontos GPS (fórmula de Haversine)."""
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = math.sin(d_lat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def produtor_dentro_do_raio(
    lat_produtor: float,
    lon_produtor: float,
    lat_ponto: float,
    lon_ponto: float,
    raio_km: int,
) -> bool:
    return haversine_km(lat_produtor, lon_produtor, lat_ponto, lon_ponto) <= raio_km
