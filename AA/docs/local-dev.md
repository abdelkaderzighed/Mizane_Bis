# Local Development Setup (V3 Misan)

This guide explains how to work on the V3 local stack while the current V2 instance keeps running unchanged.

## 1. Clone the repository into a new workspace

```bash
cd /Users/djamel/Sites/Misan
git clone git@github.com:https://github.com/zighedd/Misan-V2.git.git V3-Misan
# or reuse the existing clone with git worktree
# git worktree add ../V3-Misan main
```

- Use the V3 directory for all local-stack experiments.
- Keep the original V2 folder for production/staging tasks until the migration is completed.

## 2. Install core prerequisites

| Tool | Recommended version | Notes |
| ---- | ------------------- | ----- |
| Docker Desktop | Latest stable | Enable virtualization and allocate at least 4 GB RAM. |
| Supabase CLI | `brew install supabase/tap/supabase` | Run `supabase --version` to confirm. |
| Node.js + package manager | Follow `.nvmrc` or package.json | Prefer pnpm if the repo uses it; otherwise npm. |

**Optional**: install `direnv` to load `.env.local` automatically in the V3 folder.

## 3. Prepare environment variables

1. Duplicate `.env` to `.env.local` inside `V3-Misan`.
2. Update Supabase-related keys to match the local stack:
   - `SUPABASE_URL=http://localhost:54321`
   - `SUPABASE_ANON_KEY` and `SERVICE_ROLE_KEY` from `supabase status`
3. Replace third-party API keys with sandbox credentials to avoid hitting production.
4. Store secrets in `.env.local`; keep `.env` as a template committed to git.

## 4. Start the Supabase local stack

```bash
# inside V3-Misan
supabase start
```

- The CLI launches Postgres, Studio, Realtime, Auth, and the fake SMTP server.
- Check service health with `supabase status` and stop everything with `supabase stop`.
- If ports are busy, run `supabase start --port <custom>` and reflect the change in `.env.local`.

## 5. Align database schema and seed data

```bash
supabase db reset       # optional: drops and recreates the local schema
supabase db push        # applies migrations from supabase/migrations
npm run db:seed         # replace with the repo's seed command, if available
```

- Always run migrations locally before sharing a migration PR.
- If migrations fail, fix them locally before pushing to avoid breaking the cloud deployment.

## 6. Run the application locally

```bash
npm install             # or pnpm install
npm run dev             # ensure it reads `.env.local`
```

- Use `docker compose up` if the project ships a compose file for the app layer.
- Rebuild containers when dependencies change: `docker compose build --no-cache`.

## 7. Validate changes before pushing

```bash
npm run lint
npm test
supabase db lint        # optional: checks migration ordering and drift
```

- Commit from the V3 folder on a dedicated branch (for example `feature/local-stack`).
- Push to GitHub only when tests pass to keep the V2 main branch stable.

## 8. Document updates

- Update this file whenever the onboarding flow changes.
- Note new environment variables in `.env.example` to keep V2 and V3 in sync.
- Share known caveats (performance, Docker volume tweaks) in a `docs/troubleshooting.md` if they appear.

---

Following this checklist lets you iterate on a local Supabase-backed stack without destabilizing the current V2 setup.
