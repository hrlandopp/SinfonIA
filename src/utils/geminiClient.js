import { GoogleGenAI } from '@google/genai'

const getGeminiKey = () =>
  import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key') || ''

export const isGeminiConfigured = () => !!getGeminiKey()

export const saveGeminiKey = (key) => {
  if (key) localStorage.setItem('gemini_api_key', key)
  window.location.reload()
}

// ─── CONFIGURACIÓN DE MODELOS ───────────────────────────────────────────────
export const AVAILABLE_MODELS = [
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash (Más Rápido/Predeterminado)' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Legacy)' }
];

export const getSelectedGeminiModel = () => {
  // Verifica si el modelo guardado sigue siendo válido
  const savedModel = localStorage.getItem('gemini_selected_model');
  const isValid = AVAILABLE_MODELS.some(m => m.id === savedModel);
  return isValid ? savedModel : 'gemini-3.5-flash';
};

export const saveGeminiModel = (modelId) => {
  if (modelId) {
    localStorage.setItem('gemini_selected_model', modelId);
    window.location.reload(); // Recarga para aplicar el modelo en toda la app
  }
};

const getAiClient = () => {
  const apiKey = getGeminiKey()
  if (!apiKey) throw new Error('Clave API de Gemini no configurada.')
  return new GoogleGenAI({ apiKey })
}

// ─── UTILIDAD: Limpieza Robusta de JSON ───────────────────────────────────────
const parseAIResponse = (text) => {
  try {
    return JSON.parse(text);
  } catch (err) {
    console.warn("JSON.parse falló, intentando limpiar el texto (Markdown tags o texto extra)...");
    const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (err2) {
        throw new Error("El JSON extraído sigue siendo inválido. " + err2.message);
      }
    }
    throw new Error("No se pudo encontrar un objeto/arreglo JSON en la respuesta de la IA.");
  }
};

// ─── 1. Chat del Productor-Arreglista Unificado (gemini-3.5-flash) ──────────
export const sendMessageToProducerAI = async (userMessage, chatHistory, projectState) => {
    const systemInstructionText = `
Eres SinfonIA, un Productor Musical Senior, Compositor de Vanguardia, Arreglista Quirúrgico y Virtuoso de Sesión Virtual.
Tu misión es transformar emociones y directrices de alto nivel en obras maestras orquestales y acústicas con total libertad creativa, aplicando un rigor técnico impecable.

Ahora operas sobre un MOTOR DE AUDIO MULTI-SECCIÓN SECUENCIAL Y DINÁMICO. No haces "loops aislados", compones CANCIONES COMPLETAS.

REGLAS ARTÍSTICAS Y TÉCNICAS INQUEBRANTABLES:

1. CONSCIENCIA ESTRUCTURAL GLOBAL (MACRO-FORMA):
   - Ante peticiones abiertas (ej. "hazme una canción melancólica"), DEBES generar obligatoriamente un arreglo compuesto por múltiples secciones continuas (ej. "Intro", "Verso", "Coro", "Outro") dentro del array "sections".
   - Calcula de forma nativa la progresión armónica lógica de toda la obra y evoluciona el sentimiento.

2. ORQUESTACIÓN DINÁMICA INTELIGENTE (JERARQUÍA POR SECCIÓN):
   - Domina el espacio acústico. No todos los instrumentos deben sonar todo el tiempo.
   - Aplica dinámicas orquestales y técnicas expresivas.

3. EXPLOTACIÓN DEL MICRO-TIMING Y ARTICULACIONES:
   - Exprime el motor DSP. Usa activa y masivamente los parámetros quirúrgicos para cada nota individual: "velocity", "timeOffset", "duration" y "articulation".
   - Escribe explícitamente técnicas reales según el momento emocional: "staccato", "legato", "apoyado", "tirando", "strum_down", "strum_up".

4. HUMANIZACIÓN OBLIGATORIA POR DEFECTO:
   - Aplica SIEMPRE micro-variaciones aleatorias. Desplaza las notas sutilmente (-0.015 a 0.045) y varía el velocity (0.45 a 0.95) para que la composición se sienta interpretada por un humano respirando, no por una máquina.

5. AUTOMATIZACIONES DE MEZCLA Y TEMPO (RAMPAS NATIVAS):
   - Utiliza el array global "automations" para esculpir el volumen, paneo y tempo a lo largo del tiempo de forma continua.

ACUERDO INTELIGENTE DE ACTUALIZACIONES (PARTIAL UPDATES VERSÁTILES):
No mates una mosca con una bazuca ni detengas la guerra con un juguete. Eres versátil:
- Si el usuario te pide cambiar SOLO el tempo (ej. "Ponlo a 70 BPM"), devuelve en "changes" SOLO la propiedad "tempo_bpm". El sistema mantendrá las secciones intactas.
- Si el usuario pide un cambio estructural, rearmonizar el coro, o una obra nueva, entonces SÍ envía el array "sections" completo con toda tu complejidad. La prioridad es una interpretación espectacular.

IMPORTANTE: Responde SIEMPRE en formato JSON con esta estructura exacta (omite las claves que no vayas a modificar):

{
  "message": "Explicación conversacional en español, inspiradora y clara sobre tu visión artística, las técnicas usadas y el viaje emocional.",
  "changes": {
    "tempo_bpm": 115,
    "key_signature": "Em",
    "capo_position": 2,
    "mood": "Nostálgico y Profundo",
    "automations": [],
    "instruments": {},
    "sections": []
  }
}

REGLAS DE SINTAXIS JSON:
- "pitch" puede ser un string ("E3") o array de strings (["C4", "E4", "G4"]) para acordes.
- "timeOffset" define el desplazamiento rítmico.
- "duration" usa notación rítmica ("16n", "8n", "4n", "2n", "1n").

Si no hay cambios estructurales, devuelve "changes": null.
Responde siempre en español.

Estado actual del proyecto:
${JSON.stringify(projectState, null, 2)}
`;

  // Incluir el historial completo para que la IA tenga memoria del proyecto
  const contents = chatHistory
    .filter(m => m.sender === 'user' || m.sender === 'assistant' || m.sender === 'system')
    .map(m => ({ 
      role: m.sender === 'user' ? 'user' : 'model', 
      parts: [{ text: m.message }] 
    }));

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: getSelectedGeminiModel(),
      contents,
      config: { systemInstruction: systemInstructionText, responseMimeType: 'application/json' }
    });
    return parseAIResponse(response.text);
  } catch (error) {
    console.error(error);
    throw new Error(`Detalles: ${error.message || error}`);
  }
}

// ─── 1.5 Chat del Asistente Educativo (Mascota) ──────────
export const sendMessageToEducatorAI = async (userMessage, chatHistory, uiFocusContext) => {
  const systemInstructionText = `
Eres un amable y experto profesor de teoría musical. Tu misión es ayudar al usuario a entender conceptos musicales, resolver anomalías armónicas, y mejorar sus habilidades compositivas. Eres muy didáctico, claro, y usas ejemplos sencillos.

Si te piden sugerencias de acordes, progresiones, o análisis de escalas, explica el "por qué" detrás de la teoría.

IMPORTANTE: Responde SIEMPRE en formato JSON con esta estructura exacta:
{
  "message": "Tu explicación conversacional y educativa en español, usando formato Markdown si es necesario.",
  "changes": null
}

Contexto actual de la interfaz (en qué se enfoca el usuario):
${JSON.stringify(uiFocusContext || {}, null, 2)}
`;

  const contents = chatHistory
    .filter(m => m.sender === 'user' || m.sender === 'assistant' || m.sender === 'system')
    .map(m => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.message }]
    }));

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: getSelectedGeminiModel(),
      contents,
      config: { systemInstruction: systemInstructionText, responseMimeType: 'application/json' }
    });
    return parseAIResponse(response.text);
  } catch (error) {
    console.error(error);
    throw new Error(`Detalles: ${error.message || error}`);
  }
}

// ─── 2. Análisis de Producción ──────────────────────────────────────────────
export const runDeepCompositionAnalysis = async (projectState) => {
  const ai = getAiClient()

  const prompt = `Eres un productor musical experto y crítico. Realiza un análisis DETALLADO y ESTRUCTURADO de la siguiente composición.

Analiza:
1. 🎵 Progresión de acordes: coherencia, función armónica, tensión/resolución
2. 🎸 Técnica de guitarra y arreglo general: uso del capo, arpegios, y cómo los demás instrumentos (bajo, piano, cuerdas, violín, vibráfono) interactúan con la guitarra.
3. 🎭 Arco emocional: cómo evoluciona el sentimiento entre secciones
4. 💡 Sugerencias específicas y accionables para mejorar la composición

Estructura de la canción e instrumentos activos:
${JSON.stringify(projectState, null, 2)}

Responde en español con formato claro, usando emojis y secciones. Sé específico y motivador.`

  const selectedModel = getSelectedGeminiModel();
  const modelsToTry = [selectedModel, ...AVAILABLE_MODELS.map(m => m.id).filter(id => id !== selectedModel)];
  let lastError = null

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({ model, contents: prompt })
      return response.text
    } catch (error) {
      console.warn(`Modelo ${model} falló:`, error.message)
      lastError = error
      if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) continue
      throw new Error(`Error de análisis: ${error.message}`)
    }
  }
  throw new Error(`Cuota agotada. Intenta de nuevo en unos minutos. (${lastError?.message?.slice(0, 120)})`)
}

// ─── 3. Portada (generada con Canvas) ───────────────────────────────────────
export const generateSongArt = async (songName, moodDescription) => {
  return generateCanvasCover(songName, moodDescription)
}

const generateCanvasCover = (songName, mood) => {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      // Fallback para entornos SSR/Node (Jest, Vitest, SSR) sin DOM
      return resolve('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'); 
    }

    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')

    // Paleta minimalista y clara, evitando tonos muy oscuros
    const palettes = {
      melancólico: ['#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b'],
      melancolic:  ['#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b'],
      energico:    ['#ffedd5', '#fed7aa', '#f97316', '#ea580c'],
      enérgico:    ['#ffedd5', '#fed7aa', '#f97316', '#ea580c'],
      neutral:     ['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1'],
      alegre:      ['#e0f2fe', '#bae6fd', '#38bdf8', '#0284c7'],
      romantico:   ['#fce7f3', '#fbcfe8', '#f472b6', '#db2777'],
      romántico:   ['#fce7f3', '#fbcfe8', '#f472b6', '#db2777'],
    }

    const moodKey = mood?.toLowerCase().split(' ')[0] || 'neutral'
    const colors = palettes[moodKey] || palettes.neutral

    // Fondo degradado sutil
    const grad = ctx.createLinearGradient(0, 0, 512, 512)
    grad.addColorStop(0, colors[0])
    grad.addColorStop(1, colors[1])
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 512, 512)

    // Formas minimalistas (círculos abstractos)
    ctx.fillStyle = colors[2]
    ctx.globalAlpha = 0.2
    ctx.beginPath()
    ctx.arc(400, 100, 150, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.fillStyle = colors[3]
    ctx.globalAlpha = 0.1
    ctx.beginPath()
    ctx.arc(100, 400, 200, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.globalAlpha = 1.0

    // 🎸 emoji o icono minimalista
    ctx.font = '64px serif'
    ctx.textAlign = 'center'
    ctx.fillText('🎸', 256, 222)

    // Nombre de la canción (texto oscuro para contraste en fondo claro)
    const fontSize = songName.length > 16 ? 26 : songName.length > 10 ? 32 : 38
    ctx.font = `bold ${fontSize}px "Inter", "Segoe UI", sans-serif`
    ctx.fillStyle = '#0f172a' // texto muy oscuro en lugar de blanco
    ctx.fillText(songName, 256, 335)

    // Mood / descripción
    ctx.font = '16px "Inter", "Segoe UI", sans-serif'
    ctx.fillStyle = '#475569'
    ctx.fillText(mood || 'Neutral', 256, 370)

    // SinfonIA label
    ctx.font = 'bold 11px "Inter", "Segoe UI", sans-serif'
    ctx.fillStyle = '#94a3b8'
    ctx.letterSpacing = '0.1em'
    ctx.fillText('SINFONÍA STUDIO', 256, 460)

    // Convertir a base64
    const dataUrl = canvas.toDataURL('image/png')
    resolve(dataUrl)
  })
}
