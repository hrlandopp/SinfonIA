/**
 * Motor de Humanización y Lógica Musical (Traductor IA -> Tone.js)
 * Contiene funciones puras para manipular eventos MIDI crudos, evitando
 * matemáticas complejas en la IA y protegiendo el motor de audio.
 */

// Helper: Convierte notación científica (ej. "C4") a valor MIDI
const noteToMidi = (note) => {
  const regex = /^([A-G])(#|b)?(-?\d)$/;
  const match = note.match(regex);
  if (!match) return 0;
  
  const notes = { 'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11 };
  const pitchClass = notes[match[1] + (match[2] || '')];
  const octave = parseInt(match[3], 10);
  
  return pitchClass + (octave + 1) * 12;
};

// Helper: Convierte valor MIDI a notación científica (ej. 60 -> "C4")
const midiToNote = (midi) => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  return `${notes[midi % 12]}${octave}`;
};

/**
 * 1. applyStrumming
 * Simula el rasgueo asíncrono de una guitarra.
 * 
 * @param {Array} notesArray - Array de objetos { pitch, timeOffset, duration, velocity }
 * @param {string} direction - "down" (grave a agudo) o "up" (agudo a grave)
 * @param {number} bpm - Tempo actual para calcular milisegundos en beats relativos
 * @returns {Array} - Nuevo array con timeOffsets modificados
 */
export const applyStrumming = (notesArray, direction = 'down', bpm = 120) => {
  if (!notesArray || notesArray.length <= 1) return notesArray;

  // Ordenamos de grave a agudo basándonos en el valor MIDI
  let strummedNotes = [...notesArray].sort((a, b) => noteToMidi(a.pitch) - noteToMidi(b.pitch));

  if (direction === 'up') {
    strummedNotes.reverse();
  }

  // Desfase de ~15ms convertido a fracción de beat para que Tone.js lo lea dinámicamente.
  // 1 beat = (60000 / bpm) milisegundos.
  const delayPerNoteInBeats = (15 / 1000) * (bpm / 60);

  return strummedNotes.map((note, index) => ({
    ...note,
    timeOffset: (note.timeOffset || 0) + (index * delayPerNoteInBeats)
  }));
};

/**
 * 2. applyGroove
 * Modifica la dinámica (velocity) de las notas según un patrón rítmico para dar "feeling".
 * 
 * @param {Array} notesArray - Array de eventos de notas
 * @param {string} groovePattern - Tipo de groove (ej. "syncopated")
 * @returns {Array} - Array con velocities ajustados
 */
export const applyGroove = (notesArray, groovePattern = 'syncopated') => {
  return notesArray.map(note => {
    let newVelocity = note.velocity || 0.7;
    const beatPos = (note.timeOffset || 0) % 4; // Posición dentro de un compás de 4/4

    if (groovePattern === 'syncopated') {
      const isDownbeat = beatPos % 1 === 0; // Tiempos fuertes: 0, 1, 2, 3
      const isUpbeat = beatPos % 0.5 === 0 && !isDownbeat; // Contratiempos: 0.5, 1.5, 2.5, 3.5

      if (isDownbeat) newVelocity = 0.6; // Suaviza el golpe de click track
      else if (isUpbeat) newVelocity = 0.9; // Acentúa el contratiempo (groove)
    } 
    // Se pueden añadir más patrones aquí (swing, heavy_downbeat, etc.)

    return { ...note, velocity: newVelocity };
  });
};

/**
 * 3. reduceToDyad
 * Limpiador de frecuencias acústicas. Extrae solo la Tónica y la Tercera (o Quinta) 
 * de un acorde saturado.
 * 
 * @param {Array<string>} chordNotes - Array de strings de pitches (ej. ['C4', 'E4', 'G4', 'B4'])
 * @returns {Array<string>} - Array de 2 strings (Díada)
 */
export const reduceToDyad = (chordNotes) => {
  if (!chordNotes || chordNotes.length <= 2) return chordNotes;

  const sortedMidi = chordNotes.map(noteToMidi).sort((a, b) => a - b);
  const rootMidi = sortedMidi[0]; // La más grave se asume como Tónica
  
  // Buscar la Tercera (menor o mayor: 3 o 4 semitonos)
  let secondNoteMidi = sortedMidi.find(m => {
    const interval = (m - rootMidi) % 12;
    return interval === 3 || interval === 4; 
  });

  // Si no hay tercera, buscar una Quinta justa (7 semitonos)
  if (!secondNoteMidi) {
    secondNoteMidi = sortedMidi.find(m => (m - rootMidi) % 12 === 7);
  }

  // Fallback: Si es un clúster muy denso, tomar simplemente la segunda nota más baja
  if (!secondNoteMidi) {
    secondNoteMidi = sortedMidi[1];
  }

  return [midiToNote(rootMidi), midiToNote(secondNoteMidi)];
};

/**
 * 4. evaluateHarmonicClash
 * Analizador de disonancias severas para generar el "Efecto Cascada"
 * (IA autoadaptando su melodía sobre los acordes vivos).
 * 
 * @param {Array<string>} newChordNotes - Array de pitches del acorde base
 * @param {string} activeMelodyNote - Pitch de la nota de la melodía flotante
 * @returns {Object} - { hasClash: boolean, suggestedNote: string }
 */
export const evaluateHarmonicClash = (newChordNotes, activeMelodyNote) => {
  const melodyMidi = noteToMidi(activeMelodyNote);
  if (!melodyMidi) return { hasClash: false, suggestedNote: activeMelodyNote };

  let hasClash = false;
  let clashMidi = null;

  for (const chordNote of newChordNotes) {
    const chordMidi = noteToMidi(chordNote);
    const interval = Math.abs(chordMidi - melodyMidi) % 12;

    // Una segunda menor (1 semitono) o séptima mayor (11 semitonos) crea fricción acústica severa
    if (interval === 1 || interval === 11) {
      hasClash = true;
      clashMidi = chordMidi;
      break;
    }
  }

  if (hasClash) {
    // Resolución simple: Mover la nota de la melodía para que coincida 
    // exactamente con la nota del acorde que estaba chocando (unísono u octava)
    const diff = (melodyMidi - clashMidi) % 12;
    let newMelodyMidi = melodyMidi;
    
    if (diff === 1 || diff === -11) { 
      // Melodía está 1 semitono por encima de la nota del acorde -> Bajar 1
      newMelodyMidi -= 1; 
    } else if (diff === 11 || diff === -1) { 
      // Melodía está 1 semitono por debajo -> Subir 1
      newMelodyMidi += 1; 
    }
    
    return { hasClash: true, suggestedNote: midiToNote(newMelodyMidi) };
  }

  return { hasClash: false, suggestedNote: activeMelodyNote };
};

/**
 * 5. applyArticulationParams
 * Modifica las propiedades acústicas de una nota (duración, velocity)
 * en tiempo real según la técnica de ejecución indicada.
 * 
 * @param {Object} noteValue - Objeto de nota original { pitch, time, duration, velocity, articulation, ... }
 * @returns {Object} - Nota procesada
 */
export const applyArticulationParams = (noteValue) => {
  if (!noteValue || !noteValue.articulation) return noteValue;

  const processedNote = { ...noteValue };

  switch (processedNote.articulation) {
    case 'staccato':
      // Reduce la duración agresivamente para un corte seco
      processedNote.duration = "16n";
      break;
    case 'legato':
      // Extiende la duración para solaparse levemente (evitando vacíos)
      if (typeof processedNote.duration === 'string') {
        processedNote.duration = `${processedNote.duration} + 16n`;
      }
      break;
    case 'apoyado':
      // Incrementa la fuerza (velocity) con un tope de 1.0
      processedNote.velocity = Math.min((processedNote.velocity || 0.7) * 1.1, 1.0);
      break;
    case 'tirando':
      // Reduce la fuerza (velocity) para un ataque más sutil y un release natural
      processedNote.velocity = (processedNote.velocity || 0.7) * 0.85;
      break;
    default:
      break;
  }

  return processedNote;
};
