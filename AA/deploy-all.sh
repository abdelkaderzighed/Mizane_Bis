#!/usr/bin/env bash
set -euo pipefail

GREEN="\033[0;32m"
RESET="\033[0m"

log() {
  echo -e "${GREEN}➡ $1${RESET}"
}

if [ $# -gt 0 ]; then
  COMMIT_MSG="$1"
else
  COMMIT_MSG="chore: deploy"
fi

log "Adding changes"
git add -A

git diff --cached --quiet || log "Committing with message: $COMMIT_MSG"

git diff --cached --quiet || git commit -m "$COMMIT_MSG"

log "Pushing to origin/main"
git push origin main

log "Deploying Supabase functions"
FUNCTIONS=(
  make-server-810b4099
  public-get-pricing
  public-get-llm-settings
)

for fn in "${FUNCTIONS[@]}"; do
  log "Deploying function: $fn"
  supabase functions deploy "$fn" --env-file supabase/functions/.env
done

log "Deployment complete"
