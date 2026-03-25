#!/bin/bash
# =============================================================================
# CRM ABISYSA - Script de Backup Automático
# =============================================================================
# Realiza backup de:
#   1. Base de datos PostgreSQL (pg_dump comprimido)
#   2. Archivos subidos (uploads)
# Con rotación automática para no llenar el disco.
# =============================================================================

set -euo pipefail

# --- Configuración -----------------------------------------------------------
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# PostgreSQL
PGHOST="${POSTGRES_HOST:-db}"
PGPORT="${POSTGRES_PORT:-5432}"
PGUSER="${POSTGRES_USER:-crm_user}"
PGPASSWORD="${POSTGRES_PASSWORD:-crm_password123}"
PGDB="${POSTGRES_DB:-crm_db}"

# Uploads
UPLOADS_DIR="${UPLOADS_DIR:-/app/uploads}"

# --- Variables internas ------------------------------------------------------
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_TODAY=$(date +%Y%m%d)
DB_BACKUP_FILE="${BACKUP_DIR}/db/crm_db_${TIMESTAMP}.sql.gz"
UPLOADS_BACKUP_FILE="${BACKUP_DIR}/uploads/crm_uploads_${TIMESTAMP}.tar.gz"
LOG_FILE="${BACKUP_DIR}/logs/backup_${DATE_TODAY}.log"

# --- Funciones ---------------------------------------------------------------
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

check_disk_space() {
    local available_mb
    available_mb=$(df -m "$BACKUP_DIR" | awk 'NR==2 {print $4}')
    if [ "$available_mb" -lt 500 ]; then
        log "ALERTA: Menos de 500MB de espacio disponible (${available_mb}MB). Ejecutando limpieza de emergencia..."
        cleanup_old_backups 7
    fi
}

cleanup_old_backups() {
    local days="${1:-$RETENTION_DAYS}"
    log "Limpiando backups con más de ${days} días..."

    local count_before
    count_before=$(find "$BACKUP_DIR/db" "$BACKUP_DIR/uploads" -type f -mtime +"$days" 2>/dev/null | wc -l)

    find "$BACKUP_DIR/db" -type f -name "*.sql.gz" -mtime +"$days" -delete 2>/dev/null || true
    find "$BACKUP_DIR/uploads" -type f -name "*.tar.gz" -mtime +"$days" -delete 2>/dev/null || true
    find "$BACKUP_DIR/logs" -type f -name "*.log" -mtime +"$days" -delete 2>/dev/null || true

    log "Eliminados ${count_before} archivos antiguos"
}

wait_for_postgres() {
    local retries=30
    log "Esperando conexión a PostgreSQL (${PGHOST}:${PGPORT})..."
    while [ $retries -gt 0 ]; do
        if PGPASSWORD="$PGPASSWORD" pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" > /dev/null 2>&1; then
            log "PostgreSQL disponible"
            return 0
        fi
        retries=$((retries - 1))
        sleep 2
    done
    log "ERROR: No se pudo conectar a PostgreSQL después de 60 segundos"
    return 1
}

backup_database() {
    log "Iniciando backup de base de datos..."

    PGPASSWORD="$PGPASSWORD" pg_dump \
        -h "$PGHOST" \
        -p "$PGPORT" \
        -U "$PGUSER" \
        -d "$PGDB" \
        --no-owner \
        --no-privileges \
        --format=plain \
        --verbose 2>>"$LOG_FILE" | gzip > "$DB_BACKUP_FILE"

    local size
    size=$(du -h "$DB_BACKUP_FILE" | cut -f1)
    log "Backup de BD completado: ${DB_BACKUP_FILE} (${size})"

    # Verificar integridad básica
    if ! gzip -t "$DB_BACKUP_FILE" 2>/dev/null; then
        log "ERROR: El archivo de backup de BD está corrupto"
        return 1
    fi
    log "Verificación de integridad: OK"
}

backup_uploads() {
    if [ ! -d "$UPLOADS_DIR" ] || [ -z "$(ls -A "$UPLOADS_DIR" 2>/dev/null)" ]; then
        log "No hay archivos en uploads para respaldar, omitiendo..."
        return 0
    fi

    log "Iniciando backup de uploads..."

    tar -czf "$UPLOADS_BACKUP_FILE" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")" 2>>"$LOG_FILE"

    local size
    size=$(du -h "$UPLOADS_BACKUP_FILE" | cut -f1)
    log "Backup de uploads completado: ${UPLOADS_BACKUP_FILE} (${size})"
}

generate_summary() {
    local db_count uploads_count total_size
    db_count=$(find "$BACKUP_DIR/db" -type f -name "*.sql.gz" | wc -l)
    uploads_count=$(find "$BACKUP_DIR/uploads" -type f -name "*.tar.gz" | wc -l)
    total_size=$(du -sh "$BACKUP_DIR" | cut -f1)

    log "============================================="
    log "RESUMEN DE BACKUP"
    log "============================================="
    log "Backups de BD almacenados:      ${db_count}"
    log "Backups de uploads almacenados: ${uploads_count}"
    log "Espacio total usado:            ${total_size}"
    log "Retención configurada:          ${RETENTION_DAYS} días"
    log "============================================="
}

# --- Ejecución principal -----------------------------------------------------
main() {
    # Crear directorios
    mkdir -p "$BACKUP_DIR/db" "$BACKUP_DIR/uploads" "$BACKUP_DIR/logs"

    log "============================================="
    log "INICIO DE BACKUP - CRM ABISYSA"
    log "============================================="

    # Verificar espacio en disco
    check_disk_space

    # Esperar a que PostgreSQL esté listo
    wait_for_postgres

    # Backup de base de datos
    backup_database

    # Backup de uploads
    backup_uploads

    # Limpiar backups antiguos
    cleanup_old_backups

    # Resumen
    generate_summary

    log "Backup completado exitosamente"
}

main "$@"
