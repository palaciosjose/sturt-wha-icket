import { useRef, useEffect, useCallback } from 'react';

/**
 * Hook personalizado para manejar el foco en modales
 * Evita problemas de aria-hidden y asegura accesibilidad correcta
 */
const useModalFocus = (open) => {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Guardar el elemento activo antes de abrir el modal
  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement;
    }
  }, [open]);

  // Función para liberar completamente el foco
  const releaseFocus = useCallback(() => {
    // 1. Liberar foco del modal si existe
    if (modalRef.current) {
      const activeElement = modalRef.current.querySelector(':focus');
      if (activeElement) {
        activeElement.blur();
      }
    }

    // 2. Liberar cualquier foco activo en el documento
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }

    // 3. Forzar la liberación del foco del body
    document.body.focus();
    document.body.blur();
  }, []);

  // Restaurar el foco al cerrar el modal
  const handleClose = useCallback(() => {
    // Liberar el foco inmediatamente
    releaseFocus();

    // Pequeño delay para asegurar que el foco se libere completamente
    setTimeout(() => {
      // Restaurar el foco al elemento anterior si existe y es válido
      if (previousActiveElement.current && 
          previousActiveElement.current.focus && 
          document.contains(previousActiveElement.current) &&
          !previousActiveElement.current.hasAttribute('aria-hidden')) {
        previousActiveElement.current.focus();
      } else {
        // Si no hay elemento anterior válido, liberar el foco completamente
        releaseFocus();
      }
    }, 50);
  }, [releaseFocus]);

  // Manejar el evento onExited del Dialog
  const handleExited = useCallback(() => {
    // Asegurar que el foco se libere completamente al cerrar
    releaseFocus();
    
    // Limpiar la referencia del elemento anterior
    previousActiveElement.current = null;
  }, [releaseFocus]);

  // Función para manejar el cierre con prevención de aria-hidden
  const handleCloseWithFocusFix = useCallback((event) => {
    // Prevenir que el botón mantenga el foco
    if (event && event.target) {
      event.target.blur();
    }
    
    // Liberar foco inmediatamente
    releaseFocus();
    
    // Llamar al handleClose después de un pequeño delay
    setTimeout(() => {
      handleClose();
    }, 0);
  }, [handleClose, releaseFocus]);

  return {
    modalRef,
    handleClose: handleCloseWithFocusFix,
    handleExited
  };
};

export default useModalFocus; 