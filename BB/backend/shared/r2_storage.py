"""
Compatibility shim for BB backend.
This file re-exports everything from the global shared.r2_storage module.

DEPRECATED: Import directly from shared.r2_storage instead.
"""

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

from shared.r2_storage import *  # noqa: F401, F403
