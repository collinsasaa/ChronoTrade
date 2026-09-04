from slowapi import Limiter

from app.api.routes_auth import get_client_ip

limiter = Limiter(key_func=get_client_ip, default_limits=["120/minute"])
