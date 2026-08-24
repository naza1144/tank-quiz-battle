#!/bin/bash
# Create the databases that are not covered by POSTGRES_DB.
#
# POSTGRES_DB creates the application database (sudhood). Keycloak keeps its
# own realm/user data separate, so it gets a database of its own on the same
# instance — one server to run, no shared tables.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE keycloak'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloak')\gexec
EOSQL

echo "database bootstrap complete: ${POSTGRES_DB}, keycloak"
