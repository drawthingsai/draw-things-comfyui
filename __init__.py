"""Top-level package for ComfyUI-DrawThings-gRPC."""

__author__ = """kcjerrell"""
__version__ = "1.9.0"

from .src.util import CancelRequest, Settings

cancel_request = CancelRequest()
settings = Settings()

from .src import routes
from .src.nodes import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

WEB_DIRECTORY = "./web/dist"

__all__ = [
    "NODE_CLASS_MAPPINGS",
    "NODE_DISPLAY_NAME_MAPPINGS",
    "WEB_DIRECTORY",
]
