#!/bin/bash
# PostgreSQL Backup Script using WAL-G
# This script creates a backup of the PostgreSQL database to cloud storage
# Requires: WAL-G installed and configured with cloud credentials

set -euo pipefail

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-guessx_db}"
DB_USER="${DB_USER:-admin}"
WALG_DATA_DIR="${WALG_DATA_DIR:-/var/lib/postgresql/data}"
WALG_S3_PREFIX="${WALG_S3_PREFIX:-s3://takelow-backups/postgres}"
AWS_REGION="${AWS_REGION:-us-east-1}"

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

# Check if WAL-G is installed
check_walg() {
    if ! command -v wal-g &> /dev/null; then
        log_error "WAL-G is not installed. Please install it first."
        echo "Installation: https://github.com/wal-g/wal-g"
        exit 1
    fi
}

# Set WAL-G environment variables
export_walg_env() {
    export WALG_S3_PREFIX="${WALG_S3_PREFIX}"
    export AWS_REGION="${AWS_REGION}"
    export PGHOST="${DB_HOST}"
    export PGPORT="${DB_PORT}"
    export PGDATABASE="${DB_NAME}"
    export PGUSER="${DB_USER}"
}

# Create base backup (full)
create_base_backup() {
    log_info "Creating base backup..."
    export_walg_env
    wal-g backup-push "${WALG_DATA_DIR}"
}

# List available backups
list_backups() {
    log_info "Listing available backups..."
    export_walg_env
    wal-g backup-list
}

# Delete old backups (keep last N)
delete_old_backups() {
    local retain="${1:-5}"
    log_info "Deleting backups older than ${retain} most recent..."
    export_walg_env
    wal-g delete retain "${retain}" --confirm
}

# Restore from backup
restore_backup() {
    local backup_name="${1:-LATEST}"
    local target_dir="${2:-/var/lib/postgresql/data}"
    
    log_warn "Restoring backup ${backup_name} to ${target_dir}..."
    log_warn "This will overwrite the current database!"
    read -p "Are you sure? (yes/no): " confirm
    
    if [[ "${confirm}" != "yes" ]]; then
        log_info "Restore cancelled."
        exit 0
    fi
    
    export_walg_env
    wal-g backup-fetch "${backup_name}" "${target_dir}"
    
    log_info "Creating recovery.signal file for PostgreSQL..."
    touch "${target_dir}/recovery.signal"
    
    log_info "Restore completed. Start PostgreSQL to begin recovery."
}

# Show backup details
show_backup_info() {
    local backup_name="${1:-LATEST}"
    export_walg_env
    wal-g backup-list --detail | grep -A 20 "${backup_name}"
}

# Main script
main() {
    local action="${1:-push}"
    
    check_walg
    
    case "${action}" in
        push)
            create_base_backup
            ;;
        list)
            list_backups
            ;;
        delete)
            delete_old_backups "${2:-5}"
            ;;
        restore)
            restore_backup "${2:-LATEST}" "${3:-/var/lib/postgresql/data}"
            ;;
        info)
            show_backup_info "${2:-LATEST}"
            ;;
        *)
            echo "Usage: $0 {push|list|delete [retain_count]|restore [backup_name] [target_dir]|info [backup_name]}"
            echo "  push    - Create base backup (default)"
            echo "  list    - List available backups"
            echo "  delete  - Delete old backups (keep last N, default 5)"
            echo "  restore - Restore from backup (default: LATEST)"
            echo "  info    - Show detailed backup info"
            exit 1
            ;;
    esac
}

main "$@"