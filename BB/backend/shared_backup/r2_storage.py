"""
Compatibility shim for BB backend.
This file re-exports everything from the global shared.r2_storage module.

DEPRECATED: Import directly from shared.r2_storage instead.
"""

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

from shared.r2_storage import (
    R2ConfigurationError,
    get_r2_client,
    get_r2_session,
    get_bucket_name,
    get_base_url,
    normalize_key,
    build_public_url,
    url_to_key,
    generate_presigned_url,
    upload_bytes,
    delete_object,
)

__all__ = [
    'R2ConfigurationError',
    'get_r2_client',
    'get_r2_session',
    'get_bucket_name',
    'get_base_url',
    'normalize_key',
    'build_public_url',
    'url_to_key',
    'generate_presigned_url',
    'upload_bytes',
    'delete_object',
]
