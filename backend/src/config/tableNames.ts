// ✅ CONFIGURACIÓN CENTRALIZADA DE NOMBRES DE TABLAS
// Este archivo maneja las diferencias entre entornos (local vs producción)

interface TableNamesConfig {
  invoices: string;
  companies: string;
  users: string;
  plans: string;
  // Agregar más tablas según sea necesario
}

const getTableNames = (): TableNamesConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    // ✅ PRODUCCIÓN: Nombres con primera letra mayúscula
    return {
      invoices: 'Invoices',
      companies: 'Companies',
      users: 'Users',
      plans: 'Plans'
    };
  } else {
    // ✅ DESARROLLO/LOCAL: Nombres en minúscula
    return {
      invoices: 'invoices',
      companies: 'companies',
      users: 'users',
      plans: 'plans'
    };
  }
};

export const tableNames = getTableNames();
export default tableNames;
