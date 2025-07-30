# Corrección del Bucle Infinito en PromptModal

## Problema Identificado

Se detectó un bucle infinito en el componente `PromptModal` que causaba el error:

```
Warning: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.
```

## Causa del Problema

El problema estaba en el `useEffect` del componente `PromptModal` en la línea 107:

```javascript
useEffect(() => {
    const fetchPrompt = async () => {
        // ... lógica del fetch
    };
    fetchPrompt();
}, [promptId, open, initialState]); // ❌ PROBLEMA: initialState como dependencia
```

El objeto `initialState` se recreaba en cada render del componente, causando que el `useEffect` se ejecutara infinitamente.

## Solución Implementada

### 1. Mover initialState fuera del componente

```javascript
// ✅ SOLUCIÓN: Definir initialState fuera del componente
const initialState = {
    name: "",
    prompt: "",
    voice: "texto",
    voiceKey: "",
    voiceRegion: "",
    maxTokens: 100,
    temperature: 1,
    apiKey: "",
    queueId: null,
    maxMessages: 10
};

const PromptModal = ({ open, onClose, promptId }) => {
    // ... resto del componente
};
```

### 2. Remover initialState de las dependencias del useEffect

```javascript
useEffect(() => {
    const fetchPrompt = async () => {
        if (!promptId) {
            setPrompt(initialState);
            return;
        }
        try {
            const { data } = await api.get(`/prompt/${promptId}`);
            setPrompt(prevState => {
                return { ...prevState, ...data };
            });
            setSelectedVoice(data.voice);
        } catch (err) {
            toastError(err);
        }
    };

    fetchPrompt();
}, [promptId, open]); // ✅ SOLUCIÓN: Removido initialState de las dependencias
```

## Resultado

- ✅ Se eliminó el bucle infinito
- ✅ El componente funciona correctamente
- ✅ No hay más warnings en la consola
- ✅ La compilación es exitosa

## Archivos Modificados

- `waticketsaas/frontend/src/components/PromptModal/index.js`

## Fecha de Corrección

$(date)

## Notas Técnicas

- El problema era típico de React cuando se incluyen objetos o arrays como dependencias de useEffect
- La solución sigue las mejores prácticas de React para evitar recreaciones innecesarias de objetos
- El componente mantiene toda su funcionalidad original 