"""
Compatibility shim for BB backend.
This file re-exports everything from the global shared.postgres module.

DEPRECATED: Import directly from shared.postgres instead.
"""

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

from shared.postgres import (
    PostgresConfigurationError,
    get_pool,
    get_connection,
    get_connection_simple,
    close_pool,
)

__all__ = [
    'PostgresConfigurationError',
    'get_pool',
    'get_connection',
    'get_connection_simple',
    'close_pool',
]
