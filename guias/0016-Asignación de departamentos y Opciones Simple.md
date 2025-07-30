# 0016-Asignación de departamentos y Opciones Simple

## 📋 **RESUMEN EJECUTIVO**

Este documento describe la implementación del sistema de gestión de departamentos (colas) y sus opciones en Whaticket SaaS. El sistema permite crear departamentos y agregar opciones de chatbot que se guardan correctamente en la base de datos.

## 🎯 **OBJETIVO**

Implementar un flujo de trabajo robusto para:
- ✅ Crear departamentos con opciones de chatbot
- ✅ Guardar opciones temporalmente durante la creación
- ✅ Persistir opciones cuando se guarda el departamento
- ✅ Cargar opciones existentes al editar departamentos

## 🏗️ **ARQUITECTURA DEL SISTEMA**

### **Componentes Principales:**

1. **`QueueModal`** - Modal para crear/editar departamentos
2. **`QueueOptions`** - Gestión de opciones de chatbot
3. **`QueueOptionStepper`** - Interfaz de opciones anidadas
4. **Backend Services** - API para persistencia de datos

### **Flujo de Datos:**
```
Frontend (React) ↔ API (Node.js) ↔ Database (MySQL)
```

## 🔧 **IMPLEMENTACIÓN TÉCNICA**

### **1. Base de Datos**

#### **Tabla: `QueueOptions`**
```sql
CREATE TABLE QueueOptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  option VARCHAR(50),
  queueId INT,
  parentId INT,
  transferQueueId INT,
  mediaPath VARCHAR(255),
  mediaName VARCHAR(255),
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  FOREIGN KEY (queueId) REFERENCES Queues(id),
  FOREIGN KEY (parentId) REFERENCES QueueOptions(id),
  FOREIGN KEY (transferQueueId) REFERENCES Queues(id)
);
```

#### **Migración: `add-transfer-queue-to-queue-options.ts`**
```typescript
import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("QueueOptions", "transferQueueId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "Queues", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
  },
  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("QueueOptions", "transferQueueId");
  }
};
```

### **2. Backend (Node.js + TypeScript)**

#### **Modelo: `QueueOption.ts`**
```typescript
@Table
class QueueOption extends Model<QueueOption> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  title: string;

  @AllowNull
  @Column
  message: string;

  @AllowNull
  @Column
  option: string;

  @ForeignKey(() => Queue)
  @Column
  queueId: number;

  @ForeignKey(() => QueueOption)
  @Column
  parentId: number;

  @ForeignKey(() => Queue)
  @Column
  transferQueueId: number;

  @BelongsTo(() => Queue)
  queue: Queue;

  @BelongsTo(() => QueueOption, { foreignKey: 'parentId' })
  parent: QueueOption;

  @BelongsTo(() => Queue, { foreignKey: 'transferQueueId' })
  transferQueue: Queue;
}
```

#### **Servicio: `CreateService.ts`**
```typescript
const CreateService = async (queueOptionData: QueueOptionData): Promise<QueueOption> => {
  console.log("🔍 CreateService - Datos recibidos:", queueOptionData);
  console.log("🔍 CreateService - queueId:", queueOptionData.queueId);
  
  const queueOption = await QueueOption.create(queueOptionData);
  console.log("✅ CreateService - Opción creada:", queueOption.toJSON());
  
  return queueOption;
};
```

#### **Servicio: `ListService.ts`**
```typescript
const ListService = async ({ queueId, queueOptionId, parentId }: QueueOptionFilter): Promise<QueueOption[]> => {
  console.log("🔍 ListService - Parámetros recibidos:", { queueId, queueOptionId, parentId });

  const whereOptions: WhereOptions = {};

  if (queueId) {
    whereOptions.queueId = queueId;
    console.log("🔍 ListService - Agregando queueId al where:", queueId);
  }

  if (parentId == -1) {
    whereOptions.parentId = null;
    console.log("🔍 ListService - Agregando parentId null al where");
  }

  const queueOptions = await QueueOption.findAll({
    where: whereOptions,
    include: [
      { model: Queue, as: 'queue' },
      { model: Queue, as: 'transferQueue', foreignKey: 'transferQueueId' }
    ],
    order: [["id", "ASC"]]
  });

  console.log("🔍 ListService - Opciones encontradas:", queueOptions.length);
  return queueOptions;
};
```

### **3. Frontend (React + TypeScript)**

#### **Componente: `QueueOptions/index.js`**
```javascript
export const QueueOptions = forwardRef(({ queueId }, ref) => {
  const [options, setOptions] = useState([]);

  // ✅ Cargar opciones existentes
  useEffect(() => {
    if (queueId) {
      const fetchOptions = async () => {
        try {
          const { data } = await api.request({
            url: "/queue-options",
            method: "GET",
            params: { queueId, parentId: -1 },
          });
          const optionList = data.map((option) => ({
            ...option,
            children: [],
            edition: false,
          }));
          setOptions(optionList);
        } catch (e) {
          toastError(e);
        }
      };
      fetchOptions();
    }
  }, []);

  // ✅ Agregar nueva opción
  const addOption = () => {
    const newOption = {
      title: "",
      message: "",
      edition: false,
      option: options.length + 1,
      queueId: queueId || null, // ✅ Permitir null temporalmente
      parentId: null,
      children: [],
    };
    setOptions([...options, newOption]);
  };

  // ✅ Guardar opción individual
  const handleSave = async (option) => {
    try {
      // ✅ Verificar que tengamos queueId válido
      if (!queueId) {
        console.log("⚠️ No hay queueId - guardando temporalmente en memoria");
        option.edition = false;
        updateOptions();
        toastError("Opción guardada temporalmente. Guarde el departamento primero.");
        return;
      }
      
      // ✅ Asegurar que tenga queueId
      if (!option.queueId) {
        option.queueId = queueId;
      }
      
      if (option.id) {
        await api.request({
          url: `/queue-options/${option.id}`,
          method: "PUT",
          data: option,
        });
      } else {
        const { data } = await api.request({
          url: `/queue-options`,
          method: "POST",
          data: option,
        });
        option.id = data.id;
      }
      
      option.edition = false;
      updateOptions();
      toastError("Opción guardada correctamente.");
    } catch (e) {
      toastError(e);
    }
  };

  // ✅ Guardar todas las opciones temporales
  const saveAllOptions = useCallback(async (savedQueueId) => {
    console.log("🔄 saveAllOptions - Guardando opciones temporales para queueId:", savedQueueId);
    
    for (let option of options) {
      if (!option.id && option.title.trim() !== "") {
        try {
          const { data } = await api.request({
            url: `/queue-options`,
            method: "POST",
            data: {
              ...option,
              queueId: savedQueueId
            },
          });
          option.id = data.id;
        } catch (e) {
          console.error("❌ Error al guardar opción temporal:", e);
        }
      }
    }
  }, [options]);

  // ✅ Exponer funciones al componente padre
  useImperativeHandle(ref, () => ({
    saveAllOptions
  }));

  return (
    <div className={classes.root}>
      <Typography>
        {i18n.t("queueOptions.title")}
        <Button onClick={addOption} startIcon={<AddIcon />}>
          {i18n.t("queueOptions.add")}
        </Button>
      </Typography>
      {renderStepper()}
    </div>
  );
});
```

#### **Componente: `QueueModal/index.js`**
```javascript
const QueueModal = ({ open, onClose, queueId }) => {
  const queueOptionsRef = useRef();

  // ✅ Guardar departamento y opciones
  const handleSaveQueue = async (values) => {
    try {
      let savedQueueId = queueId;
      
      // ✅ GUARDAR DEPARTAMENTO
      if (queueId) {
        await api.put(`/queue/${queueId}`, {
          ...values, schedules, promptId: selectedPrompt ? selectedPrompt : null
        });
      } else {
        const { data } = await api.post("/queue", {
          ...values, schedules, promptId: selectedPrompt ? selectedPrompt : null
        });
        savedQueueId = data.id;
      }
      
      // ✅ GUARDAR TODAS LAS OPCIONES TEMPORALES
      if (queueOptionsRef.current && queueOptionsRef.current.saveAllOptions) {
        await queueOptionsRef.current.saveAllOptions(savedQueueId);
      }
      
      toast.success(i18n.t("queues.success"));
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>
        {queueId ? "Editar cola" : "Agregar cola"}
      </DialogTitle>
      <DialogContent>
        <Formik initialValues={queue} onSubmit={handleSaveQueue}>
          <Form>
            {/* Campos del departamento */}
            <QueueOptions 
              queueId={queueId}
              ref={queueOptionsRef}
            />
            <DialogActions>
              <Button onClick={handleClose}>Cancelar</Button>
              <Button type="submit" color="primary">
                {queueId ? "Guardar" : "Agregar"}
              </Button>
            </DialogActions>
          </Form>
        </Formik>
      </DialogContent>
    </Dialog>
  );
};
```

## 🔄 **FLUJO DE TRABAJO DETALLADO**

### **ESCENARIO 1: Crear Nuevo Departamento**

#### **Paso 1: Abrir Modal**
```
Usuario → Clic "AGREGAR DEPARTAMENTO"
→ QueueModal se abre con queueId = undefined
→ QueueOptions se inicializa sin queueId
```

#### **Paso 2: Agregar Opciones Temporales**
```
Usuario → Clic "+ AGREGAR" en opciones
→ addOption() se ejecuta con queueId = undefined
→ Opción se crea con queueId: null
→ Usuario escribe título y guarda
→ handleSave() detecta queueId = undefined
→ Opción se guarda temporalmente en memoria
```

#### **Paso 3: Guardar Departamento**
```
Usuario → Llena datos del departamento
→ Clic "AGREGAR" (botón del modal)
→ handleSaveQueue() se ejecuta
→ Departamento se guarda en backend
→ Se obtiene savedQueueId = 33
→ saveAllOptions(savedQueueId) se ejecuta
→ Todas las opciones temporales se guardan con queueId = 33
```

#### **Paso 4: Carga de Opciones**
```
Modal se cierra y reabre
→ useEffect se ejecuta con queueId = 33
→ fetchOptions() carga opciones del backend
→ Opciones se muestran correctamente
```

### **ESCENARIO 2: Editar Departamento Existente**

#### **Paso 1: Abrir Modal**
```
Usuario → Clic "Editar" en departamento existente
→ QueueModal se abre con queueId = 33
→ QueueOptions se inicializa con queueId = 33
→ useEffect ejecuta fetchOptions()
→ Opciones existentes se cargan y muestran
```

#### **Paso 2: Agregar/Editar Opciones**
```
Usuario → Agrega o edita opciones
→ handleSave() detecta queueId = 33
→ Opciones se guardan inmediatamente en backend
→ Cambios se reflejan en tiempo real
```

## 📊 **LOGS DE DEBUGGING**

### **Creación de Nuevo Departamento:**
```
useEffect ejecutado - queueId: undefined
➕ addOption - queueId: undefined
➕ newOption creado: Object
🔍 ANTES - option.queueId: null
🔍 ANTES - queueId del componente: undefined
⚠️ No hay queueId - guardando temporalmente en memoria
🔄 Guardando opciones temporales desde QueueModal...
🔄 saveAllOptions - Guardando opciones temporales para queueId: 33
💾 Guardando opción temporal: reclamo1
✅ Opción temporal guardada con ID: 32
✅ Todas las opciones temporales guardadas
🔄 useEffect ejecutado - queueId: 33
📡 Cargando opciones para queueId: 33
📥 Opciones recibidas: Array(1)
✅ Opciones procesadas: Array(1)
```

### **Edición de Departamento Existente:**
```
🔄 useEffect ejecutado - queueId: 33
📡 Cargando opciones para queueId: 33
📥 Opciones recibidas: Array(1)
✅ Opciones procesadas: Array(1)
💾 Guardando opción: Object
🔍 DESPUÉS - option.queueId: 33
🔄 UPDATE opción existente ID: 32
✅ Opción guardada correctamente
```

## 🎯 **PUNTOS CLAVE DE LA IMPLEMENTACIÓN**

### **1. Manejo de Estados Temporales**
- ✅ **queueId = undefined**: Durante creación de nuevo departamento
- ✅ **queueId = null**: En opciones temporales
- ✅ **queueId = number**: Cuando departamento ya existe

### **2. Guardado en Dos Fases**
- ✅ **Fase 1**: Guardado temporal en memoria (sin queueId)
- ✅ **Fase 2**: Guardado definitivo en base de datos (con queueId)

### **3. Comunicación Entre Componentes**
- ✅ **forwardRef**: Para exponer funciones de QueueOptions
- ✅ **useImperativeHandle**: Para saveAllOptions
- ✅ **useRef**: Para acceder desde QueueModal

### **4. Validaciones y Manejo de Errores**
- ✅ **Verificación de queueId**: Antes de guardar opciones
- ✅ **Mensajes informativos**: Para guiar al usuario
- ✅ **Logs detallados**: Para debugging

## 🔧 **CONFIGURACIÓN DE DESARROLLO**

### **Variables de Entorno:**
```env
DB_DIALECT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=waticket_saas
DB_USER=root
DB_PASS=
```

### **Dependencias Principales:**
```json
{
  "sequelize": "^6.x.x",
  "sequelize-typescript": "^3.x.x",
  "react": "^17.x.x",
  "formik": "^2.x.x",
  "material-ui": "^4.x.x"
}
```

### **Scripts de Desarrollo:**
```bash
# Backend
cd waticketsaas/backend
npm run build
npm start

# Frontend
cd waticketsaas/frontend
npm start
```

## 📝 **NOTAS IMPORTANTES**

### **1. Migraciones**
- ✅ **Ejecutar migraciones** antes de usar el sistema
- ✅ **Verificar columnas** en base de datos
- ✅ **Backup de datos** antes de cambios

### **2. Debugging**
- ✅ **Logs detallados** en backend y frontend
- ✅ **Verificación de queueId** en cada operación
- ✅ **Manejo de errores** con try-catch

### **3. Experiencia de Usuario**
- ✅ **Mensajes informativos** para guiar al usuario
- ✅ **Guardado temporal** sin interrumpir flujo
- ✅ **Carga automática** de opciones existentes

## 🚀 **PRÓXIMOS PASOS**

Este sistema sienta las bases para implementar:
1. **Transferencias entre departamentos** (AI-driven)
2. **Opciones anidadas** (sub-opciones)
3. **Integración con IA** para respuestas automáticas
4. **Configuración avanzada** de flujos de chatbot

---

**Documento creado:** 26-07-2025  
**Versión:** 1.0  
**Autor:** Sistema de IA  
**Estado:** Implementado y Funcionando ✅ 