#!/usr/bin/env bash
# Database security + behaviour tests (npm run db:test).
#
# Applies supabase/tests/supabase_stub.sql and every migration to an empty
# database, then runs supabase/tests/security_and_flows.test.sql and fails if
# any check prints FAIL.
#
#   DB_TEST_URL=postgres://postgres@localhost:5432/postgres npm run db:test
#       use an existing server (superuser; a scratch database is created)
#   npm run db:test
#       start a throwaway local cluster (needs initdb/pg_ctl on PATH)
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
WORK=$(mktemp -d)
CLUSTER=""
cleanup() {
  if [[ -n "$CLUSTER" ]]; then pg_ctl -D "$CLUSTER" stop -m fast >/dev/null 2>&1 || true; fi
  rm -rf "$WORK"
}
trap cleanup EXIT

if [[ -z "${DB_TEST_URL:-}" ]]; then
  PORT=${DB_TEST_PORT:-54329}
  CLUSTER="$WORK/data"
  initdb -D "$CLUSTER" -U postgres -A trust >/dev/null
  pg_ctl -D "$CLUSTER" -o "-p $PORT -k '' -c listen_addresses=localhost" -l "$WORK/pg.log" start -w >/dev/null
  DB_TEST_URL="postgres://postgres@localhost:$PORT/postgres"
fi

DB_NAME="gg_test_$$"
psql "$DB_TEST_URL" -q -c "create database $DB_NAME" >/dev/null
URL="${DB_TEST_URL%/*}/$DB_NAME"

psql "$URL" -q -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/supabase_stub.sql" >/dev/null 2>&1
for f in "$ROOT"/supabase/migrations/*.sql; do
  psql "$URL" -q -v ON_ERROR_STOP=1 -f "$f" >/dev/null 2>"$WORK/migrate.err" || {
    echo "migration failed: $(basename "$f")"; cat "$WORK/migrate.err"; exit 1;
  }
done

(cd "$ROOT" && npx tsx scripts/db-test-fixtures.ts "$WORK")
(cd "$WORK" && psql "$URL" -f "$ROOT/supabase/tests/security_and_flows.test.sql" >"$WORK/out.txt" 2>&1) || true

grep -E "NOTICE:  (PASS|FAIL)" "$WORK/out.txt" | sed 's/.*NOTICE:  //'
pass=$(grep -c "NOTICE:  PASS" "$WORK/out.txt" || true)
fail=$(grep -c "NOTICE:  FAIL" "$WORK/out.txt" || true)
errs=$(grep -c "ERROR" "$WORK/out.txt" || true)
psql "$DB_TEST_URL" -q -c "drop database $DB_NAME" >/dev/null 2>&1 || true

echo "db:test — $pass passed, $fail failed, $errs SQL errors"
if [[ "$fail" -ne 0 || "$errs" -ne 0 || "$pass" -eq 0 ]]; then
  grep "ERROR" "$WORK/out.txt" || true
  exit 1
fi
