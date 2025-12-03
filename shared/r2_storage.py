"""
Helpers for working with the Cloudflare R2 bucket from the backend.

This module centralizes every conversion between legacy local paths
(`downloads/...`) and the new R2 layout, as well as the creation of a
boto3 client that can be reused to generate presigned URLs or upload
objects during harvesting.

Unified version combining AA and BB implementations.
"""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Optional

import boto3


class R2ConfigurationError(RuntimeError):
    """Raised when the R2 configuration is incomplete."""


def _get_env(name: str, required: bool = True) -> Optional[str]:
    value = os.getenv(name)
    if required and not value:
        raise R2ConfigurationError(
            f"Missing environment variable {name} required for R2 access."
        )
    return value


@lru_cache
def get_r2_client():
    """
    Lazily build and cache a boto3 client configured for Cloudflare R2.
    The region is always `auto`, but the endpoint must include the
    account identifier (e.g. https://<account-id>.r2.cloudflarestorage.com).
    """
    account_id = _get_env("HARVESTER_R2_ACCOUNT_ID")
    access_key = _get_env("HARVESTER_R2_ACCESS_KEY_ID")
    secret_key = _get_env("HARVESTER_R2_SECRET_ACCESS_KEY")
    endpoint = os.getenv(
        "HARVESTER_R2_S3_ENDPOINT",
        f"https://{account_id}.r2.cloudflarestorage.com",
    )

    return boto3.client(
        "s3",
        region_name="auto",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
    )


@lru_cache
def get_r2_session():
    """
    Retourne une session HTTP réutilisable pour R2 (boto3 non requis ici).
    Utile pour les téléchargements parallèles d'embeddings.
    """
    import requests
    sess = requests.Session()
    return sess


def get_bucket_name() -> str:
    return _get_env("HARVESTER_R2_BUCKET")


def get_base_url() -> str:
    """
    Return the public base URL (https://.../bucket) used to expose files.
    This can point to a Cloudflare Worker, a custom domain, or the native
    R2 public endpoint.
    """
    base = _get_env("HARVESTER_R2_BASE_URL")
    return base.rstrip("/")


def normalize_key(raw_path: Optional[str]) -> Optional[str]:
    """
    Convert legacy paths such as `downloads/foo/bar.pdf` into the R2
    object key (e.g. `foo/bar.pdf`). Already-normalized keys or URLs are
    returned unchanged (except for trimming leading slashes).
    """
    if not raw_path:
        return None

    raw = str(raw_path).strip()
    if not raw:
        return None

    if raw.startswith("http://") or raw.startswith("https://"):
        # Already a URL (likely stored after migration)
        return url_to_key(raw)

    normalized = raw.replace("\\", "/").lstrip("/")
    if normalized.startswith("downloads/"):
        normalized = normalized[len("downloads/") :]
    return normalized


def build_public_url(raw_path: Optional[str]) -> Optional[str]:
    """
    Ensure we always return a fully-qualified URL that points to R2 public endpoint.
    When the path contains an R2 storage URL, extract the key and rebuild with public URL.
    """
    if not raw_path:
        return None

    raw = str(raw_path).strip()
    if not raw:
        return None

    base_url = get_base_url()

    # If it's already a URL, extract the key and rebuild with public URL
    if raw.startswith("http://") or raw.startswith("https://"):
        # Check if it's already using the public base URL
        if raw.startswith(base_url):
            return raw  # Already correct
        # Otherwise, extract key and rebuild
        key = normalize_key(raw)
        if not key:
            return None
        return f"{base_url}/{key}"

    # For relative paths
    key = normalize_key(raw)
    if not key:
        return None
    return f"{base_url}/{key}"


def url_to_key(url: str) -> str:
    """
    Extract the R2 key from a full URL by removing the configured base URL.
    """
    base = get_base_url()
    if not url:
        raise R2ConfigurationError("Cannot extract key from empty URL")
    if not url.startswith(base):
        # Already a key or different base; strip protocol/domain manually.
        stripped = url.replace("https://", "").replace("http://", "")
        return stripped.split("/", 1)[1] if "/" in stripped else stripped
    relative = url[len(base) :].lstrip("/")
    return relative


def generate_presigned_url(raw_path: Optional[str], expires_in: int = 3600) -> Optional[str]:
    """
    Generate a presigned download URL for an object stored in R2.
    If the environment lacks credentials, this function returns None so
    that the caller can fall back to the public URL instead.
    """
    try:
        client = get_r2_client()
        bucket = get_bucket_name()
    except R2ConfigurationError:
        return build_public_url(raw_path)

    key = normalize_key(raw_path)
    if not key:
        return None

    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expires_in,
    )


def upload_bytes(key: str, data: bytes, content_type: Optional[str] = None) -> str:
    """
    Upload raw bytes to the configured R2 bucket and return the public URL.
    """
    client = get_r2_client()
    bucket = get_bucket_name()
    extra: dict = {}
    if content_type:
        extra["ContentType"] = content_type

    client.put_object(Bucket=bucket, Key=key, Body=data, **extra)
    return f"{get_base_url()}/{key.lstrip('/')}"


def delete_object(raw_path: Optional[str]) -> bool:
    """
    Delete an existing object from R2. Accepts either a key or a full URL.
    """
    if not raw_path:
        return False
    key = normalize_key(raw_path)
    if not key:
        return False
    try:
        client = get_r2_client()
        bucket = get_bucket_name()
        client.delete_object(Bucket=bucket, Key=key)
        return True
    except R2ConfigurationError:
        return False
    except Exception:
        return False
