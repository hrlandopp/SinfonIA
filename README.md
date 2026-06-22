# SinfonIA — Minimalist Music Studio

Un estudio musical inteligente, personal y minimalista en el navegador. Construido con React, Tone.js, Supabase y Gemini AI.

## Despliegue en Vercel

SinfonIA está preparado para ser desplegado en Vercel sin configuración adicional.

1. Haz push de este repositorio a GitHub.
2. Ve a [Vercel](https://vercel.com/) y crea un nuevo proyecto desde tu repositorio.
3. Vercel detectará automáticamente Vite.
4. En la sección "Environment Variables" de Vercel, asegúrate de configurar:
   - `VITE_SUPABASE_URL`: La URL de tu proyecto en Supabase
   - `VITE_SUPABASE_ANON_KEY`: Tu public anon key de Supabase
   - `VITE_GEMINI_API_KEY`: Tu clave de Google AI Studio (Gemini)
5. ¡Despliega!

> **Nota:** La aplicación cuenta con un `vercel.json` configurado para manejar correctamente el enrutamiento SPA (Single Page Application).

## Configuración de Supabase

1. Crea un nuevo proyecto en [Supabase](https://supabase.com/).
2. Ve al SQL Editor en el panel de Supabase.
3. Copia el contenido del archivo `supabase/schema.sql` y ejecútalo.
4. ¡Listo! La base de datos está preparada para guardar tus proyectos musicales, instrumentos y progresiones de acordes.

## Características

- 🎸 **Motor de audio realista** (Tone.js) con arpegios, rasgueos, y percusiones
- 🎻 **Nuevos Instrumentos**: Cuerdas, Violín y Vibráfono
- 🧠 **Productor IA adaptativo** impulsado por Gemini
- 🎨 **Estética minimalista** y profesional, libre de saturación visual
- 💾 **Sincronización en la nube** con Supabase
