# Alembic Setup (Draft)

This project now ships a minimal Alembic configuration under `backend/alembic/` with the migration scripts stored in `backend/migrations/`.

## Running migrations (local)

```bash
export PYTHONPATH=$PYTHONPATH:$(pwd)
# install requirements first: pip install sqlalchemy alembic python-dotenv
alembic -c backend/alembic.ini upgrade head
```

### Generating a new revision

```bash
alembic -c backend/alembic.ini revision -m "describe change"
```

The environment file imports `backend.core.models` so ensure any new models are exposed via `backend/core/models/__init__.py`.

## Limitations
- Alembic requires the runtime dependencies (`sqlalchemy`, `alembic`, etc.) which are not yet bundled.
- Current migration files were authored manually; run `upgrade --sql` first to validate before touching production data.
- Default URL points to `sqlite:///backend/harvester.db`; override via `HARVESTER_DATABASE_URL` if needed.
