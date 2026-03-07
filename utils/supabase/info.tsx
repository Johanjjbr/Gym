/* CONFIGURACIÓN DE SUPABASE DESDE VARIABLES DE ENTORNO */

// Obtener credenciales desde las variables de entorno
export const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "ihyeytzmrgfglsdpsvzb";
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloeWV5dHptcmdmZ2xzZHBzdnpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDc1ODUsImV4cCI6MjA4NzYyMzU4NX0.8F4Brq8V_smZX03Uz1W0yCukvjoXJWmpTVGhb085k8U";

// Validación en desarrollo
if (import.meta.env.DEV) {
  if (!import.meta.env.VITE_SUPABASE_PROJECT_ID) {
    console.warn('⚠️ VITE_SUPABASE_PROJECT_ID no está configurado en .env - usando valores por defecto');
  }
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
    console.warn('⚠️ VITE_SUPABASE_ANON_KEY no está configurado en .env - usando valores por defecto');
  }
}
