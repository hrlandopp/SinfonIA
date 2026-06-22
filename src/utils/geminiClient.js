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
Eres SinfonIA, un productor musical experto, compositor y guitarrista profesional.
Ayudas al usuario a plasmar sentimientos en música, sugiriendo progresiones de acordes, tempos, tonalidades y estructuras.

Responde SIEMPRE en formato JSON con esta estructura exacta:
{
  "message": "Explicación conversacional en español, inspiradora y clara.",
  "changes": {
    "tempo_bpm": 120,
    "key_signature": "Am",
    "capo_position": 0,
    "sections": [
      {
        "name": "Intro",
        "order_index": 0,
        "chords": [
          {"chord": "Am", "beats": 4},
          {"chord": "F",  "beats": 4},
          {"chord": "C",  "beats": 4},
          {"chord": "G",  "beats": 4}
        ]
      }
    ]
  }
}

Si no hay cambios estructurales, devuelve "changes": null o {}.
Responde siempre en español.

Estado actual del proyecto:
${JSON.stringify(projectState, null, 2)}
`

  const contents = chatHistory
    .filter(m => m.sender === 'user' || m.sender === 'assistant')
    .map(m => ({ role: m.sender === 'user' ? 'user' : 'model', parts: [{ text: m.message }] }))

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

// ─── 2. Análisis de Producción (gemini-2.5-flash — Pro no disponible en tier gratuito) ──
export const runDeepCompositionAnalysis = async (projectState) => {
  const ai = getAiClient()

  const prompt = `Eres un productor musical experto y crítico. Realiza un análisis DETALLADO y ESTRUCTURADO de la siguiente composición.

Analiza:
1. 🎵 Progresión de acordes: coherencia, función armónica, tensión/resolución
2. 🎸 Técnica de guitarra: posiciones recomendadas, uso del capo, arpegios sugeridos
3. 🎭 Arco emocional: cómo evoluciona el sentimiento entre secciones
4. 💡 Sugerencias específicas y accionables para mejorar la composición

Estructura de la canción:
${JSON.stringify(projectState, null, 2)}

Responde en español con formato claro, usando emojis y secciones. Sé específico y motivador.`

  // Intentar con flash (disponible en tier gratuito) para mayor disponibilidad
  const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash']
  let lastError = null

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({ model, contents: prompt })
      return response.text
    } catch (error) {
      console.warn(`Modelo ${model} falló:`, error.message)
      lastError = error
      // Si es rate limit, esperar y reintentar con siguiente modelo
      if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) continue
      // Si es otro error, propagar inmediatamente
      throw new Error(`Error de análisis: ${error.message}`)
    }
  }
  throw new Error(`Cuota agotada. Intenta de nuevo en unos minutos. (${lastError?.message?.slice(0, 120)})`)
}

// ─── 3. Portada (generada con Canvas — Imagen API no disponible en tier gratuito) ───
export const generateSongArt = async (songName, moodDescription) => {
  // Imagen 3 no está disponible en el tier gratuito de la API.
  // Generamos una portada SVG profesional usando el nombre y mood de la canción.
  return generateCanvasCover(songName, moodDescription)
}

const generateCanvasCover = (songName, mood) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')

    // Paleta basada en el mood
    const palettes = {
      melancólico: ['#1a1a2e', '#16213e', '#0f3460', '#533483'],
      melancolic:  ['#1a1a2e', '#16213e', '#0f3460', '#533483'],
      energico:    ['#1a0a00', '#3d0000', '#870000', '#ff6b00'],
      enérgico:    ['#1a0a00', '#3d0000', '#870000', '#ff6b00'],
      neutral:     ['#0d1b2a', '#1b2838', '#2a3f5f', '#415a77'],
      alegre:      ['#0d2137', '#0f4c75', '#1b6ca8', '#0097b2'],
      romantico:   ['#1a0a10', '#3d0020', '#7a003f', '#c0005a'],
      romántico:   ['#1a0a10', '#3d0020', '#7a003f', '#c0005a'],
    }

    const moodKey = mood.toLowerCase().split(' ')[0]
    const colors = palettes[moodKey] || palettes.neutral

    // Fondo degradado
    const grad = ctx.createLinearGradient(0, 0, 512, 512)
    grad.addColorStop(0, colors[0])
    grad.addColorStop(0.4, colors[1])
    grad.addColorStop(0.7, colors[2])
    grad.addColorStop(1, colors[3])
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 512, 512)

    // Círculo de luz central
    const radGrad = ctx.createRadialGradient(256, 220, 20, 256, 220, 200)
    radGrad.addColorStop(0, 'rgba(255,255,255,0.12)')
    radGrad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = radGrad
    ctx.fillRect(0, 0, 512, 512)

    // Líneas de onda decorativas
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    for (let i = 0; i < 6; i++) {
      ctx.beginPath()
      for (let x = 0; x <= 512; x += 4) {
        const y = 256 + Math.sin((x / 512) * Math.PI * 3 + i) * (30 + i * 15)
        i === 0 && x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    // Ícono de guitarra (simplificado)
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.beginPath()
    ctx.arc(256, 200, 55, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.beginPath()
    ctx.arc(256, 200, 75, 0, Math.PI * 2)
    ctx.fill()

    // 🎸 emoji
    ctx.font = '64px serif'
    ctx.textAlign = 'center'
    ctx.fillText('🎸', 256, 222)

    // Nombre de la canción
    const fontSize = songName.length > 16 ? 26 : songName.length > 10 ? 32 : 38
    ctx.font = `bold ${fontSize}px "Inter", "Segoe UI", sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.shadowColor = 'rgba(0,0,0,0.8)'
    ctx.shadowBlur = 10
    ctx.fillText(songName, 256, 335)

    // Mood / descripción
    ctx.font = '16px "Inter", "Segoe UI", sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.shadowBlur = 0
    ctx.fillText(mood, 256, 370)

    // SinfonIA label
    ctx.font = 'bold 11px "Inter", "Segoe UI", sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.letterSpacing = '0.1em'
    ctx.fillText('SINFONÍA STUDIO', 256, 460)

    // Borde inferior decorativo
    const lineGrad = ctx.createLinearGradient(100, 0, 412, 0)
    lineGrad.addColorStop(0, 'transparent')
    lineGrad.addColorStop(0.5, 'rgba(255,255,255,0.4)')
    lineGrad.addColorStop(1, 'transparent')
    ctx.strokeStyle = lineGrad
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(100, 445)
    ctx.lineTo(412, 445)
    ctx.stroke()

    // Convertir a base64
    const dataUrl = canvas.toDataURL('image/png')
    resolve(dataUrl)
  })
}
