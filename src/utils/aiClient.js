import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

// Restricción absoluta de formato de intercambio para el motor DSP
const MASTER_JSON_SCHEMA_PROMPT = `
DEBES responder ÚNICAMENTE con un objeto JSON estrictamente válido. No incluyas texto de introducción ni bloques de marcado markdown como \`\`\`json. Tu respuesta debe parsearse directamente con JSON.parse().

ESQUEMA OBLIGATORIO:
{
  "message": "Mensaje en español, honesto, crítico y conciso sobre la decisión musical.",
  "changes": {
    "tempo_bpm": 120,
    "key_signature": "Am",
    "mood": "Sentimiento general",
    "instruments": {
      "guitar": { "active": true, "type": "fingerpicking" },
      "piano": { "active": false, "type": "pad" },
      "strings": { "active": true, "type": "pad" }
    },
    "automations": [],
    "sections": []
  }
}
If there are no architectural changes, set "changes": null.
`;

const PRODUCER_SYSTEM_PROMPT = `
Eres el Productor General de SinfonIA. Tu enfoque es MACRO: estructuras formales (Intro, Verso, Coro), tempos, tonalidades y balance de mezcla general. Eres un músico de élite, honesto y no complaciente. Si el usuario pide una progresión absurda o disonante, critícala constructivamente en tu "message" y ofrece la alternativa correcta en "changes".
`;

const MASCOT_SYSTEM_PROMPT = `
Eres la Mascota/Sub-asistente de SinfonIA. Tu enfoque es MICRO y contextual. Analizas el foco visual del usuario (pestaña, instrumento) para sugerir arpegios, articulaciones quirúrgicas (staccato, legato, apoyado, tirando) o automatizaciones de canal. Eres el copiloto amigable pero críticamente honesto en teoría musical. No alteres la estructura macro a menos que sea una corrección armónica crítica.
`;

export const sendMessageToAI = async ({ agentType, provider, prompt, context }) => {
  const isGemini = provider === 'gemini';
  const apiKey = localStorage.getItem(`${provider}_api_key`) || (process.env && process.env[`REACT_APP_${provider.toUpperCase()}_API_KEY`] ? process.env[`REACT_APP_${provider.toUpperCase()}_API_KEY`].trim() : '');
  
  if (!apiKey) throw new Error(`Clave de API para ${provider} no encontrada en la configuración.`);

  const systemInstruction = agentType === 'producer' ? PRODUCER_SYSTEM_PROMPT : MASCOT_SYSTEM_PROMPT;
  
  const fullPrompt = `
    ${MASTER_JSON_SCHEMA_PROMPT}
    ---
    LA PIZARRA (Estado Musical Actual):
    ${JSON.stringify(context.masterJson, null, 2)}
    
    FOCO DE INTERFAZ ACTUAL del usuario:
    ${JSON.stringify(context.uiFocus, null, 2)}
    
    HISTORIAL DEL AGENTE CONTRARIO (Memoria Cruzada):
    ${JSON.stringify(context.opposingHistory || [], null, 2)}
    ---
    PETICIÓN DEL USUARIO: ${prompt}
  `;

  try {
    if (isGemini) {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: { systemInstruction, responseMimeType: 'application/json' }
      });
      return JSON.parse(response.text);
    } else {
      const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: fullPrompt }
        ]
      });
      return JSON.parse(response.choices[0].message.content);
    }
  } catch (error) {
    console.error(`Error crítico en agente [${agentType}] con proveedor [${provider}]:`, error);
    throw error;
  }
};
