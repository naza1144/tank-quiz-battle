#!/bin/bash
# One database login per service, each able to see only its own schema.
#
# This is what turns "no cross-schema JOIN" from a policy into something the
# database refuses. Naming a schema per service was only half of it: while every
# service connects as the same superuser, m9-service can read identity.account
# and nothing stops it. Privileges in Postgres attach to a role, so separate
# roles are the only mechanism available.
#
# Every service login shares one password. That is deliberate and costs nothing
# in isolation — privileges follow the role, not the password, so the boundary is
# identical either way. What a shared password loses is blast radius if it leaks,
# which for a stack that currently has one superuser password is not a step
# backwards. Give each service its own later by adding M0_DB_PASSWORD and friends
# and splitting the assignment below.
#
# NOTE: files in this directory run only when the data directory is empty, so on
# an existing volume this has to be applied by hand once:
#
#   docker exec -i sudhood-postgres bash -s < postgres/init/02-service-users.sh
#
set -euo pipefail

# Falls back to the superuser password so a fresh checkout works without editing
# .env. Set SERVICE_DB_PASSWORD to keep the service logins distinct from the
# superuser — worth doing anywhere that is not a laptop.
SERVICE_PASSWORD="${SERVICE_DB_PASSWORD:-$POSTGRES_PASSWORD}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	-- ── Schemas ───────────────────────────────────
	-- Created here rather than by each service at startup. CREATE SCHEMA needs
	-- the CREATE privilege on the database, which is enough to create anyone
	-- else's schema — so granting it to a service login would give back most of
	-- what a per-service login was for. See the audit note below, which depends
	-- on the superuser owning these.
	CREATE SCHEMA IF NOT EXISTS identity;
	CREATE SCHEMA IF NOT EXISTS thesis;
	CREATE SCHEMA IF NOT EXISTS curriculum;
	CREATE SCHEMA IF NOT EXISTS faculty;

	-- ── Roles ─────────────────────────────────────
	-- CREATE ROLE has no IF NOT EXISTS, hence the DO block. The password is set
	-- on every run so rotating it is a matter of re-running this file.
	DO \$\$
	BEGIN
	    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'm0_service') THEN
	        CREATE ROLE m0_service LOGIN;
	    END IF;
	    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'm9_service') THEN
	        CREATE ROLE m9_service LOGIN;
	    END IF;
	    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'm1_service') THEN
	        CREATE ROLE m1_service LOGIN;
	    END IF;
	    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'm3_service') THEN
	        CREATE ROLE m3_service LOGIN;
	    END IF;
	END
	\$\$;

	ALTER ROLE m0_service PASSWORD '${SERVICE_PASSWORD}';
	ALTER ROLE m9_service PASSWORD '${SERVICE_PASSWORD}';
	ALTER ROLE m1_service PASSWORD '${SERVICE_PASSWORD}';
	ALTER ROLE m3_service PASSWORD '${SERVICE_PASSWORD}';

	-- ── Close the default door ────────────────────
	-- Every role inherits from PUBLIC, which by default may use any schema it can
	-- name. Revoking that is what makes the grants below meaningful rather than
	-- decorative. public is included because a service with no business writing
	-- loose tables should not be able to.
	REVOKE ALL ON SCHEMA identity   FROM PUBLIC;
	REVOKE ALL ON SCHEMA thesis     FROM PUBLIC;
	REVOKE ALL ON SCHEMA curriculum FROM PUBLIC;
	REVOKE ALL ON SCHEMA faculty    FROM PUBLIC;
	REVOKE CREATE ON SCHEMA public FROM PUBLIC;

	-- ── M0 → identity ─────────────────────────────
	-- USAGE and CREATE, because the service creates its own tables — M0 through
	-- Alembic, which runs as this login.
	GRANT USAGE, CREATE ON SCHEMA identity TO m0_service;
	GRANT SELECT, INSERT, UPDATE, DELETE
	    ON ALL TABLES IN SCHEMA identity TO m0_service;
	GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA identity TO m0_service;

	-- Tables added later by the superuser get the same grants without a revisit.
	ALTER DEFAULT PRIVILEGES FOR ROLE ${POSTGRES_USER} IN SCHEMA identity
	    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO m0_service;

	-- Nothing table-level belongs in this file.
	--
	-- Files in this directory run while the database is being bootstrapped, which
	-- is before any service has started and therefore before a single table
	-- exists. An earlier version revoked write on identity.account_audit here;
	-- under `ON_ERROR_STOP=1` the missing table aborted the whole script, and
	-- everything below — every grant M9 needs — silently never ran. The symptom
	-- was m9-service crash-looping on "Schema thesis does not exist" while the
	-- schema sat there in pg_namespace, invisible for want of USAGE.
	--
	-- Append-only on the audit table is real work, not something to drop: it
	-- moved to postgres/harden-audit.sh, which runs after M0 has created its
	-- tables. Nothing here may name a table.

	-- ── M9 → thesis ───────────────────────────────
	-- Full DML. M9 has its own append-only table (thesis_topic_history) and
	-- whether to lock that down is its owner's call, not this file's.
	GRANT USAGE, CREATE ON SCHEMA thesis TO m9_service;
	GRANT SELECT, INSERT, UPDATE, DELETE
	    ON ALL TABLES IN SCHEMA thesis TO m9_service;
	GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA thesis TO m9_service;
	ALTER DEFAULT PRIVILEGES FOR ROLE ${POSTGRES_USER} IN SCHEMA thesis
	    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO m9_service;

	-- ── M1 → curriculum ───────────────────────────
	-- Same shape as the two above. CREATE because M1's Alembic migrations run as
	-- this login and create the tables, which also makes m1_service their owner
	-- — the ALTER DEFAULT PRIVILEGES line below only covers tables the superuser
	-- adds later by hand.
	GRANT USAGE, CREATE ON SCHEMA curriculum TO m1_service;
	GRANT SELECT, INSERT, UPDATE, DELETE
	    ON ALL TABLES IN SCHEMA curriculum TO m1_service;
	GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA curriculum TO m1_service;
	ALTER DEFAULT PRIVILEGES FOR ROLE ${POSTGRES_USER} IN SCHEMA curriculum
	    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO m1_service;

	-- ── M3 → faculty ──────────────────────────────
	-- Same shape again. M3 holds professional data about instructors — academic
	-- rank, qualifications, expertise — and reads names and emails from M0 rather
	-- than keeping copies, so this schema never needs to see identity.
	--
	-- No grant on identity for m3_service, and that is the point of the boundary:
	-- M3 asks M0 over HTTP for a name it wants to display. A SELECT here would be
	-- faster and would make M0's account table part of M3's schema in every way
	-- that matters.
	GRANT USAGE, CREATE ON SCHEMA faculty TO m3_service;
	GRANT SELECT, INSERT, UPDATE, DELETE
	    ON ALL TABLES IN SCHEMA faculty TO m3_service;
	GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA faculty TO m3_service;
	ALTER DEFAULT PRIVILEGES FOR ROLE ${POSTGRES_USER} IN SCHEMA faculty
	    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO m3_service;
EOSQL

# No m10_service yet: m10-service has no database at all — no db.py, no models,
# and neither the audit nor the notification schema exists. A login with nothing
# to be granted on would only be noise. Add it in the same shape when M10 grows
# a schema.

echo "service logins ready: m0_service (identity), m9_service (thesis), m1_service (curriculum)"
echo "next: run postgres/harden-audit.sh once m0-identity has created its tables"
