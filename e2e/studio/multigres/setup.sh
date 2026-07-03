#!/usr/bin/env bash
# Bring up the Supabase self-hosted stack against an external Multigres database.
#
# Prerequisites:
#   1. Multigres running with its gateway on 127.0.0.1:15432, built on a
#      supabase/postgres:*-multigres base image (so the Supabase
#      roles/schemas/extensions already exist via that image's initdb):
#      git clone https://github.com/multigres/multigres
#      cd multigres
#      MULTIGRES_POSTGRES_IMAGE=supabase/postgres:<tag>-multigres \
#      MULTIGRES_PROVISION_PG_PACKAGES=false \
#      docker compose up --build -d
#   2. Docker + the supabase docker/ compose in this repo.
#
# What it does:
#   - syncs the demo password onto the service roles that authenticate with
#     ${POSTGRES_PASSWORD} (the supabase/postgres image bakes in the roles
#     themselves with its own build-time passwords, which don't match)
#   - starts the stack via docker/docker-compose.yml + this dir's override
#     (the `db` service is replaced by Multigres).
#
# Usage:
#   ./setup.sh up        # sync passwords + start (default)
#   ./setup.sh provision # run only the password sync
#   ./setup.sh status    # show service health
#   ./setup.sh down       # stop the stack
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
COMPOSE_BASE="$REPO_ROOT/docker/docker-compose.yml"
COMPOSE_OVERRIDE="$SCRIPT_DIR/docker-compose.override.yml"
ENV_FILE="$SCRIPT_DIR/multigres.env"

MG_HOST="${MG_HOST:-host.docker.internal}"
MG_PORT="${MG_PORT:-15432}"

# Services to start (excludes db + supavisor on purpose).
SERVICES=(studio kong auth rest meta storage imgproxy functions realtime)

psql_mg() { # runs SQL (stdin) against Multigres via a throwaway client container
  # supabase_admin is the cluster's bootstrap superuser (POSTGRES_USER baked
  # into the supabase/postgres:*-multigres image) and the only role Multigres
  # itself sets a known password for.
  docker run --rm -i --add-host=host.docker.internal:host-gateway \
    -e PGPASSWORD=postgres postgres:17 \
    psql -h "$MG_HOST" -p "$MG_PORT" -U supabase_admin -d postgres -v ON_ERROR_STOP=0 "$@"
}

check_multigres() {
  echo "==> Checking Multigres gateway at $MG_HOST:$MG_PORT ..."
  if ! echo "select 1;" | psql_mg -tA >/dev/null 2>&1; then
    echo "ERROR: cannot reach Multigres on $MG_HOST:$MG_PORT." >&2
    echo "Start it first: in a multigres checkout, build against a" >&2
    echo "supabase/postgres:*-multigres image (see the header of this script)." >&2
    exit 1
  fi
  echo "    ok ($(echo 'select version();' | psql_mg -tA | head -1))"
}

provision() {
  echo "==> Syncing demo passwords for Supabase service roles on Multigres ..."
  # The supabase/postgres:*-multigres base image already ships the Supabase
  # roles, schemas, grants, and extensions via its own initdb migrations — the
  # only gap is that the roles the self-hosted stack authenticates as
  # (docker/docker-compose.yml's ${POSTGRES_PASSWORD}) were baked in with
  # different, unknown passwords. Reset just those to the demo password.
  #
  # Note: the `realtime` service is expected to crash-loop here (both before
  # and after this change) — it needs a separate `_supabase` database for its
  # own migration bookkeeping, and Multigres's gateway doesn't support CREATE
  # DATABASE ("CREATE DATABASE is not supported through the connection
  # pooler"). Pre-existing Multigres limitation, not something this script
  # can provision around.
  psql_mg <<'SQL'
ALTER ROLE postgres WITH LOGIN PASSWORD 'postgres';
ALTER ROLE authenticator WITH LOGIN PASSWORD 'postgres';
ALTER ROLE supabase_auth_admin WITH LOGIN PASSWORD 'postgres';
ALTER ROLE supabase_storage_admin WITH LOGIN PASSWORD 'postgres';
SQL
  echo "    done."
}

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_BASE" -f "$COMPOSE_OVERRIDE" "$@"
}

cmd="${1:-up}"
case "$cmd" in
  provision)
    check_multigres; provision ;;
  up)
    check_multigres; provision
    echo "==> Starting Supabase services ..."
    compose up -d "${SERVICES[@]}"
    echo "==> Waiting 20s for boot/migrations ..."
    sleep 20 || true
    compose ps
    echo
    echo "Studio:    http://localhost:8082"
    echo "API/kong:  http://localhost:8000"
    ;;
  status)
    compose ps ;;
  down)
    compose down ;;
  *)
    echo "usage: $0 {up|provision|status|down}" >&2; exit 1 ;;
esac
