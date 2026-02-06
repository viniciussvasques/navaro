"""Compatibility exports for application settings.

Use ``app.core.config`` as the single source of truth.
"""

from app.core.config import AppMode, Settings, settings

__all__ = ["AppMode", "Settings", "settings"]
