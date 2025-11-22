from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
import logging

logger = logging.getLogger(__name__)


class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_id = request.headers.get("X-Client-ID")
        if client_id:
            request.state.client_id = int(client_id)
        else:
            request.state.client_id = None
        
        response = await call_next(request)
        return response
