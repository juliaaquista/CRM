FROM postgres:16-alpine

# Instalar herramientas necesarias
RUN apk add --no-cache bash dcron

# Copiar scripts
COPY backup.sh /scripts/backup.sh
COPY restore.sh /scripts/restore.sh
COPY entrypoint.sh /scripts/entrypoint.sh

RUN chmod +x /scripts/*.sh

# Crear directorios de backup
RUN mkdir -p /backups/db /backups/uploads /backups/logs

ENTRYPOINT ["/scripts/entrypoint.sh"]
