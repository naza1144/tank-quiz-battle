#!/usr/bin/env bash
# Make identity.account_audit append-only for real (BR-M0-005 / BR-M10-001).
#
#   docker exec -i sudhood-postgres bash -s < postgres/harden-audit.sh
#
# Run once after m0-identity has started and created its tables. Safe to re-run:
# every statement is idempotent, and it exits 0 with a message if the table is
# not there yet.
#
# Why this is not in postgres/init/
# --------------------------------
# Files in init/ run while the database is bootstrapping — before any service
# exists, so before any table does. A REVOKE naming a table can only fail there,
# and under ON_ERROR_STOP=1 it takes the rest of the script with it.
#
# Why REVOKE alone was not enough
# -------------------------------
# m0-service creates its own tables at startup, so it *owned* account_audit. An
# owner can grant any privilege back to itself:
#
#     m0_service=> UPDATE identity.account_audit SET details='x';
#     ERROR:  permission denied for table account_audit
#     m0_service=> GRANT UPDATE ON identity.account_audit TO m0_service;
#     GRANT
#     m0_service=> UPDATE identity.account_audit SET details='x';
#     UPDATE 0
#
# Two statements and append-only was gone. Revoking from an owner is advice, not
# a rule — so this moves ownership to the superuser first. After that the REVOKE
# is something m0_service cannot undo, because granting on a table you do not
# own is not a privilege you can give yourself.
#
# One consequence to know: m0_service can no longer ALTER the table. If a column
# is ever added to the AccountAudit model, `create_all` will not apply it (it
# only creates missing *tables*) and the service cannot either. Add the column as
# the superuser and re-run this file.
set -euo pipefail

DB="${POSTGRES_DB:-sudhood}"
SUPER="${POSTGRES_USER:-sudhood}"

exists=$(psql -tAq --username "$SUPER" --dbname "$DB" -c \
    "SELECT to_regclass('identity.account_audit') IS NOT NULL;")

if [ "$exists" != "t" ]; then
    echo "identity.account_audit does not exist yet — nothing to harden."
    echo "Start m0-identity first, then run this file again."
    exit 0
fi

psql -v ON_ERROR_STOP=1 --username "$SUPER" --dbname "$DB" <<-EOSQL
	-- Ownership first: the REVOKE below means nothing while the service owns it.
	ALTER TABLE identity.account_audit OWNER TO ${SUPER};

	-- Insert and read is the whole job. No UPDATE, no DELETE, no TRUNCATE.
	GRANT SELECT, INSERT ON identity.account_audit TO m0_service;
	REVOKE UPDATE, DELETE, TRUNCATE ON identity.account_audit FROM m0_service;
EOSQL

# Assert rather than trust: a silent no-op here would leave the audit trail
# rewritable while every log line says the hardening ran.
verify() {
    psql -tAq --username "$SUPER" --dbname "$DB" -c "$1"
}

owner=$(verify "SELECT tableowner FROM pg_tables
                 WHERE schemaname='identity' AND tablename='account_audit';")
can_ins=$(verify "SELECT has_table_privilege('m0_service','identity.account_audit','INSERT');")
can_sel=$(verify "SELECT has_table_privilege('m0_service','identity.account_audit','SELECT');")
can_upd=$(verify "SELECT has_table_privilege('m0_service','identity.account_audit','UPDATE');")
can_del=$(verify "SELECT has_table_privilege('m0_service','identity.account_audit','DELETE');")

echo "identity.account_audit  owner=$owner  select=$can_sel insert=$can_ins update=$can_upd delete=$can_del"

fail=0
[ "$owner"   = "$SUPER" ] || { echo "FAIL: owner is $owner, expected $SUPER"; fail=1; }
[ "$can_sel" = "t" ]      || { echo "FAIL: m0_service cannot SELECT"; fail=1; }
[ "$can_ins" = "t" ]      || { echo "FAIL: m0_service cannot INSERT"; fail=1; }
[ "$can_upd" = "f" ]      || { echo "FAIL: m0_service can still UPDATE"; fail=1; }
[ "$can_del" = "f" ]      || { echo "FAIL: m0_service can still DELETE"; fail=1; }
[ "$fail" = "0" ] || exit 1

echo "append-only enforced: ownership held by ${SUPER}, writes limited to INSERT"
