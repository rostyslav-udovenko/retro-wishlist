#!/usr/bin/env bash
set -euo pipefail

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "ERROR: SUPABASE_DB_URL is not configured." >&2
  echo "Export a direct or Session pooler connection string before running this script." >&2
  exit 1
fi

case "${SUPABASE_DB_URL}" in
  postgresql://*|postgres://*)
    ;;
  *)
    echo "ERROR: SUPABASE_DB_URL must be a PostgreSQL connection string." >&2
    exit 1
    ;;
esac

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker is required by supabase db dump." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker is installed but the daemon is not available." >&2
  exit 1
fi

timestamp="$(date -u +'%Y%m%dT%H%M%SZ')"
backup_root="${BACKUP_ROOT:-backups}"
backup_directory="${backup_root}/${timestamp}"
temporary_directory="${backup_directory}.tmp"

if [ -e "${backup_directory}" ] || [ -e "${temporary_directory}" ]; then
  echo "ERROR: Backup path already exists: ${backup_directory}" >&2
  exit 1
fi

mkdir -p "${temporary_directory}"
chmod 700 "${temporary_directory}"

cleanup() {
  if [ -d "${temporary_directory}" ]; then
    rm -rf "${temporary_directory}"
  fi
}

trap cleanup EXIT

echo "Creating logical Supabase backup..."
echo "Target: ${backup_directory}"

echo "[1/3] Exporting roles..."
npx supabase db dump \
  --db-url "${SUPABASE_DB_URL}" \
  --file "${temporary_directory}/roles.sql" \
  --role-only

echo "[2/3] Exporting schema..."
npx supabase db dump \
  --db-url "${SUPABASE_DB_URL}" \
  --file "${temporary_directory}/schema.sql"

echo "[3/3] Exporting data..."
npx supabase db dump \
  --db-url "${SUPABASE_DB_URL}" \
  --file "${temporary_directory}/data.sql" \
  --use-copy \
  --data-only \
  --exclude "storage.buckets_vectors" \
  --exclude "storage.vector_indexes"

for required_file in roles.sql schema.sql data.sql; do
  file_path="${temporary_directory}/${required_file}"

  if [ ! -s "${file_path}" ]; then
    echo "ERROR: Backup file is missing or empty: ${required_file}" >&2
    exit 1
  fi

done

(
  cd "${temporary_directory}"
  sha256sum roles.sql schema.sql data.sql > SHA256SUMS
)

cat > "${temporary_directory}/metadata.txt" <<EOF
created_at_utc=${timestamp}
format=logical-sql
files=roles.sql,schema.sql,data.sql
restore_order=roles.sql,schema.sql,data.sql
EOF

chmod 600 \
  "${temporary_directory}/roles.sql" \
  "${temporary_directory}/schema.sql" \
  "${temporary_directory}/data.sql" \
  "${temporary_directory}/SHA256SUMS" \
  "${temporary_directory}/metadata.txt"

mv "${temporary_directory}" "${backup_directory}"
trap - EXIT

printf '\nBackup completed successfully.\n'
printf 'Directory: %s\n' "${backup_directory}"
printf 'Files:\n'
printf '  roles.sql\n'
printf '  schema.sql\n'
printf '  data.sql\n'
printf '  SHA256SUMS\n'
printf '  metadata.txt\n'
printf '\nStore an encrypted copy outside the development environment.\n'
