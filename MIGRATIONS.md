# Migraciones del CRM Abisysa

Este archivo documenta los cambios de **base de datos** que requiere cada
versión del CRM. El ingeniero de infraestructura debe ejecutar el SQL
correspondiente **antes** de levantar una nueva versión del backend.

> ⚠️ **Importante**: los datos del cliente viven en el volumen `data/pgdata/`
> del servidor. El código que se entrega **NO incluye** esa carpeta, por lo
> que desplegar una nueva versión no toca los datos reales. Pero sí hace
> falta aplicar cambios de esquema (nuevas columnas, nuevos valores de enum,
> etc.) manualmente cuando se indica en este archivo.

---

## Procedimiento general de actualización

Cada vez que se despliegue una versión nueva del CRM:

1. **Backup** de la base de datos antes de cualquier cambio:
   ```bash
   docker compose exec db pg_dump -U crm_user crm_db > backup_$(date +%Y%m%d_%H%M%S).sql
   ```
2. **Leer** la sección de esta versión en este archivo.
3. **Ejecutar** el SQL indicado desde dentro del contenedor de Postgres:
   ```bash
   docker compose exec -T db psql -U crm_user -d crm_db < migrations/vX.Y.sql
   ```
   o pegándolo directamente:
   ```bash
   docker compose exec db psql -U crm_user -d crm_db
   ```
4. **Levantar** la nueva versión:
   ```bash
   docker compose pull    # si usás imágenes remotas
   docker compose up -d --build
   ```
5. **Verificar** que el backend arranca sin errores:
   ```bash
   docker compose logs -f backend
   ```

---

## v1.3.0 — Ajustes del cliente (abril 2026)

### Cambios de código (frontend + backend)

- **Ordenamiento server-side** en la tabla de Ofertas (por N°, Fecha y Producto).
- **Campo `direccion` de empresa** ahora se usa para geocodificación
  (más precisión en el mapa).
- Nuevo origen de empresa: **`PROSPECCION`**.
- Nuevos modos de pago: **`RENTING`** y **`LEASING`**.
- Orden del formulario de Nueva Empresa: "Origen" ahora al final.
- Mensajes de error específicos en el login ("Contraseña incorrecta",
  "No existe ningún usuario con ese email", etc.).
- Corrección del interceptor de Axios: ya no redirige al /login cuando el
  error 401 viene del propio request de login.
- Fix de deprecated `message` → `title` en el componente `Alert` de Ant Design.

### Mejoras estéticas y de usabilidad

- Logo de Abisysa integrado en login y sidebar.
- Favicon con el logo.
- Tipografía **Inter** en toda la app (vía Google Fonts).
- Paleta corporativa centralizada en el tema de Ant Design.
- Avatar del usuario con iniciales + dropdown con info en el header.
- **Breadcrumbs** dinámicos en páginas internas (muestra nombre real del
  recurso en detalle de empresa/oferta).
- **Página 404** personalizada con logo corporativo.
- **Atajos de teclado** globales: `Ctrl+K` (foco buscador),
  `Ctrl+N` (nueva entidad), `Esc` (cerrar modal).
- **Persistencia en localStorage** de ordenamiento, filtros, page size y
  modo de vista por tabla (Empresas y Ofertas).
- **Sidebar como Drawer** en pantallas < 992px (mobile/tablet).
- **Dashboard** con botones de accesos rápidos + sección "Últimas empresas
  visitadas" (se actualiza automáticamente al visitar una empresa).
- **Empty states** ilustrados en las tablas cuando no hay datos.
- **Loading skeletons** en la primera carga de cada tabla.
- **Fade-in** sutil al cambiar de página (respeta `prefers-reduced-motion`).

### 🔴 SQL requerido antes de levantar esta versión

Los siguientes `ALTER TYPE` son **obligatorios**. Sin ellos, el backend va a
responder con error 500 cuando un usuario intente guardar una empresa con
origen `PROSPECCION` o una oferta con modo de pago `RENTING`/`LEASING`.

```sql
-- Nuevo origen de empresa
ALTER TYPE origenempresaenum ADD VALUE IF NOT EXISTS 'PROSPECCION';

-- Nuevos modos de pago
ALTER TYPE modopagoenum ADD VALUE IF NOT EXISTS 'RENTING';
ALTER TYPE modopagoenum ADD VALUE IF NOT EXISTS 'LEASING';
```

### Verificación post-migración

Después de correr el SQL, verificar que los valores están presentes:

```sql
-- Debería devolver: WEB, FERIAS, RRSS, ABISYSA, REFERIDO, OTRO, PROSPECCION
SELECT unnest(enum_range(NULL::origenempresaenum))::text;

-- Debería devolver: EFECTIVO, TRANSFERENCIA, CHEQUE, RENTING, LEASING
SELECT unnest(enum_range(NULL::modopagoenum))::text;
```

### Rollback

Si algo sale mal y hay que volver a la versión anterior:

1. Restaurar el backup previo a la migración:
   ```bash
   docker compose exec -T db psql -U crm_user -d crm_db < backup_XXXX.sql
   ```
2. Volver al código de la versión anterior y `docker compose up -d --build`.

> **Nota**: Postgres **no permite remover valores de un enum** una vez agregados.
> Los valores `PROSPECCION`, `RENTING`, `LEASING` van a quedar en el tipo
> aunque se haga rollback del código. Esto es inofensivo: simplemente no se
> van a usar desde el frontend. No hay necesidad de "limpiarlos".

---

## ⚠️ Advertencias generales

### Nunca ejecutar `python -m app.seed` en producción

El archivo `backend/app/seed.py` contiene un script de inicialización que
**borra toda la base de datos** (`DROP SCHEMA public CASCADE`) y carga
datos de prueba. Este script existe únicamente para desarrollo/demo.

Si alguien lo ejecuta contra la base de producción por error, **se pierden
todos los datos del cliente**. Sólo restaurar desde backup.

### Backup automático

El `docker-compose.yml` ya incluye un servicio `backup` que ejecuta
`pg_dump` diariamente (por defecto 2:00 AM) y mantiene los últimos 30 días
en `data/backups/`. Verificar que el servicio está corriendo:

```bash
docker compose ps backup
docker compose logs backup --tail 20
```

### Los datos del cliente nunca viajan con el código

La carpeta `data/pgdata/` en el servidor contiene los datos reales del
cliente y **no** se incluye cuando el desarrollador empaqueta una nueva
versión para entrega. Cuando se extrae una versión nueva sobre el mismo
directorio del servidor, asegurarse de **no sobrescribir** esta carpeta.
