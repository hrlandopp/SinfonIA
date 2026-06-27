import { createClient } from '@supabase/supabase-js'

// Intentar obtener las credenciales de variables de entorno o de localStorage en la web
const getSupabaseCredentials = () => {
  const url = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('supabase_url') || ''
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('supabase_anon_key') || ''
  return { url, key }
}

const { url, key } = getSupabaseCredentials()

// Crear el cliente de Supabase sólo si las credenciales existen
export const supabase = (url && key) ? createClient(url, key) : null

// Auxiliar para saber si el backend está configurado
export const isSupabaseConfigured = () => {
  const creds = getSupabaseCredentials()
  return !!(creds.url && creds.key)
}

// Guardar credenciales de forma dinámica desde el panel de Ajustes en la web
export const saveSupabaseCredentials = (url, key) => {
  if (url) localStorage.setItem('supabase_url', url)
  if (key) localStorage.setItem('supabase_anon_key', key)
  window.location.reload() // Recargar para aplicar los cambios en el cliente
}
