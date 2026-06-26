# 🔐 Plan de Migración de API Keys — SinfonIA

> Documento de referencia para mover las API keys del frontend al backend

---

## Estado Actual (❌ Inseguro)

```
┌─────────────┐     API Key visible      ┌──────────────┐
│   Browser    │ ───────────────────────► │  Gemini API  │
│  (Frontend)  │   en DevTools/Network    │   / OpenAI   │
└─────────────┘                          └──────────────┘
```

### Problemas identificados:

| Archivo | Problema | Riesgo |
|---------|----------|--------|
| `geminiClient.js` | `import.meta.env.VITE_GEMINI_API_KEY` expuesto en bundle | 🔴 Key visible en código fuente del navegador |
| `aiClient.js` | `localStorage.getItem('openai_api_key')` | 🔴 Cualquier extensión/XSS puede leer localStorage |
| `aiClient.js` | `dangerouslyAllowBrowser: true` en OpenAI SDK | 🔴 OpenAI SDK diseñado para Node.js, no browser |
| `ProjectLauncher.jsx` | Keys ingresadas se guardan en localStorage sin cifrar | 🟡 UX funcional pero insegura |
| `.env` | Estaba commiteado en git (ya corregido) | 🟢 Resuelto - destrakeado |

---

## Arquitectura Objetivo (✅ Segura)

```
┌─────────────┐    Solo prompts     ┌─────────────────┐    API Key segura     ┌──────────────┐
│   Browser    │ ─────────────────► │  Supabase Edge   │ ──────────────────► │  Gemini API  │
│  (Frontend)  │   (sin API keys)   │    Functions     │  (env del servidor)  │              │
└─────────────┘                    └─────────────────┘                      └──────────────┘
```

### Opción Recomendada: Supabase Edge Functions

Ya usamos Supabase para persistencia. Sus Edge Functions (basadas en Deno) permiten:
- Guardar API keys como **secrets del servidor** (`supabase secrets set`)
- Exponer endpoints HTTP que el frontend consume sin conocer las keys
- Rate limiting y validación server-side
- Logs de uso para monitorear consumo

### Edge Functions a crear:

#### 1. `supabase/functions/ai-compose/index.ts`
```typescript
// Recibe: { prompt, mode, style, creativity, projectContext }
// Retorna: { composition: { sections, tracks, notes } }
// Internamente llama a Gemini con la API key del servidor
```

#### 2. `supabase/functions/ai-analyze/index.ts`
```typescript
// Recibe: { musicData, analysisType }
// Retorna: { analysis: { harmony, rhythm, suggestions } }
```

#### 3. `supabase/functions/ai-chat/index.ts`
```typescript
// Recibe: { message, chatHistory, projectState, agentType }
// Retorna: { response, suggestions }
```

### Pasos de implementación:

1. **Instalar Supabase CLI** (si no está)
   ```bash
   npm install -g supabase
   ```

2. **Crear Edge Functions**
   ```bash
   supabase functions new ai-compose
   supabase functions new ai-analyze
   supabase functions new ai-chat
   ```

3. **Configurar secrets**
   ```bash
   supabase secrets set GEMINI_API_KEY=tu_clave_aquí
   ```

4. **Refactorizar clientes** — `geminiClient.js` llamará a las Edge Functions via `supabase.functions.invoke()` en lugar de llamar directamente a la API de Gemini.

5. **Eliminar del frontend** — Remover `VITE_GEMINI_API_KEY` y `VITE_OPENAI_API_KEY` del `.env` y `.env.example`.

---

## Decisión Pendiente: ¿OpenAI o solo Gemini?

El proyecto tiene DOS clientes AI:
- `aiClient.js` → OpenAI (`gpt-4`, `gpt-3.5-turbo`)
- `geminiClient.js` → Google Gemini (`gemini-2.5-flash`, `gemini-2.0-flash`)

**Recomendación:** Consolidar en **solo Gemini** porque:
- Ya tiene prompt engineering avanzado y model fallback
- Menos dependencias npm (`openai` se puede eliminar)
- Una sola API key a gestionar
- Gemini tiene tier gratuito generoso para desarrollo

---

## Cronograma sugerido

| Fase | Acción | Cuándo |
|------|--------|--------|
| Ahora | ✅ `.env` destrakeado de git | Hecho |
| Ahora | ✅ `.gitignore` actualizado | Hecho |
| Pre-frontend | Decidir OpenAI vs Gemini | Antes de empezar frontend |
| Durante frontend | Crear Edge Functions | Al implementar panel AI |
| Post-frontend | Eliminar keys del cliente | Al tener Edge Functions funcionando |
| Post-frontend | Eliminar `VITE_*_API_KEY` de `.env.example` | Último paso |
