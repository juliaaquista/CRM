#!/bin/bash
# =============================================================================
# Entrypoint del contenedor de backup
# Configura el cron y ejecuta un backup inicial
# =============================================================================

set -euo pipefail

BACKUP_SCHEDULE="${BACKUP_SCHEDULE:-0 2 * * *}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Configurando backup automático..."
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Horario cron: ${BACKUP_SCHEDULE}"

# Crear archivo de entorno para que cron tenga acceso a las variables
env | grep -E '^(POSTGRES_|BACKUP_|UPLOADS_)' > /etc/environment_backup

# Crear crontab con todas las variables de entorno
cat > /etc/crontabs/root << CRON
# Backup automático CRM ABISYSA
$(echo "$BACKUP_SCHEDULE") /bin/bash -c 'source /etc/environment_backup && /scripts/backup.sh' >> /backups/logs/cron.log 2>&1
CRON

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Crontab configurado:"
cat /etc/crontabs/root

# Ejecutar backup inicial al arrancar (si no existe ninguno)
if [ -z "$(ls -A /backups/db/ 2>/dev/null)" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] No hay backups previos. Ejecutando backup inicial..."
    /scripts/backup.sh
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Ya existen backups previos. Esperando al horario programado."
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Servicio de backup activo. Esperando cron..."

# Ejecutar cron en foreground
crond -f -l 2
