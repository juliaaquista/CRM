"""Geocodificacion usando Nominatim (OpenStreetMap). Gratuito, 1 req/s."""
import urllib.request
import urllib.parse
import json
import logging

logger = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"


def geocode_ciudad(ciudad: str | None, provincia: str | None, direccion: str | None = None) -> tuple[float | None, float | None]:
    """Geocodifica direccion+ciudad+provincia en España. Retorna (latitud, longitud) o (None, None)."""
    parts = [p for p in [direccion, ciudad, provincia, "España"] if p]
    query = ", ".join(parts)
    if not ciudad and not provincia and not direccion:
        return None, None

    try:
        params = urllib.parse.urlencode({
            "q": query,
            "format": "json",
            "limit": 1,
            "countrycodes": "es",
        })
        url = f"{NOMINATIM_URL}?{params}"
        req = urllib.request.Request(url, headers={"User-Agent": "CRM-Abisysa/1.0"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode())
        if data:
            return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception as e:
        logger.warning(f"Geocoding fallido para '{query}': {e}")
    return None, None
