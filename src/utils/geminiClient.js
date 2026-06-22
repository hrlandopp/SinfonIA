import { GoogleGenAI } from '@google/genai'

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

// Inicializar el cliente con la clave correspondiente
const getAiClient = () => {
  const apiKey = getGeminiKey()
  if (!apiKey) {
    throw new Error('La clave API de Gemini no está configurada.')
  }
  return new GoogleGenAI({ apiKey })
}

/**
 * 1. RESPUESTA RÁPIDA Y ACTUALIZACIONES DE PROYECTO (gemini-3.5-flash)
 */
export const sendMessageToProducerAI = async (userMessage, chatHistory, projectState) => {
  const ai = getAiClient()

  const systemInstructionText = `
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

  // Mapear historial de chat para la API de Gemini
  const contents = chatHistory
    .filter(msg => msg.sender === 'user' || msg.sender === 'assistant')
    .map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.message }]
    }))

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstructionText,
        responseMimeType: 'application/json'
      }
    })

    const responseText = response.text
    return JSON.parse(responseText)
  } catch (error) {
    console.error('Error al generar contenido con Gemini 3.5 Flash:', error)
    throw new Error(`Detalles: ${error.message || error}`)
  }
}

/**
 * 2. ANÁLISIS COMPLETO Y RAZONAMIENTO CRÍTICO (gemini-3.1-pro)
 */
export const runDeepCompositionAnalysis = async (projectState) => {
  const ai = getAiClient()
  
  const prompt = `Realiza un análisis crítico y estructurado de la siguiente composición musical.
Comenta sobre la relación de acordes, su coherencia con respecto a la tonalidad activa, la progresión emocional de las secciones y sugerencias específicas sobre cómo tocarlo en la guitarra (ej: arpegios interesantes, inversiones de acordes, o uso del capo).

Estructura de la canción:
${JSON.stringify(projectState, null, 2)}

Devuelve tus consejos en un formato legible, claro y motivador en español.`

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt
    })
    return response.text
  } catch (error) {
    console.error('Error al generar análisis con Gemini 3.1 Pro:', error)
    throw new Error(`No se pudo realizar el análisis profundo: ${error.message || error}`)
  }
}

/**
 * 3. GENERACIÓN DE ARTE DE PORTADA (imagen-3.0-generate-002)
 */
export const generateSongArt = async (songName, moodDescription) => {
  const ai = getAiClient()

  const prompt = `A professional Album cover art for a song named "${songName}". The visual theme should express this feeling or description: "${moodDescription}". Flat illustration or professional digital art, cinematic lighting, synthwave or minimal aesthetic, high quality, no text, music album cover, high resolution.`

  try {
    const response = await ai.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: '1:1',
        outputMimeType: 'image/png'
      }
    })

    if (response.generatedImages && response.generatedImages.length > 0) {
      // Devuelve la imagen codificada en Base64
      return response.generatedImages[0].image.imageBytes
    } else {
      throw new Error('No se generaron imágenes en la respuesta.')
    }
  } catch (error) {
    console.error('Error al generar arte con Imagen 3:', error)
    throw new Error(`No se pudo generar el arte de portada: ${error.message || error}`)
  }
}
