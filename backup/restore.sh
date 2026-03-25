#!/bin/bash
# =============================================================================
# CRM ABISYSA - Script de Restauración
# =============================================================================
# Restaura backups de:
#   1. Base de datos PostgreSQL
#   2. Archivos subidos (uploads)
#
# Uso:
#   ./restore.sh                     -> Lista backups disponibles
#   ./restore.sh db ARCHIVO.sql.gz   -> Restaura base de datos
#   ./restore.sh uploads ARCHIVO.tar.gz -> Restaura uploads
#   ./restore.sh full TIMESTAMP      -> Restaura todo (ej: 20260317_020000)
# =============================================================================

set -euo pipefail

# --- Configuración -----------------------------------------------------------
BACKUP_DIR="${BACKUP_DIR:-/backups}"

PGHOST="${POSTGRES_HOST:-db}"
PGPORT="${POSTGRES_PORT:-5432}"
PGUSER="${POSTGRES_USER:-crm_user}"
PGPASSWORD="${POSTGRES_PASSWORD:-crm_password123}"
PGDB="${POSTGRES_DB:-crm_db}"

UPLOADS_DIR="${UPLOADS_DIR:-/app/uploads}"

# --- Funciones ---------------------------------------------------------------
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

list_backups() {
    echo ""
    echo "========================================="
    echo " BACKUPS DISPONIBLES - CRM ABISYSA"
    echo "========================================="

    echo ""
    echo "--- Base de datos ---"
    if [ -d "$BACKUP_DIR/db" ]; then
        ls -lh "$BACKUP_DIR/db/"*.sql.gz 2>/dev/null | awk '{print "  " $NF " (" $5 ") - " $6 " " $7}' || echo "  (ninguno)"
    else
        echo "  (directorio no encontrado)"
    fi

    echo ""
    echo "--- Uploads ---"
    if [ -d "$BACKUP_DIR/uploads" ]; then
        ls -lh "$BACKUP_DIR/uploads/"*.tar.gz 2>/dev/null | awk '{print "  " $NF " (" $5 ") - " $6 " " $7}' || echo "  (ninguno)"
    else
        echo "  (directorio no encontrado)"
    fi

    echo ""
    echo "Uso:"
    echo "  ./restore.sh db <archivo.sql.gz>"
    echo "  ./restore.sh uploads <archivo.tar.gz>"
    echo "  ./restore.sh full <timestamp>  (ej: 20260317_020000)"
    echo ""
}

confirm_action() {
    local message="$1"
    echo ""
    echo "⚠️  ATENCIÓN: $message"
    echo ""
    read -r -p "¿Continuar? (escribí 'SI' para confirmar): " response
    if [ "$response" != "SI" ]; then
        log "Operación cancelada por el usuario"
        exit 0
    fi
}

wait_for_postgres() {
    local retries=30
    log "Esperando conexión a PostgreSQL..."
    while [ $retries -gt 0 ]; do
        if PGPASSWORD="$PGPASSWORD" pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" > /dev/null 2>&1; then
            return 0
        fi
        retries=$((retries - 1))
        sleep 2
    done
    log "ERROR: No se pudo conectar a PostgreSQL"
    return 1
}

restore_database() {
    local backup_file="$1"

    # Si pasaron solo el nombre del archivo, buscar en el directorio de backups
    if [ ! -f "$backup_file" ]; then
        backup_file="$BACKUP_DIR/db/$backup_file"
    fi

    if [ ! -f "$backup_file" ]; then
        log "ERROR: Archivo no encontrado: $backup_file"
        exit 1
    fi

    # Verificar integridad
    log "Verificando integridad del archivo..."
    if ! gzip -t "$backup_file" 2>/dev/null; then
        log "ERROR: El archivo está corrupto"
        exit 1
    fi
    log "Integridad verificada: OK"

    local size
    size=$(du -h "$backup_file" | cut -f1)
    confirm_action "Se va a REEMPLAZAR TODA la base de datos '${PGDB}' con el backup: $(basename "$backup_file") (${size})"

    wait_for_postgres

    # Crear backup de seguridad antes de restaurar
    log "Creando backup de seguridad previo a la restauración..."
    local safety_backup="$BACKUP_DIR/db/pre_restore_${PGDB}_$(date +%Y%m%d_%H%M%S).sql.gz"
    PGPASSWORD="$PGPASSWORD" pg_dump \
        -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDB" \
        --no-owner --no-privileges 2>/dev/null | gzip > "$safety_backup" || true
    log "Backup de seguridad guardado en: $safety_backup"

    # Terminar conexiones activas
    log "Terminando conexiones activas a la base de datos..."
    PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${PGDB}' AND pid <> pg_backend_pid();" \
        > /dev/null 2>&1 || true

    # Recrear base de datos
    log "Recreando base de datos ${PGDB}..."
    PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -c \
        "DROP DATABASE IF EXISTS ${PGDB};" > /dev/null 2>&1
    PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -c \
        "CREATE DATABASE ${PGDB} OWNER ${PGUSER};" > /dev/null 2>&1

    # Restaurar
    log "Restaurando base de datos desde: $(basename "$backup_file")..."
    gunzip -c "$backup_file" | PGPASSWORD="$PGPASSWORD" psql \
        -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDB" \
        --single-transaction \
        > /dev/null 2>&1

    log "Base de datos restaurada exitosamente"
}

restore_uploads() {
    local backup_file="$1"

    if [ ! -f "$backup_file" ]; then
        backup_file="$BACKUP_DIR/uploads/$backup_file"
    fi

    if [ ! -f "$backup_file" ]; then
        log "ERROR: Archivo no encontrado: $backup_file"
        exit 1
    fi

    local size
    size=$(du -h "$backup_file" | cut -f1)
    confirm_action "Se van a REEMPLAZAR todos los archivos en uploads con el backup: $(basename "$backup_file") (${size})"

    # Backup de seguridad de uploads actuales
    if [ -d "$UPLOADS_DIR" ] && [ -n "$(ls -A "$UPLOADS_DIR" 2>/dev/null)" ]; then
        log "Creando backup de seguridad de uploads actuales..."
        local safety_backup="$BACKUP_DIR/uploads/pre_restore_uploads_$(date +%Y%m%d_%H%M%S).tar.gz"
        tar -czf "$safety_backup" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")" 2>/dev/null || true
        log "Backup de seguridad guardado en: $safety_backup"
    fi

    # Restaurar
    log "Restaurando uploads..."
    mkdir -p "$UPLOADS_DIR"
    rm -rf "${UPLOADS_DIR:?}/"*
    tar -xzf "$backup_file" -C "$(dirname "$UPLOADS_DIR")" 2>/dev/null

    log "Uploads restaurados exitosamente"
}

restore_full() {
    local timestamp="$1"

    local db_file
    local uploads_file

    db_file=$(find "$BACKUP_DIR/db" -name "crm_db_${timestamp}.sql.gz" 2>/dev/null | head -1)
    uploads_file=$(find "$BACKUP_DIR/uploads" -name "crm_uploads_${timestamp}.tar.gz" 2>/dev/null | head -1)

    if [ -z "$db_file" ]; then
        log "ERROR: No se encontró backup de BD para timestamp: $timestamp"
        list_backups
        exit 1
    fi

    log "Restauración completa para timestamp: $timestamp"
    echo "  BD:      $(basename "$db_file")"
    [ -n "$uploads_file" ] && echo "  Uploads: $(basename "$uploads_file")"

    confirm_action "Se va a restaurar TODO el sistema al punto: $timestamp"

    # Restaurar BD (sin confirmación adicional)
    wait_for_postgres

    log "Creando backup de seguridad previo..."
    local safety="$BACKUP_DIR/db/pre_restore_${PGDB}_$(date +%Y%m%d_%H%M%S).sql.gz"
    PGPASSWORD="$PGPASSWORD" pg_dump \
        -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDB" \
        --no-owner --no-privileges 2>/dev/null | gzip > "$safety" || true

    PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${PGDB}' AND pid <> pg_backend_pid();" \
        > /dev/null 2>&1 || true

    PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -c \
        "DROP DATABASE IF EXISTS ${PGDB};" > /dev/null 2>&1
    PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -c \
        "CREATE DATABASE ${PGDB} OWNER ${PGUSER};" > /dev/null 2>&1

    gunzip -c "$db_file" | PGPASSWORD="$PGPASSWORD" psql \
        -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDB" \
        --single-transaction > /dev/null 2>&1

    log "Base de datos restaurada"

    # Restaurar uploads si existe
    if [ -n "$uploads_file" ]; then
        mkdir -p "$UPLOADS_DIR"
        rm -rf "${UPLOADS_DIR:?}/"*
        tar -xzf "$uploads_file" -C "$(dirname "$UPLOADS_DIR")"
        log "Uploads restaurados"
    fi

    log "Restauración completa finalizada exitosamente"
}

# --- Main --------------------------------------------------------------------
case "${1:-}" in
    db)
        if [ -z "${2:-}" ]; then
            echo "Uso: ./restore.sh db <archivo.sql.gz>"
            list_backups
            exit 1
        fi
        restore_database "$2"
        ;;
    uploads)
        if [ -z "${2:-}" ]; then
            echo "Uso: ./restore.sh uploads <archivo.tar.gz>"
            list_backups
            exit 1
        fi
        restore_uploads "$2"
        ;;
    full)
        if [ -z "${2:-}" ]; then
            echo "Uso: ./restore.sh full <timestamp>"
            echo "Ejemplo: ./restore.sh full 20260317_020000"
            list_backups
            exit 1
        fi
        restore_full "$2"
        ;;
    *)
        list_backups
        ;;
esac
