#!/bin/bash
# PostgreSQL Backup Script using pgBackRest
# This script creates a full backup of the PostgreSQL database
# Requires: pgBackRest installed on the host or in a container

set -euo pipefail

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-guessx_db}"
DB_USER="${DB_USER:-admin}"
BACKUP_DIR="${BACKUP_DIR:-/var/lib/pgbackrest}"
STANZA="${STANZA:-takelow}"
RETENTION_FULL="${RETENTION_FULL:-7}"
RETENTION_DIFF="${RETENTION_DIFF:-3}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if pgBackRest is installed
check_pgbackrest() {
    if ! command -v pgbackrest &> /dev/null; then
        log_error "pgBackRest is not installed. Please install it first."
        echo "Installation: https://pgbackrest.org/user-guide.html#installation"
        exit 1
    fi
}

# Initialize pgBackRest repository
init_repository() {
    log_info "Initializing pgBackRest repository..."
    pgbackrest --stanza="${STANZA}" stanza-create
}

# Create full backup
create_full_backup() {
    log_info "Creating full backup..."
    pgbackrest --stanza="${STANZA}" \
        --type=full \
        --repo1-path="${BACKUP_DIR}" \
        --repo1-retention-full="${RETENTION_FULL}" \
        backup
}

# Create differential backup
create_diff_backup() {
    log_info "Creating differential backup..."
    pgbackrest --stanza="${STANZA}" \
        --type=diff \
        --repo1-path="${BACKUP_DIR}" \
        --repo1-retention-diff="${RETENTION_DIFF}" \
        backup
}

# Create incremental backup
create_incr_backup() {
    log_info "Creating incremental backup..."
    pgbackrest --stanza="${STANZA}" \
        --type=incr \
        --repo1-path="${BACKUP_DIR}" \
        backup
}

# Verify backup
verify_backup() {
    log_info "Verifying backup..."
    pgbackrest --stanza="${STANZA}" --repo1-path="${BACKUP_DIR}" check
}

# List backups
list_backups() {
    log_info "Listing available backups..."
    pgbackrest --stanza="${STANZA}" --repo1-path="${BACKUP_DIR}" info
}

# Restore from backup
restore_backup() {
    local backup_type="${1:-latest}"
    local target_dir="${2:-/var/lib/postgresql/data}"
    
    log_warn "Restoring from backup (type: ${backup_type})..."
    log_warn "This will overwrite the current database at ${target_dir}"
    read -p "Are you sure? (yes/no): " confirm
    
    if [[ "${confirm}" != "yes" ]]; then
        log_info "Restore cancelled."
        exit 0
    fi
    
    pgbackrest --stanza="${STANZA}" \
        --repo1-path="${BACKUP_DIR}" \
        --delta \
        --target="${target_dir}" \
        restore
    
    log_info "Restore completed. Remember to start PostgreSQL and run recovery."
}

# Main script
main() {
    local action="${1:-full}"
    
    check_pgbackrest
    
    case "${action}" in
        init)
            init_repository
            ;;
        full)
            create_full_backup
            verify_backup
            ;;
        diff)
            create_diff_backup
            verify_backup
            ;;
        incr)
            create_incr_backup
            verify_backup
            ;;
        verify)
            verify_backup
            ;;
        list)
            list_backups
            ;;
        restore)
            restore_backup "${2:-latest}" "${3:-/var/lib/postgresql/data}"
            ;;
        *)
            echo "Usage: $0 {init|full|diff|incr|verify|list|restore [backup_type] [target_dir]}"
            echo "  init    - Initialize pgBackRest repository"
            echo "  full    - Create full backup (default)"
            echo "  diff    - Create differential backup"
            echo "  incr    - Create incremental backup"
            echo "  verify  - Verify backup integrity"
            echo "  list    - List available backups"
            echo "  restore - Restore from backup"
            exit 1
            ;;
    esac
}

main "$@"