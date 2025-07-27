import { useState } from "react";
import toastError from "../../errors/toastError";
import api from "../../services/api";

const useFiles = () => {
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [files, setFiles] = useState([]);

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
            const { data: fileDetails } = await api.get(`/files/${fileList.id}`);
            return fileDetails; // Esto incluye la propiedad 'options' con los archivos
          } catch (err) {
            console.error(`Error cargando detalles de lista ${fileList.id}:`, err);
            return fileList; // Retornar lista básica si falla
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

  const show = async (fileId) => {
    try {
      const { data } = await api.get(`/files/${fileId}`);
      return data;
    } catch (err) {
      toastError(err);
      return null;
    }
  };

  return { 
    files, 
    loading, 
    hasMore, 
    list, 
    show 
  };
};

export default useFiles; 