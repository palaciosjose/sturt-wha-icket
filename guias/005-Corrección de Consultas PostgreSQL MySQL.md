# Corrección de Consultas SQL: PostgreSQL → MySQL

## Problema Identificado

El sistema estaba usando sintaxis de PostgreSQL en las consultas SQL, pero la base de datos configurada es MySQL. Esto causaba errores constantes en el sistema de campañas.

## Errores Detectados

### 1. Consulta de Campañas Programadas

**Antes (PostgreSQL):**
```sql
SELECT id, "scheduledAt" FROM "Campaigns" c
WHERE "scheduledAt" BETWEEN NOW() AND NOW() + '1 hour'::interval AND status = 'PROGRAMADA'
```

**Después (MySQL):**
```sql
SELECT id, scheduledAt FROM Campaigns c
WHERE scheduledAt BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 1 HOUR) AND status = 'PROGRAMADA'
```

### 2. Consulta de Usuarios Offline

**Antes (PostgreSQL):**
```sql
SELECT id FROM "Users" WHERE "updatedAt" < NOW() - '5 minutes'::interval AND online = true
```

**Después (MySQL):**
```sql
SELECT id FROM Users WHERE updatedAt < DATE_SUB(NOW(), INTERVAL 5 MINUTE) AND online = true
```

### 3. Consulta de Reportes

**Antes (PostgreSQL):**
```sql
WHERE tt."queuedAt" >= (NOW() - '? days'::interval)
```

**Después (MySQL):**
```sql
WHERE tt.queuedAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
```

## Diferencias Clave entre PostgreSQL y MySQL

### 1. Comillas en Nombres de Tablas/Columnas
- **PostgreSQL**: Usa comillas dobles para nombres con mayúsculas
- **MySQL**: No requiere comillas para nombres simples

### 2. Intervalos de Tiempo
- **PostgreSQL**: `'1 hour'::interval`
- **MySQL**: `INTERVAL 1 HOUR`

### 3. Funciones de Fecha
- **PostgreSQL**: `NOW() - '5 minutes'::interval`
- **MySQL**: `DATE_SUB(NOW(), INTERVAL 5 MINUTE)`

## Archivos Corregidos

1. **`waticketsaas/backend/src/queues.ts`**
   - `handleVerifyCampaigns()`: Consulta de campañas programadas
   - `handleLoginStatus()`: Consulta de usuarios offline

2. **`waticketsaas/backend/src/services/ReportService/DashbardDataService.ts`**
   - Consulta de reportes con filtro de días

## Resultado Esperado

Con estas correcciones:

✅ **Eliminación de errores SQL** en el sistema de campañas
✅ **Funcionamiento correcto** de la verificación de campañas programadas
✅ **Compatibilidad completa** con MySQL
✅ **Logging detallado** para debugging

## Verificación

Después de aplicar las correcciones, los logs deberían mostrar:

```
[Campaigns] Verificando campañas programadas...
[Campaigns] Encontradas X campañas programadas
[Campaigns] Procesando campaña Y - Programada para: 2025-07-18 00:27:00
```

En lugar de errores constantes como:
```
ERROR [Campaigns] Error en handleVerifyCampaigns:
```

## Próximos Pasos

1. **Reiniciar el backend** para aplicar los cambios
2. **Crear una campaña de prueba** programada para 1-2 minutos
3. **Monitorear los logs** para verificar que no hay más errores SQL
4. **Verificar que las campañas se procesen** correctamente

El sistema de campañas ahora debería funcionar correctamente con MySQL. 