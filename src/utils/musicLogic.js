/**
 * Motor de Humanización y Lógica Musical (Traductor IA -> Tone.js)
 * Contiene funciones puras para manipular eventos MIDI crudos, evitando
 * matemáticas complejas en la IA y protegiendo el motor de audio.
 */
import { Chord, Note, Interval } from '@tonaljs/tonal';

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
      const epsilon = 0.05;
      const mod1 = beatPos % 1;
      
      // Tiempos fuertes: 0, 1, 2, 3 (tolerancia para valores como 0.03 o 0.98)
      const isDownbeat = mod1 < epsilon || mod1 > 1 - epsilon;
      
      // Contratiempos: 0.5, 1.5, 2.5, 3.5 (tolerancia para valores como 0.52 o 0.48)
      const isUpbeat = Math.abs(mod1 - 0.5) < epsilon;

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

export const evaluateHarmonicClash = (newChordNotes, activeMelodyNote) => {
  if (!activeMelodyNote || !newChordNotes || newChordNotes.length === 0) {
    return { hasClash: false, suggestedNote: activeMelodyNote };
  }

  const melodyNote = Note.simplify(activeMelodyNote);
  const melodyPc = Note.pitchClass(melodyNote);
  const melodyMidi = Note.midi(melodyNote) || noteToMidi(activeMelodyNote);
  
  if (!melodyMidi) return { hasClash: false, suggestedNote: activeMelodyNote };

  // A. Detectar contexto del acorde completo usando Tonal
  const chordNotesSimp = newChordNotes.map(n => Note.simplify(n));
  const chordDetect = Chord.detect(chordNotesSimp);
  const detectedChord = chordDetect.length > 0 ? Chord.get(chordDetect[0]) : null;

  if (detectedChord && !detectedChord.empty) {
    const chordNotesPc = detectedChord.notes; 
    
    // Si la melodía ya es parte del acorde, está perfecta
    if (chordNotesPc.includes(melodyPc)) {
      return { hasClash: false, suggestedNote: activeMelodyNote };
    }

    // Buscamos choques severos comparando la melodía con CADA nota del acorde
    for (const cNote of chordNotesPc) {
      const interval = Interval.distance(cNote, melodyPc);
      const semitones = Math.abs(Interval.semitones(interval)) % 12;

      // Choques: 1 (2da menor), 11 (7ma mayor), 6 (tritono)
      if (semitones === 1 || semitones === 11 || semitones === 6) {
        // Resolver a la nota del acorde más cercana armónicamente
        let closestChordNote = chordNotesPc[0];
        let minDiff = 12;
        
        for (const cn of chordNotesPc) {
          const d = Math.abs(Interval.semitones(Interval.distance(melodyPc, cn))) % 12;
          const actualDist = Math.min(d, 12 - d); // Distancia más corta (arriba o abajo)
          if (actualDist < minDiff) {
            minDiff = actualDist;
            closestChordNote = cn;
          }
        }

        const distSemitones = Interval.semitones(Interval.distance(melodyPc, closestChordNote));
        const newMelodyNote = Note.transpose(melodyNote, Interval.fromSemitones(distSemitones));
        
        return { hasClash: true, suggestedNote: newMelodyNote };
      }
    }
  } else {
    // Fallback: Evaluación matemática si no hay acorde claro detectado
    let hasClash = false;
    let clashMidi = null;

    for (const chordNote of newChordNotes) {
      const chordMidi = Note.midi(chordNote) || noteToMidi(chordNote);
      if (!chordMidi) continue;
      
      const interval = Math.abs(chordMidi - melodyMidi) % 12;
      if (interval === 1 || interval === 11 || interval === 6) {
        hasClash = true;
        clashMidi = chordMidi;
        break;
      }
    }

    if (hasClash) {
      const diff = (melodyMidi - clashMidi) % 12;
      let newMelodyMidi = melodyMidi;
      
      if (diff === 1 || diff === -11) { 
        newMelodyMidi -= 1; 
      } else if (diff === 11 || diff === -1) { 
        newMelodyMidi += 1; 
      } else if (diff === 6 || diff === -6) {
        newMelodyMidi += 1; // 6 -> 7 (Quinta Justa resuelve el tritono)
      }
      
      return { hasClash: true, suggestedNote: Note.fromMidi(newMelodyMidi) || midiToNote(newMelodyMidi) };
    }
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
