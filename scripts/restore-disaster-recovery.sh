#!/bin/bash
# Disaster Recovery Restore Script for Guess X
# This script restores the PostgreSQL database from backup
# Supports both pgBackRest and WAL-G

set -euo pipefail

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-guessx_db}"
DB_USER="${DB_USER:-admin}"
PGDATA="${PGDATA:-/var/lib/postgresql/data}"
BACKUP_TOOL="${BACKUP_TOOL:-pgbackrest}"  # pgbackrest or walg

# pgBackRest specific
PGBACKREST_STANZA="${PGBACKREST_STANZA:-takelow}"
PGBACKREST_REPO="${PGBACKREST_REPO:-/var/lib/pgbackrest}"

# WAL-G specific
WALG_S3_PREFIX="${WALG_S3_PREFIX:-s3://takelow-backups/postgres}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

# Stop PostgreSQL
stop_postgres() {
    log_step "Stopping PostgreSQL..."
    if systemctl is-active --quiet postgresql 2>/dev/null; then
        systemctl stop postgresql
    elif pgrep -x postgres > /dev/null; then
        pkill -TERM postgres
        sleep 5
    elif docker ps | grep -q postgres; then
        docker stop takelow-postgres-primary-1
    else
        log_warn "PostgreSQL not running via systemd/docker, attempting pg_ctl..."
        pg_ctl -D "${PGDATA}" stop -m fast 2>/dev/null || true
    fi
    log_info "PostgreSQL stopped"
}

# Start PostgreSQL
start_postgres() {
    log_step "Starting PostgreSQL..."
    if systemctl is-enabled --quiet postgresql 2>/dev/null; then
        systemctl start postgresql
    elif docker ps -a | grep -q postgres; then
        docker start takelow-postgres-primary-1
    else
        pg_ctl -D "${PGDATA}" start
    fi
    log_info "PostgreSQL started"
}

# Wait for PostgreSQL to be ready
wait_for_postgres() {
    log_step "Waiting for PostgreSQL to be ready..."
    local max_attempts=30
    local attempt=0
    
    while [ ${attempt} -lt ${max_attempts} ]; do
        if pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" 2>/dev/null; then
            log_info "PostgreSQL is ready"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    log_error "PostgreSQL did not become ready in time"
    return 1
}

# Restore using pgBackRest
restore_pgbackrest() {
    local backup_type="${1:-latest}"
    
    log_step "Restoring from pgBackRest (${backup_type})..."
    
    # Check if pgBackRest is available
    if ! command -v pgbackrest &> /dev/null; then
        log_error "pgBackRest is not installed"
        return 1
    fi
    
    # Restore
    pgbackrest --stanza="${PGBACKREST_STANZA}" \
        --repo1-path="${PGBACKREST_REPO}" \
        --delta \
        --target="${PGDATA}" \
        restore
    
    log_info "pgBackRest restore completed"
}

# Restore using WAL-G
restore_walg() {
    local backup_name="${1:-LATEST}"
    
    log_step "Restoring from WAL-G (${backup_name})..."
    
    if ! command -v wal-g &> /dev/null; then
        log_error "WAL-G is not installed"
        return 1
    fi
    
    export WALG_S3_PREFIX="${WALG_S3_PREFIX}"
    export AWS_REGION="${AWS_REGION}"
    export PGHOST="${DB_HOST}"
    export PGPORT="${DB_PORT}"
    export PGDATABASE="${DB_NAME}"
    export PGUSER="${DB_USER}"
    
    wal-g backup-fetch "${backup_name}" "${PGDATA}"
    
    # Create recovery signal
    touch "${PGDATA}/recovery.signal"
    
    log_info "WAL-G restore completed"
}

# Verify database after restore
verify_database() {
    log_step "Verifying database..."
    
    # Wait for PostgreSQL
    wait_for_postgres
    
    # Run basic queries
    local tables=("users" "auctions" "bids" "products" "transactions" "winners")
    
    for table in "${tables[@]}"; do
        local count=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM ${table};" 2>/dev/null | xargs)
        log_info "Table ${table}: ${count} rows"
    done
    
    log_info "Database verification completed"
}

# Main restore function
main_restore() {
    log_warn "==========================================="
    log_warn "DISASTER RECOVERY RESTORE"
    log_warn "==========================================="
    log_warn "This will OVERWRITE the current database!"
    log_warn "Backup tool: ${BACKUP_TOOL}"
    log_warn "Target: ${PGDATA}"
    log_warn "==========================================="
    
    read -p "Type 'RESTORE' to confirm: " confirm
    
    if [[ "${confirm}" != "RESTORE" ]]; then
        log_info "Restore cancelled."
        exit 0
    fi
    
    # Stop PostgreSQL
    stop_postgres
    
    # Restore based on backup tool
    case "${BACKUP_TOOL}" in
        pgbackrest)
            restore_pgbackrest "${1:-latest}"
            ;;
        walg)
            restore_walg "${1:-LATEST}"
            ;;
        *)
            log_error "Unknown backup tool: ${BACKUP_TOOL}"
            exit 1
            ;;
    esac
    
    # Start PostgreSQL
    start_postgres
    
    # Verify
    verify_database
    
    log_info "==========================================="
    log_info "RESTORE COMPLETED SUCCESSFULLY"
    log_info "==========================================="
}

# Point-in-time recovery (PITR)
pitr_restore() {
    local target_time="${1}"
    
    if [[ -z "${target_time}" ]]; then
        log_error "Target time required for PITR (format: 'YYYY-MM-DD HH:MM:SS')"
        exit 1
    fi
    
    log_warn "Point-in-time recovery to ${target_time}"
    
    stop_postgres
    
    case "${BACKUP_TOOL}" in
        pgbackrest)
            log_step "Performing PITR with pgBackRest..."
            pgbackrest --stanza="${PGBACKREST_STANZA}" \
                --repo1-path="${PGBACKREST_REPO}" \
                --delta \
                --target="${PGDATA}" \
                --type=time \
                --target-time="${target_time}" \
                restore
            ;;
        walg)
            log_error "PITR not yet implemented for WAL-G in this script"
            exit 1
            ;;
    esac
    
    # Create recovery signal with target time
    cat > "${PGDATA}/recovery.signal" <<EOF
recovery_target_time = '${target_time}'
recovery_target_action = 'promote'
EOF
    
    start_postgres
    wait_for_postgres
    verify_database
    
    log_info "PITR completed"
}

# Show usage
usage() {
    echo "Usage: $0 {restore|pitr} [options]"
    echo ""
    echo "Commands:"
    echo "  restore [backup_type]    - Full restore from backup (default: latest)"
    echo "  pitr 'YYYY-MM-DD HH:MM:SS' - Point-in-time recovery"
    echo ""
    echo "Environment variables:"
    echo "  BACKUP_TOOL    - pgbackrest or walg (default: pgbackrest)"
    echo "  DB_HOST        - Database host (default: localhost)"
    echo "  DB_PORT        - Database port (default: 5432)"
    echo "  DB_NAME        - Database name (default: guessx_db)"
    echo "  DB_USER        - Database user (default: admin)"
    echo "  PGDATA         - PostgreSQL data directory (default: /var/lib/postgresql/data)"
    echo ""
    echo "pgBackRest specific:"
    echo "  PGBACKREST_STANZA - Stanza name (default: takelow)"
    echo "  PGBACKREST_REPO   - Repository path (default: /var/lib/pgbackrest)"
    echo ""
    echo "WAL-G specific:"
    echo "  WALG_S3_PREFIX    - S3 prefix (default: s3://takelow-backups/postgres)"
    echo "  AWS_REGION        - AWS region (default: us-east-1)"
}

# Entry point
case "${1:-}" in
    restore)
        main_restore "${2:-latest}"
        ;;
    pitr)
        pitr_restore "${2:-}"
        ;;
    *)
        usage
        exit 1
        ;;
esac