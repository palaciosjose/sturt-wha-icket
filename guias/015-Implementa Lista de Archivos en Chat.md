# 📁 Implementación: Lista de Archivos en Chat

## 🎯 **Objetivo del Proyecto**

Implementar una nueva funcionalidad en el chat que permita enviar múltiples archivos desde listas predefinidas, reutilizando la funcionalidad existente del módulo de Campañas y mejorando la experiencia visual del usuario.

## 📋 **Requisitos Iniciales**

### **Funcionalidad Principal:**
- ✅ Agregar botón con icono de carpeta (📁) junto al botón de respuestas rápidas
- ✅ Al hacer clic, mostrar dropdown con listas de archivos disponibles
- ✅ Al seleccionar una lista, enviar todos los archivos secuencialmente
- ✅ Mantener nombres originales de archivos (sin códigos/timestamps)
- ✅ Mostrar tamaño real de archivos (no "0 B")
- ✅ Diseño minimalista y elegante
- ✅ Sin texto duplicado debajo de archivos

### **Criterios de Aceptación:**
- ✅ Nombres originales de archivos
- ✅ Tamaño real de archivos
- ✅ Diseño minimalista
- ✅ Sin texto duplicado
- ✅ Envío secuencial
- ✅ Iconos por tipo de archivo

## 🛠️ **Implementación Técnica Paso a Paso**

### **Paso 1: Creación del Hook useFiles**

**Archivo:** `frontend/src/hooks/useFiles/index.js`

**Objetivo:** Crear un hook personalizado para manejar las listas de archivos, reutilizando la funcionalidad existente del módulo de Campañas.

```javascript
import { useState } from "react";
import api from "../../services/api";
import { toastError } from "../../utils/error";

export const useFiles = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const list = async ({ companyId, userId, searchParam = "", pageNumber = "1" }) => {
    setLoading(true);
    try {
      const { data } = await api.get("/files/", {
        params: { 
          searchParam, 
          pageNumber,
          companyId 
        },
      });
      
      // Cargar detalles completos de cada lista de archivos
      const filesWithDetails = await Promise.all(
        data.files.map(async (fileList) => {
          try {
            const { data: details } = await api.get(`/files/${fileList.id}`);
            return {
              ...fileList,
              options: details.options || []
            };
          } catch (err) {
            console.error(`Error cargando detalles de lista ${fileList.id}:`, err);
            return {
              ...fileList,
              options: []
            };
          }
        })
      );
      
      setFiles(filesWithDetails);
      setHasMore(data.hasMore);
      setLoading(false);
      return filesWithDetails;
    } catch (err) {
      setLoading(false);
      toastError(err);
      return [];
    }
  };

  return { files, loading, hasMore, list };
};
```

**Explicación:** Este hook reutiliza la API existente de `/files/` que ya estaba implementada en el módulo de Campañas, pero agrega la funcionalidad de cargar los detalles completos de cada lista de archivos.

### **Paso 2: Modificación del Componente MessageInputCustom**

**Archivo:** `frontend/src/components/MessageInputCustom/index.js`

#### **2.1 Agregar Imports y Estado:**

```javascript
import { useFiles } from "../../hooks/useFiles";
import FolderIcon from "@material-ui/icons/Folder";

// En el componente:
const { files, loading: loadingFiles, list: listFiles } = useFiles();
const [fileListAnchorEl, setFileListAnchorEl] = useState(null);
```

#### **2.2 Agregar Botón de Lista de Archivos:**

```javascript
{/* Botón de Lista de Archivos */}
<IconButton
  color="primary"
  onClick={handleFileListClick}
  disabled={loadingFiles}
>
  <FolderIcon />
</IconButton>
```

#### **2.3 Implementar Función de Carga de Listas:**

```javascript
const handleFileListClick = async (event) => {
  setFileListAnchorEl(event.currentTarget);
  
  try {
    await listFiles({ companyId: user.companyId });
  } catch (err) {
    console.error("Error cargando listas de archivos:", err);
  }
};
```

#### **2.4 Implementar Función de Envío de Archivos:**

```javascript
const handleFileListSelect = async (value) => {
  setFileListAnchorEl(null);
  
  if (!value || !value.value || !value.value.options) {
    console.log("No hay archivos en la lista.");
    return;
  }

  console.log("Enviando lista de archivos:", value.value.name);
  console.log("Archivos en la lista:", value.value.options.length);

  try {
    // Enviar cada archivo de la lista
    for (const fileOption of value.value.options) {
      try {
        console.log("Procesando archivo:", fileOption.name);
        
        // Construir URL del archivo
        const publicFolder = "public/fileList";
        const fileUrl = `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080'}/${publicFolder}/${value.value.id}/${fileOption.path}`;
        
        console.log("URL del archivo:", fileUrl);
        
        // Extraer nombre del archivo desde la ruta
        const fileName = fileOption.path || fileOption.name || 'documento';
        console.log("Nombre del archivo extraído:", fileName);
        
        // Descargar archivo
        const { data } = await axios.get(fileUrl, {
          responseType: "blob",
          timeout: 10000,
        });

        console.log("Archivo descargado:", fileName, "tamaño:", data.size);
        
        // Enviar archivo
        await handleUploadQuickMessageMedia(data, fileName);
        
        // Pausa entre archivos
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error("Error procesando archivo:", err);
      }
    }
    
    console.log("Lista de archivos enviada exitosamente");
  } catch (err) {
    console.error("Error enviando lista de archivos:", err);
    toastError(err);
  }
};
```

### **Paso 3: Mejora de la Función handleUploadQuickMessageMedia**

**Objetivo:** Modificar la función existente para mantener nombres originales y mejorar el manejo de archivos.

```javascript
const handleUploadQuickMessageMedia = async (blob, originalFileName) => {
  try {
    console.log("Procesando multimedia para envío, tipo:", blob.type);
    console.log("Nombre original del archivo:", originalFileName);
    
    // Mantener el nombre original del archivo
    let filename = originalFileName;
    
    // Si el nombre es muy extenso (más de 50 caracteres), truncarlo
    if (filename && filename.length > 50) {
      const extension = filename.split('.').pop();
      const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
      const truncatedName = nameWithoutExt.substring(0, 47) + '...';
      filename = `${truncatedName}.${extension}`;
      console.log("Nombre truncado:", filename);
    }
    
    // Si no hay nombre original, generar uno con timestamp
    if (!filename) {
      const extension = blob.type.split("/")[1] || 'bin';
      filename = `${new Date().getTime()}.${extension}`;
      console.log("Nombre generado:", filename);
    }
    
    console.log("Nombre final del archivo:", filename);

    const formData = new FormData();
    formData.append("medias", blob, filename);
    formData.append("body", filename); // Usar el nombre del archivo como body
    formData.append("fromMe", true);

    console.log("Enviando multimedia al servidor...");
    
    await api.post(`/messages/${ticketId}`, formData);
    
    console.log("Multimedia enviada exitosamente");
  } catch (err) {
    console.error("Error al enviar multimedia:", err);
    toastError(err);
    throw err;
  }
};
```

### **Paso 4: Modificaciones en el Backend**

#### **4.1 Configuración de Upload (Nombres Originales)**

**Archivo:** `backend/src/config/upload.ts`

**Problema:** Los archivos se guardaban con timestamps, causando nombres como "1752897502718.UserConocidos.xlsx"

**Solución:**
```javascript
filename(req, file, cb) {
  const { typeArch } = req.body;

  // Mantener el nombre original del archivo sin timestamp
  const fileName = file.originalname.replace('/','-').replace(/ /g, "_");
  return cb(null, fileName);
}
```

#### **4.2 Agregar Campo mediaSize a la Base de Datos**

**Migración:** `backend/src/database/migrations/20250118000001-add-mediaSize-to-messages.ts`

**Problema:** Los archivos mostraban "0 B" porque no se guardaba el tamaño

**Solución:**
```javascript
import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("Messages", "mediaSize", {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("Messages", "mediaSize");
  }
};
```

#### **4.3 Actualizar Modelo Message**

**Archivo:** `backend/src/models/Message.ts`

```javascript
@Column
mediaSize: number;
```

#### **4.4 Modificar MessageController**

**Archivo:** `backend/src/controllers/MessageController.ts`

**Objetivo:** Evitar texto duplicado y calcular tamaño del archivo

```javascript
if (medias) {
  await Promise.all(
    medias.map(async (media: Express.Multer.File, index) => {
      // No enviar el nombre del archivo como caption para evitar texto duplicado
      const bodyToSend = "";
      
      // Obtener el tamaño del archivo
      const fs = require('fs');
      const stats = fs.statSync(media.path);
      const fileSize = stats.size;
      
      await SendWhatsAppMedia({ media, ticket, body: bodyToSend, fileSize });
    })
  );
}
```

#### **4.5 Actualizar SendWhatsAppMedia**

**Archivo:** `backend/src/services/WbotServices/SendWhatsAppMedia.ts`

**Objetivo:** Guardar el tamaño del archivo en la base de datos

```javascript
interface Request {
  media: Express.Multer.File;
  ticket: Ticket;
  body?: string;
  isForwarded?: boolean;
  fileSize?: number;
}

const SendWhatsAppMedia = async ({
  media,
  ticket,
  body,
  isForwarded = false,
  fileSize
}: Request): Promise<WAMessage> => {
  // ... código existente ...

  // Guardar el mensaje en la base de datos con el tamaño del archivo
  const messageData = {
    id: sentMessage.key.id,
    ticketId: ticket.id,
    contactId: undefined, // Mensaje enviado por nosotros
    body: bodyMessage || media.originalname,
    fromMe: true,
    read: true,
    mediaUrl: media.filename,
    mediaType: media.mimetype.split("/")[0],
    mediaSize: fileSize || 0,
    ack: sentMessage.status,
    remoteJid: sentMessage.key.remoteJid,
    participant: sentMessage.key.participant,
    dataJson: JSON.stringify(sentMessage),
  };

  await CreateMessageService({
    messageData,
    companyId: ticket.companyId,
  });

  return sentMessage;
};
```

### **Paso 5: Mejora del Componente MessagesList**

**Archivo:** `frontend/src/components/MessagesList/index.js`

#### **5.1 Agregar Función formatFileSize:**

```javascript
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'kB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};
```

#### **5.2 Mejorar Renderizado de Archivos:**

**Problema:** Los archivos mostraban códigos como "1752897502718.UserConocidos.xlsx"

**Solución:** Extraer nombre original desde la URL

```javascript
{(() => {
  // Extraer el nombre original del archivo desde la URL
  const fileName = message.mediaUrl ? message.mediaUrl.split('/').pop() : message.body || 'document';
  // Si el nombre tiene timestamp, extraer solo la parte después del punto
  let originalFileName = fileName;
  if (fileName && fileName.includes('.')) {
    const parts = fileName.split('.');
    if (parts.length > 2 && /^\d+$/.test(parts[0])) {
      // Si la primera parte es un número (timestamp), usar el resto
      originalFileName = parts.slice(1).join('.');
    }
  }
  const extension = originalFileName.split('.').pop()?.toLowerCase();
  
  // Colores e iconos según el tipo de archivo
  let iconConfig;
  if (['doc', 'docx'].includes(extension)) {
    iconConfig = { bg: '#2b579a', text: 'W' }; // Word - Azul
  } else if (['xls', 'xlsx', 'csv'].includes(extension)) {
    iconConfig = { bg: '#217346', text: '📊' }; // Excel/CSV - Verde
  } else if (['pdf'].includes(extension)) {
    iconConfig = { bg: '#dc3545', text: 'PDF' }; // PDF - Rojo
  } else if (['ppt', 'pptx'].includes(extension)) {
    iconConfig = { bg: '#d24726', text: 'P' }; // PowerPoint - Naranja
  } else if (['txt'].includes(extension)) {
    iconConfig = { bg: '#6c757d', text: 'T' }; // Texto - Gris
  } else {
    iconConfig = { bg: '#6c757d', text: '📄' }; // Default - Gris
  }
  
  return (
    <div style={{
      width: '40px',
      height: '40px',
      borderRadius: '6px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: '12px',
      fontSize: '16px',
      fontWeight: 'bold',
      color: 'white',
      backgroundColor: iconConfig.bg
    }}>
      {iconConfig.text}
    </div>
  );
})()}
```

## 🐛 **Problemas Encontrados y Soluciones**

### **1. Error de Campo mediaSize**

**Problema:** `Unknown column 'Message.mediaSize' in 'field list'`

**Causa:** La migración no se ejecutó correctamente

**Solución:**
```bash
npx sequelize db:migrate
```

### **2. Nombres con Timestamp**

**Problema:** Los archivos se mostraban con códigos como "1752897502718.UserConocidos.xlsx"

**Causa:** El sistema de upload agregaba timestamp al nombre

**Solución:** Modificar `upload.ts` para mantener nombres originales

### **3. Tamaño de Archivo "0 B"**

**Problema:** Todos los archivos mostraban "0 B"

**Causa:** No se guardaba el tamaño del archivo en la base de datos

**Solución:** Agregar campo `mediaSize` y calcular tamaño real

### **4. Texto Duplicado**

**Problema:** Se mostraba el nombre del archivo como texto adicional

**Causa:** El `body` del mensaje contenía el nombre del archivo

**Solución:** No enviar nombre como caption cuando es archivo

### **5. Códigos en Interfaz**

**Problema:** Los archivos existentes seguían mostrando códigos

**Causa:** El frontend usaba `message.body` que contenía timestamp

**Solución:** Extraer nombre original desde `message.mediaUrl`

## 📊 **Resultados Finales**

### **✅ Funcionalidades Implementadas:**

1. **Botón de Lista de Archivos:** Icono de carpeta junto a respuestas rápidas
2. **Dropdown de Listas:** Muestra todas las listas disponibles
3. **Envío Secuencial:** Envía archivos uno por uno con pausa
4. **Nombres Originales:** Mantiene nombres sin códigos
5. **Tamaño Real:** Muestra tamaño correcto (8.6 kB, 2.8 MB, etc.)
6. **Diseño Minimalista:** Iconos por tipo, información clara
7. **Sin Texto Duplicado:** Solo muestra el archivo visual

### **🎨 Diseño Visual:**

- **Word:** Azul con "W"
- **Excel/CSV:** Verde con icono de tabla
- **PDF:** Rojo con "PDF"
- **PowerPoint:** Naranja con "P"
- **Texto:** Gris con "T"
- **Otros:** Gris con icono genérico

### **📱 Experiencia de Usuario:**

- ✅ **Intuitivo:** Botón fácil de encontrar
- ✅ **Rápido:** Envío automático de múltiples archivos
- ✅ **Claro:** Información visual del archivo
- ✅ **Profesional:** Diseño limpio y moderno

## 🔧 **Comandos de Desarrollo**

### **Backend:**
```bash
# Compilar
npm run build

# Ejecutar migraciones
npx sequelize db:migrate

# Verificar estado de migraciones
npx sequelize db:migrate:status

# Iniciar en desarrollo
npm run dev:server
```

### **Frontend:**
```bash
# Compilar
npm run build

# Iniciar en desarrollo
npm start
```

## 📝 **Notas para Versiones Futuras**

### **Mejoras Sugeridas:**

1. **Progreso Visual:** Barra de progreso durante envío
2. **Cancelación:** Poder cancelar envío en curso
3. **Previsualización:** Vista previa de archivos antes de enviar
4. **Filtros:** Filtrar por tipo de archivo
5. **Búsqueda:** Buscar en listas de archivos
6. **Favoritos:** Marcar listas como favoritas
7. **Historial:** Ver archivos enviados recientemente

### **Consideraciones Técnicas:**

1. **Rendimiento:** Optimizar carga de listas grandes
2. **Seguridad:** Validar tipos de archivo permitidos
3. **Escalabilidad:** Manejar archivos muy grandes
4. **Compatibilidad:** Probar con diferentes navegadores
5. **Accesibilidad:** Agregar soporte para lectores de pantalla

### **Mantenimiento:**

1. **Logs:** Mantener logs detallados para debugging
2. **Tests:** Agregar tests unitarios y de integración
3. **Documentación:** Mantener documentación actualizada
4. **Monitoreo:** Implementar métricas de uso
5. **Backup:** Estrategia de backup para archivos

## 🎯 **Conclusión**

La funcionalidad de Lista de Archivos se implementó exitosamente, cumpliendo con todos los requisitos iniciales. El sistema ahora permite enviar múltiples archivos de forma eficiente y con una experiencia de usuario profesional.

**Estado:** ✅ **COMPLETADO**
**Fecha:** 18 de Julio, 2025
**Versión:** 1.0.0

---

**Este documento sirve como guía completa para futuras implementaciones similares y como referencia técnica para el equipo de desarrollo.** 