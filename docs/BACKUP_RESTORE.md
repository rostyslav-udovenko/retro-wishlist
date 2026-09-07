# Supabase backup and restore

## Purpose

This procedure creates a portable logical backup of the Supabase PostgreSQL database before risky migrations and for periodic off-site retention.

A backup contains three SQL files:

- `roles.sql`
- `schema.sql`
- `data.sql`

The generated directory also contains `SHA256SUMS` and `metadata.txt`.

## Security rules

- Never commit a database connection string or backup files.
- Never paste a database password into an issue, pull request, chat, or terminal screenshot.
- Treat every backup as confidential because `data.sql` can contain reservation names and visitor tokens.
- Encrypt backups before copying them to off-site storage.
- Delete temporary unencrypted copies when no longer required.
- Do not use the transaction pooler on port `6543`.

## Prerequisites

- Docker is installed and running.
- The Supabase CLI is available through `npx supabase`.
- The database password is known.
- A direct connection or Session pooler connection string on port `5432` is available from the Supabase Connect panel.

## Create a backup

Export the database connection string only for the current shell session:

    read -rsp "Supabase database URL: " SUPABASE_DB_URL
    echo
    export SUPABASE_DB_URL

Run the backup:

    npm run supabase:backup

The output directory has this format:

    backups/YYYYMMDDTHHMMSSZ/

The script writes into a temporary directory first. The final timestamped directory appears only after all three dumps and integrity metadata have been created successfully.

Remove the connection string from the shell after the backup:

    unset SUPABASE_DB_URL

## Verify a backup

Move into the timestamped backup directory and verify checksums:

    cd backups/YYYYMMDDTHHMMSSZ
    sha256sum --check SHA256SUMS

Expected result:

    roles.sql: OK
    schema.sql: OK
    data.sql: OK

Also confirm that every SQL file is non-empty:

    test -s roles.sql
    test -s schema.sql
    test -s data.sql

## Restore warning

Prefer restoring into a new empty Supabase project first. Do not test restoration against production.

A logical restore can overwrite or conflict with existing objects and data. Take a fresh backup of the target before any restore attempt.

## Prepare the target project

Before restoring:

1. Create a new Supabase project.
2. Enable any non-default PostgreSQL extensions used by the source project.
3. Configure Database Webhooks if the source project uses them.
4. Obtain the target direct or Session pooler connection string on port `5432`.
5. Confirm the backup checksum.

## Restore

Install a compatible PostgreSQL `psql` client, then export the target URL:

    read -rsp "Target Supabase database URL: " TARGET_DB_URL
    echo
    export TARGET_DB_URL

From the backup directory, run the files in this order and stop on the first SQL error:

    psql \
      --single-transaction \
      --variable ON_ERROR_STOP=1 \
      --file roles.sql \
      --file schema.sql \
      --file data.sql \
      "${TARGET_DB_URL}"

Remove the target URL afterward:

    unset TARGET_DB_URL

## Post-restore validation

Verify migrations and core objects:

    select version from supabase_migrations.schema_migrations order by version;

    select count(*) from public.wishlists;

    select count(*) from public.gifts;

Verify that the public RPC functions exist and return expected results:

    select * from public.get_featured_wishlists();

Verify RLS, grants, import, export, and sync functions before using the restored project.

Run the frontend against the restored project with temporary local environment values and check:

- `/`
- `/w/rostyslav`
- reservation and release
- Realtime updates
- public and unlisted visibility

## Storage objects

A database backup contains Storage metadata, not the underlying files stored through the Storage API. If the application later stores uploaded gift images in Supabase Storage, create a separate object-backup procedure.

## Recommended schedule

- Before every schema migration with destructive potential.
- Before production import or synchronization changes affecting many records.
- At least weekly for a Free-plan project.
- Before deleting a Supabase project.

Keep at least one encrypted copy outside the local development environment.
