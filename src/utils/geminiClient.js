import { GoogleGenAI } from '@google/genai'

const getGeminiKey = () =>
  import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key') || ''

export const isGeminiConfigured = () => !!getGeminiKey()

export const saveGeminiKey = (key) => {
  if (key) localStorage.setItem('gemini_api_key', key)
  window.location.reload()
}

const getAiClient = () => {
  const apiKey = getGeminiKey()
  if (!apiKey) throw new Error('Clave API de Gemini no configurada.')
  return new GoogleGenAI({ apiKey })
}

// ─── 1. Chat del Productor (gemini-2.5-flash) ─────────────────────────────────
export const sendMessageToProducerAI = async (userMessage, chatHistory, projectState) => {
  const ai = getAiClient()

  const systemInstructionText = `
Eres SinfonIA, un productor musical experto, compositor y arreglista profesional.
Ayudas al usuario a plasmar sentimientos en música, sugiriendo progresiones de acordes sofisticadas, tempos, tonalidades y controlando los instrumentos del estudio. ¡Tienes libertad creativa para sorprender al usuario!

Responde SIEMPRE en formato JSON con esta estructura exacta:
{
  "message": "Explicación conversacional en español, inspiradora y clara.",
  "changes": {
    "tempo_bpm": 120,
    "key_signature": "Am",
    "capo_position": 0,
    "mood": "Melancólico",
    "instruments": {
      "guitar": { "active": true, "type": "fingerpicking" },
      "piano": { "active": true, "type": "arpeggio" },
      "bass": { "active": true, "type": "roots" },
      "drums": { "active": true, "type": "basic" },
      "strings": { "active": true, "type": "pad" },
      "violin": { "active": false, "type": "melody" },
      "vibraphone": { "active": false, "type": "chords" }
    },
    "sections": [
      {
        "name": "Intro",
        "order_index": 0,
        "chords": [
          {"chord": "Am", "beats": 4},
          {"chord": "Fmaj7", "beats": 4},
          {"chord": "Cadd9", "beats": 4},
          {"chord": "G", "beats": 4}
        ],
        "melody": [
          {"note": "E4", "beat": 0},
          {"note": "G4", "beat": 2},
          {"note": "A4", "beat": 4}
        ]
      }
    ]
  }
}

Opciones e Instrucciones clave:
- Puedes proponer progresiones ricas (ej: maj7, m7, add9, sus4, dim).
- Puedes componer melodías escribiendo en el arreglo "melody" de cada sección. El "beat" puede ser cualquier número de 0 hasta el total de beats - 1. Notas válidas: C4, C#4, D4, D#4, E4, F4, F#4, G4, G#4, A4, A#4, B4, C5. Si no quieres sugerir melodía, usa [].
- Patrones por instrumento:
  - guitar: strum, arpeggio, fingerpicking
  - piano: arpeggio, chord, boogie
  - bass: roots, walking, funk slap
  - drums: basic, metronome, shuffle
  - strings: pad
  - violin: melody
  - vibraphone: chords

Si no hay cambios estructurales, devuelve "changes": null o {}.
Responde siempre en español.

Estado actual del proyecto:
${JSON.stringify(projectState, null, 2)}
`

  // Incluir el historial completo para que la IA tenga memoria del proyecto
  const contents = chatHistory
    .filter(m => m.sender === 'user' || m.sender === 'assistant' || m.sender === 'system')
    .map(m => ({ 
      role: m.sender === 'user' ? 'user' : 'model', 
      parts: [{ text: m.message }] 
    }))

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: { systemInstruction: systemInstructionText, responseMimeType: 'application/json' }
    })
    return JSON.parse(response.text)
  } catch (error) {
    console.error(error)
    throw new Error(`Detalles: ${error.message || error}`)
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

  const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash']
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
