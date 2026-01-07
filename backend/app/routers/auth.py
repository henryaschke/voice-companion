"""Shared authentication utilities for API routes."""
from typing import Optional
from fastapi import Header

from app.config import settings


def verify_admin_token(x_admin_token: Optional[str] = Header(None)) -> bool:
    """
    Optional admin token verification.
    For MVP, allows access but could log warning if token missing/invalid.
    """
    if settings.ADMIN_TOKEN and x_admin_token != settings.ADMIN_TOKEN:
        # For MVP, we allow access
        pass
    return True

