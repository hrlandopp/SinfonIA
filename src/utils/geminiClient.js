import { GoogleGenAI } from '@google/generative-ai'

// Intentar obtener la clave de la API desde variables de entorno o localStorage
const getGeminiKey = () => {
  return import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key') || ''
}

export const isGeminiConfigured = () => {
  return !!getGeminiKey()
}

export const saveGeminiKey = (key) => {
  if (key) localStorage.setItem('gemini_api_key', key)
  window.location.reload()
}

/**
 * Envía la conversación y el estado actual del proyecto al Asistente Productor de IA
 */
export const sendMessageToProducerAI = async (userMessage, chatHistory, projectState) => {
  const apiKey = getGeminiKey()
  if (!apiKey) {
    throw new Error('La clave API de Gemini no está configurada. Agrégala en el panel de configuración.')
  }

  // Inicializar Google Gen AI
  let genAI;
  try {
    const { GoogleGenAI: GenAI } = await import('@google/generative-ai')
    genAI = new GenAI({ apiKey })
  } catch (e) {
    const { GoogleGenAI } = await import('@google/generative-ai')
    genAI = new GoogleGenAI(apiKey)
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    }
  })

  // Formatear el historial para el formato esperado de la API de Gemini
  const contents = chatHistory
    .filter(msg => msg.sender === 'user' || msg.sender === 'assistant')
    .map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.message }]
    }))

  const systemInstruction = `
Eres SinfonIA, un productor musical experto, compositor y guitarrista profesional que asiste al usuario a crear canciones.
Tus tareas principales son:
1. Ayudar al usuario a plasmar sentimientos e ideas en música, sugiriendo progresiones de acordes, tempos (BPM), tonalidades y estructuras melódicas.
2. Traducir tus sugerencias en CAMBIOS ESTRUCTURADOS en el proyecto actual.

Debes responder SIEMPRE en formato JSON con la siguiente estructura exacta:
{
  "message": "Tu explicación conversacional sobre las sugerencias musicales en español. Sé inspirador, claro y explica la teoría de forma simple basándote en la guitarra.",
  "changes": {
    "tempo_bpm": 120, // (Opcional) Cambia el tempo si se discute. Rango: 40-240.
    "key_signature": "Am", // (Opcional) Cambia la tonalidad. Ej: 'C', 'Am', 'G', 'Em', 'D', 'A', etc.
    "capo_position": 0, // (Opcional) Cambia el capotraste. Rango: 0-12.
    "sections": [
      // (Opcional) Modifica, añade o reordena secciones. 
      // Si proporcionas esta lista, reescribirá o insertará las secciones del proyecto.
      {
        "name": "Intro", // Nombre de la sección (Intro, Verso, Coro, Puente, Outro)
        "order_index": 0, // Índice de orden (0, 1, 2...)
        "chords": [
          // Arreglo de acordes en orden de reproducción. Cada acorde dura un número determinado de pulsos/beats (normalmente 4 beats por acorde en compás de 4/4).
          {"chord": "Am", "beats": 4},
          {"chord": "F", "beats": 4},
          {"chord": "C", "beats": 4},
          {"chord": "G", "beats": 4}
        ]
      }
    ]
  }
}

SIEMPRE responde en español y sé amigable. Si el usuario te habla de un sentimiento como "tristeza profunda", explícale qué acordes transmiten eso (como acordes menores, segundas o séptimas suspendidas) y modifica el proyecto en la sección "changes" para adaptarlo.
Si no hay cambios estructurales que hacer en la canción, establece "changes" como null o un objeto vacío {}.

Estado actual del proyecto musical del usuario:
${JSON.stringify(projectState, null, 2)}
`

  contents.push({
    role: 'user',
    parts: [{ text: `${systemInstruction}\n\nMensaje actual del usuario: "${userMessage}"` }]
  })

  try {
    const result = await model.generateContent({ contents })
    const responseText = result.response.text()
    
    const responseJson = JSON.parse(responseText)
    return responseJson
  } catch (error) {
    console.error('Error al generar contenido con Gemini:', error)
    throw new Error('Error al comunicarte con tu Productor de IA. Revisa tu conexión y tu clave de API.')
  }
}
