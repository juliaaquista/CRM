# Sistema de Backup - CRM ABISYSA

## Qué se respalda

| Dato | Método | Archivo generado |
|------|--------|------------------|
| Base de datos PostgreSQL | `pg_dump` comprimido | `crm_db_YYYYMMDD_HHMMSS.sql.gz` |
| Archivos subidos (uploads) | `tar.gz` | `crm_uploads_YYYYMMDD_HHMMSS.tar.gz` |

## Configuración

Variables de entorno en `.env` o `docker-compose.yml`:

| Variable | Default | Descripción |
|----------|---------|-------------|
| `BACKUP_SCHEDULE` | `0 2 * * *` | Horario cron (default: 2:00 AM diario) |
| `RETENTION_DAYS` | `30` | Días que se mantienen los backups |

### Ejemplos de horario

```
0 2 * * *     -> Todos los días a las 2:00 AM
0 */6 * * *   -> Cada 6 horas
0 2 * * 1-5   -> Lunes a viernes a las 2:00 AM
0 2,14 * * *  -> A las 2:00 AM y 2:00 PM
```

## Dónde se guardan

Los backups se almacenan en `./data/backups/` en el servidor:

```
data/backups/
├── db/          # Backups de base de datos
├── uploads/     # Backups de archivos
└── logs/        # Logs de ejecución
```

## Restauración

### Ver backups disponibles

```bash
docker compose exec backup /scripts/restore.sh
```

### Restaurar base de datos

```bash
docker compose exec -it backup /scripts/restore.sh db crm_db_20260317_020000.sql.gz
```

### Restaurar uploads

```bash
docker compose exec -it backup /scripts/restore.sh uploads crm_uploads_20260317_020000.tar.gz
```

### Restaurar TODO (BD + uploads) de un punto en el tiempo

```bash
docker compose exec -it backup /scripts/restore.sh full 20260317_020000
```

> El script siempre crea un backup de seguridad ANTES de restaurar, por si algo sale mal.

## Backup manual (fuera de horario)

```bash
docker compose exec backup /scripts/backup.sh
```

## Monitoreo

### Ver logs del último backup

```bash
docker compose logs backup --tail 50
```

### Ver log detallado

```bash
cat data/backups/logs/backup_$(date +%Y%m%d).log
```

### Verificar que el cron está activo

```bash
docker compose exec backup crontab -l
```

## Copiar backups fuera del servidor

```bash
# Descargar último backup de BD a tu máquina local
scp usuario@servidor:/ruta/crm/data/backups/db/$(ls -t data/backups/db/ | head -1) ./

# Sincronizar todos los backups con rsync
rsync -avz usuario@servidor:/ruta/crm/data/backups/ ./backups-local/
```

## Seguridad

- El contenedor de backup tiene acceso **solo lectura** a uploads (`ro`)
- Los backups se guardan fuera de los contenedores en `./data/backups/`
- Cada restauración genera un backup de seguridad previo automáticamente
- La restauración requiere confirmación manual (escribir "SI")
