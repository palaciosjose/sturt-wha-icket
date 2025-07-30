import React, { useState } from 'react';

const DragDropTest = () => {
  const [files, setFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);

  console.log("🧪 DragDropTest cargado");

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("🧪 DragOver detectado en componente de prueba");
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("🧪 DragLeave detectado en componente de prueba");
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("🧪 Drop detectado en componente de prueba");
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    console.log("🧪 Archivos soltados:", droppedFiles.length, droppedFiles.map(f => f.name));
    
    setFiles(prev => [...prev, ...droppedFiles]);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        width: '200px',
        height: '100px',
        border: isDragOver ? '3px dashed #2196f3' : '2px dashed #ccc',
        backgroundColor: isDragOver ? '#e3f2fd' : '#f5f5f5',
        borderRadius: '8px',
        padding: '10px',
        zIndex: 9999,
        cursor: 'pointer',
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => {
        console.log("🧪 Componente de prueba clickeado");
        alert("✅ Componente de prueba funcionando");
      }}
    >
      <div style={{ textAlign: 'center', fontSize: '12px' }}>
        <div>🧪 TEST DRAG & DROP</div>
        <div>Click para probar</div>
        <div>Arrastra archivos aquí</div>
        {files.length > 0 && (
          <div style={{ marginTop: '5px', fontSize: '10px' }}>
            Archivos: {files.length}
          </div>
        )}
      </div>
    </div>
  );
};

export default DragDropTest; 