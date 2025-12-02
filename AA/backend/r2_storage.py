import os
from functools import lru_cache
from typing import Optional

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, NoCredentialsError


class R2ConfigurationError(Exception):
    pass


def _get_env(var: str) -> str:
    value = os.getenv(var)
    if not value:
        raise R2ConfigurationError(f"{var} manquant pour l'accès R2")
    return value


@lru_cache
def get_r2_client():
    access_key = _get_env("HARVESTER_R2_ACCESS_KEY_ID")
    secret_key = _get_env("HARVESTER_R2_SECRET_ACCESS_KEY")
    account_id = _get_env("HARVESTER_R2_ACCOUNT_ID")
    endpoint = f"https://{account_id}.r2.cloudflarestorage.com"
    session = boto3.session.Session()
    return session.client(
        service_name="s3",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        endpoint_url=endpoint,
        config=Config(signature_version="s3v4"),
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
    return _get_env("HARVESTER_R2_BASE_URL").rstrip("/")


def normalize_key(raw_path: Optional[str]) -> Optional[str]:
    if not raw_path:
        return None
    path = raw_path.strip()
    if not path:
        return None
    base = get_base_url()
    if path.startswith(base):
        path = path[len(base) :].lstrip("/")
    path = path.replace("https://", "").replace("http://", "")
    if "/" in path:
        # remove domain if present
        domain, key_part = path.split("/", 1)
        if "." in domain:
            return key_part
        return path
    return path


def build_public_url(raw_path: Optional[str]) -> Optional[str]:
    if not raw_path:
        return None
    key = normalize_key(raw_path)
    if not key:
        return None
    return f"{get_base_url()}/{key.lstrip('/')}"


def generate_presigned_url(raw_path: Optional[str], expires_in: int = 3600) -> Optional[str]:
    """
    Génère une URL signée si les credentials R2 sont disponibles.
    Sinon, renvoie l'URL publique (HARVESTER_R2_BASE_URL + key) si possible.
    """
    key = None
    try:
        key = normalize_key(raw_path)
        client = get_r2_client()
        bucket = get_bucket_name()
    except R2ConfigurationError:
        return build_public_url(raw_path)
    except Exception:
        return build_public_url(raw_path)

    if not key:
        return None
    try:
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=expires_in,
        )
    except (BotoCoreError, NoCredentialsError):
        return build_public_url(raw_path)
    except Exception:
        return build_public_url(raw_path)
