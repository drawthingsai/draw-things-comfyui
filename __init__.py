"""Top-level package for ComfyUI-DrawThings-gRPC."""

__author__ = """Jokimbe"""
__version__ = "1.8.3"

from .src.util import CancelRequest, Settings

cancel_request = CancelRequest()
settings = Settings()

from .src.nodes import NODE_CLASS_MAPPINGS
from .src.nodes import NODE_DISPLAY_NAME_MAPPINGS

from .src import routes

WEB_DIRECTORY = "./web"

__all__ = [
    "NODE_CLASS_MAPPINGS",
    "NODE_DISPLAY_NAME_MAPPINGS",
    "WEB_DIRECTORY",
]
