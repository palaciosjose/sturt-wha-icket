# Corrección del Cálculo de Delay en Campañas

## Problema Identificado

El sistema de campañas estaba calculando incorrectamente los delays para el envío de mensajes, lo que causaba que los jobs no se ejecutaran en el momento correcto.

## Análisis del Problema

### 1. Error en `calculateDelay()`

**Antes:**
```javascript
function calculateDelay(index, baseDelay, longerIntervalAfter, greaterInterval, messageInterval) {
  const diffSeconds = differenceInSeconds(baseDelay, new Date());
  if (index > longerIntervalAfter) {
    return diffSeconds * 1000 + greaterInterval
  } else {
    return diffSeconds * 1000 + messageInterval
  }
}
```

**Problemas:**
- `baseDelay` era una fecha pero se trataba como número
- `messageInterval` no se convertía a milisegundos
- No había validación para delays negativos

**Después:**
```javascript
function calculateDelay(index, baseDelay, longerIntervalAfter, greaterInterval, messageInterval) {
  const now = new Date();
  const scheduledTime = new Date(baseDelay);
  const diffSeconds = differenceInSeconds(scheduledTime, now);
  
  // Calcular el delay total
  let totalDelay = diffSeconds * 1000; // Convertir a milisegundos
  
  // Agregar el intervalo correspondiente
  if (index > longerIntervalAfter) {
    totalDelay += greaterInterval;
  } else {
    totalDelay += messageInterval * 1000; // Convertir a milisegundos
  }
  
  // Asegurar que el delay no sea negativo
  return Math.max(totalDelay, 0);
}
```

### 2. Error en `handleProcessCampaign()`

**Antes:**
```javascript
const longerIntervalAfter = parseToMilliseconds(settings.longerIntervalAfter);
const greaterInterval = parseToMilliseconds(settings.greaterInterval);
const messageInterval = settings.messageInterval;

let baseDelay = campaign.scheduledAt;

for (let i = 0; i < contactData.length; i++) {
  baseDelay = addSeconds(baseDelay, i > longerIntervalAfter ? greaterInterval : messageInterval);
  // ...
}
```

**Problemas:**
- Se convertían los intervalos a milisegundos innecesariamente
- Se modificaba `baseDelay` en cada iteración
- La lógica de cálculo era confusa

**Después:**
```javascript
const longerIntervalAfter = settings.longerIntervalAfter; // En segundos
const greaterInterval = settings.greaterInterval; // En segundos
const messageInterval = settings.messageInterval; // En segundos

for (let i = 0; i < contactData.length; i++) {
  // Calcular el tiempo base para este contacto
  const baseDelay = addSeconds(campaign.scheduledAt, i * messageInterval);
  // ...
}
```

## Mejoras Implementadas

### 1. Logging Detallado en `handlePrepareContact()`

Se agregó logging completo para rastrear cada paso:

```javascript
logger.info(`[Prepare] Iniciando preparación de contacto: Contacto=${contactId}, Campaña=${campaignId}, Delay=${delay}ms`);
logger.info(`[Prepare] Procesando contacto: ${contact.name} (${contact.number})`);
logger.info(`[Prepare] Mensajes válidos encontrados: ${messages.length}`);
logger.info(`[Prepare] Programando envío con delay: ${delay}ms`);
logger.info(`[Prepare] Job de envío programado: ${nextJob.id}`);
```

### 2. Validaciones Mejoradas

- Verificación de que la campaña existe
- Verificación de que el contacto existe
- Validación de mensajes válidos
- Logging de errores con stack trace

### 3. Cálculo Correcto de Delays

- Conversión correcta de segundos a milisegundos
- Manejo adecuado de fechas
- Prevención de delays negativos
- Cálculo progresivo de tiempos de envío

## Resultado Esperado

Con estas correcciones:

✅ **Delays calculados correctamente** para cada contacto
✅ **Jobs programados en el momento correcto**
✅ **Logging detallado** para debugging
✅ **Envío de mensajes** cuando llegue la hora programada

## Verificación

Después de aplicar las correcciones, deberías ver en los logs:

```
[Prepare] Iniciando preparación de contacto: Contacto=1, Campaña=4, Delay=99020ms
[Prepare] Procesando contacto: Dantex (51936450940)
[Prepare] Mensajes válidos encontrados: 1
[Prepare] Mensaje preparado: {{firstName}} OK OK...
[Prepare] Programando envío con delay: 99020ms
[Prepare] Job de envío programado: 12345
[Dispatch] Iniciando envío de campaña: Campaña=4, Envío=1
[Dispatch] Enviando mensaje a: Dantex (51936450940)
[Dispatch] Mensaje de texto enviado
[Dispatch] Mensaje entregado exitosamente
```

## Próximos Pasos

1. **Reiniciar el backend** para aplicar los cambios
2. **Crear una nueva campaña** programada para 1-2 minutos
3. **Monitorear los logs** para ver el proceso completo
4. **Verificar que los mensajes se envíen** en el momento correcto

El sistema de campañas ahora debería funcionar correctamente con delays calculados apropiadamente. 