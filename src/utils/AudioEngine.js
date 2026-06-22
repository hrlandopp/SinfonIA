import * as Tone from 'tone'

// ═══════════════════════════════════════════════════════════════════
// NOTA: Sistema de notas con octavas correctas
// ═══════════════════════════════════════════════════════════════════

const NOTE_SEMITONES = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
}

const ALL_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// Convertir nota con octava (ej: "C4") a MIDI
export const noteToMidi = (noteName) => {
  const match = noteName.match(/([A-G]#?)(\d)/)
  if (!match) return null
  const [_, note, octave] = match
  const semitone = NOTE_SEMITONES[note]
  return semitone + (parseInt(octave) + 1) * 12
}

// Convertir MIDI a nota con octava
export const midiToNote = (midi) => {
  const octave = Math.floor(midi / 12) - 1
  const semitone = midi % 12
  return `${ALL_NOTES[semitone]}${octave}`
}

const semitoneToNote = (semitone, octave) => {
  const index = ((semitone % 12) + 12) % 12
  const extraOctave = Math.floor(semitone / 12)
  return `${ALL_NOTES[index]}${octave + extraOctave}`
}

/**
 * Voicings de guitarra reales basados en digitaciones estándar (open/barre chords)
 * Esto hace que el sonido de la guitarra sea realista y coincida con el instrumento real.
 */
const GUITAR_VOICINGS = {
  'C': ['C3', 'E3', 'G3', 'C4', 'E4'],
  'Cmaj7': ['C3', 'E3', 'G3', 'B3', 'E4'],
  'C7': ['C3', 'E3', 'Bb3', 'C4', 'E4'],
  'Cadd9': ['C3', 'E3', 'G3', 'D4', 'E4'],
  
  'Am': ['A2', 'E3', 'A3', 'C4', 'E4'],
  'Am7': ['A2', 'E3', 'G3', 'C4', 'E4'],
  'A': ['A2', 'E3', 'A3', 'C#4', 'E4'],
  'A7': ['A2', 'E3', 'G3', 'C#4', 'E4'],
  
  'G': ['G2', 'B2', 'D3', 'G3', 'B3', 'G4'],
  'G7': ['G2', 'B2', 'D3', 'G3', 'B3', 'F4'],
  'Gsus4': ['G2', 'C3', 'D3', 'G3', 'B3', 'G4'],
  
  'F': ['F2', 'C3', 'F3', 'A3', 'C4', 'F4'],
  'Fmaj7': ['F2', 'C3', 'F3', 'A3', 'C4', 'E4'],
  'F7': ['F2', 'C3', 'Eb3', 'A3', 'C4', 'F4'],
  
  'Dm': ['D3', 'A3', 'D4', 'F4'],
  'Dm7': ['D3', 'A3', 'C4', 'F4'],
  'D': ['D3', 'A3', 'D4', 'F#4'],
  'D7': ['D3', 'A3', 'C4', 'F#4'],
  
  'Em': ['E2', 'B2', 'E3', 'G3', 'B3', 'E4'],
  'Em7': ['E2', 'B2', 'D3', 'G3', 'B3', 'E4'],
  'E': ['E2', 'B2', 'E3', 'G#3', 'B3', 'E4'],
  'E7': ['E2', 'B2', 'D3', 'G#3', 'B3', 'E4'],
  
  'Bm': ['B2', 'F#3', 'B3', 'D4', 'F#4'],
  'Bm7': ['B2', 'F#3', 'A3', 'D4', 'F#4'],
  'B': ['B2', 'F#3', 'B3', 'D#4', 'F#4'],
  
  'F#m': ['F#2', 'C#3', 'F#3', 'A3', 'C#4', 'F#4'],
  'F#': ['F#2', 'C#3', 'F#3', 'A#3', 'C#4', 'F#4']
}

/**
 * Genera notas de un acorde con octava base específica
 * Respeta octavas y genera voicing musical coherente
 */
export const parseChordNotes = (chordName, baseOctave = 3) => {
  if (!chordName) return []
  
  // Parsear raíz del acorde (ej: "C", "C#", "Db")
  let root = chordName.substring(0, 1)
  let rest = chordName.substring(1)
  
  if (rest.startsWith('#') || rest.startsWith('b')) {
    root += rest.substring(0, 1)
    rest = rest.substring(1)
  }
  
  const rootSemitone = NOTE_SEMITONES[root]
  if (rootSemitone === undefined) return []
  
  // Definir intervalos del acorde
  let intervals = [0, 4, 7] // Mayor
  
  if (rest === 'm' || rest === 'min' || rest.startsWith('m-') || rest.startsWith('min-')) {
    intervals = [0, 3, 7] // Menor
  } else if (rest === 'maj7' || rest === 'M7') {
    intervals = [0, 4, 7, 11]
  } else if (rest === 'm7' || rest === 'min7') {
    intervals = [0, 3, 7, 10]
  } else if (rest === '7') {
    intervals = [0, 4, 7, 10]
  } else if (rest === 'sus4' || rest === 'sus') {
    intervals = [0, 5, 7]
  } else if (rest === 'dim') {
    intervals = [0, 3, 6]
  } else if (rest === 'add9') {
    intervals = [0, 4, 7, 14]
  } else if (rest === 'm9') {
    intervals = [0, 3, 7, 10, 14]
  }
  
  const absoluteRoot = rootSemitone + (baseOctave * 12)
  return intervals.map(interval => semitoneToNote(absoluteRoot + interval, 0))
}

/**
 * Retorna las notas de la guitarra para un acorde específico.
 * Si no está en el diccionario predefinido, genera un voicing realista.
 */
export const getGuitarVoicing = (chordName) => {
  if (GUITAR_VOICINGS[chordName]) {
    return GUITAR_VOICINGS[chordName]
  }
  
  // Voicing genérico realista si no existe en el diccionario
  const notes = parseChordNotes(chordName, 3) // Notas base del acorde
  if (notes.length === 0) return []
  
  const root = notes[0]
  const rootMidi = noteToMidi(root)
  
  // Construir acorde distribuido en el diapasón (Tónica baja, quinta, tónica octava, tercera, quinta alta)
  const voicingMidi = [
    rootMidi - 12, // Tónica grave
    rootMidi - 5,  // Quinta
    rootMidi,      // Tónica media
    rootMidi + 4,  // Tercera (o menor según el acorde)
    rootMidi + 7   // Quinta alta
  ]
  
  return voicingMidi.map(midi => midiToNote(midi))
}

// ═══════════════════════════════════════════════════════════════════
// MOTOR DE SONIDO: Sincronización temporal y generación de audio
// ═══════════════════════════════════════════════════════════════════

class AudioEngine {
  constructor() {
    this.isPlaying = false
    this.bpm = 120
    this.currentTime = 0
    this.currentBeat = 0
    this.chordIndex = 0
    this.currentChords = []
    
    // --- INSTRUMENTOS ---
    // 1. GUITARRA (Pluck acústico realista)
    this.guitarFilter = new Tone.Filter(3000, 'lowpass').toDestination()
    this.guitar = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.005,
        decay: 1.0,
        sustain: 0.1,
        release: 0.6
      }
    }).connect(this.guitarFilter)
    this.guitar.volume.value = -6

    // 2. PIANO (Acompañamiento suave)
    this.pianoFilter = new Tone.Filter(1200, 'lowpass').toDestination()
    this.piano = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.05,
        decay: 1.2,
        sustain: 0.15,
        release: 1.0
      }
    }).connect(this.pianoFilter)
    this.piano.volume.value = -14

    // 3. BAJO (Mono synth para bajo coherente)
    this.bassFilter = new Tone.Filter(250, 'lowpass').toDestination()
    this.bass = new Tone.MonoSynth({
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.01,
        decay: 0.3,
        sustain: 0.6,
        release: 0.5
      }
    }).connect(this.bassFilter)
    this.bass.volume.value = -10

    // 4. BATERÍA
    this.kick = new Tone.MembraneSynth().toDestination()
    this.kick.volume.value = -8
    
    this.hihat = new Tone.MetalSynth({
      envelope: {
        attack: 0.001,
        decay: 0.05,
        release: 0.05
      }
    }).toDestination()
    this.hihat.volume.value = -20
    
    this.snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: {
        attack: 0.001,
        decay: 0.1,
        sustain: 0
      }
    }).toDestination()
    this.snare.volume.value = -14

    // --- CONFIGURACIÓN DE INSTRUMENTOS ---
    this.instruments = {
      guitar: { active: true, volume: -6, type: 'strum' },
      piano: { active: true, volume: -14, type: 'arpeggio' },
      bass: { active: true, volume: -10, type: 'roots' },
      drums: { active: true, volume: -8, type: 'basic' }
    }

    // --- CALLBACKS ---
    this.onBeatCallback = null
    this.beatSchedules = [] // Track de eventos programados
  }

  async startContext() {
    await Tone.start()
  }

  /**
   * Calcula la duración en segundos de cada beat
   */
  beatToSeconds(beats) {
    return (beats * 60) / this.bpm
  }

  /**
   * Establece los acordes a reproducir
   */
  setChords(chords) {
    this.currentChords = chords
    this.currentBeat = 0
    this.chordIndex = 0
  }

  /**
   * REPRODUCCIÓN PRINCIPAL: Sincronización correcta de instrumentos
   */
  play() {
    if (this.isPlaying) return
    
    this.isPlaying = true
    this.currentTime = 0
    this.currentBeat = 0
    this.chordIndex = 0
    
    // Cancelar eventos previos
    Tone.Transport.cancel()
    
    // Programar reproducción de la secuencia
    this.scheduleSequence()
    
    Tone.Transport.bpm.value = this.bpm
    Tone.Transport.start('+0')
  }

  /**
   * Programa todos los eventos de audio con timing preciso
   */
  scheduleSequence() {
    if (this.currentChords.length === 0) return

    let cumulativeBeat = 0
    let chordIdx = 0

    // Por cada acorde en la secuencia
    for (const chordObj of this.currentChords) {
      const chordName = chordObj.chord
      const durationBeats = chordObj.beats || 4
      const beatDuration = this.beatToSeconds(durationBeats)

      // GUITARRA: rasgueo al inicio del acorde
      this.scheduleGuitar(chordName, cumulativeBeat, durationBeats, chordIdx)

      // PIANO: arpegio a lo largo del acorde
      this.schedulePiano(chordName, cumulativeBeat, durationBeats, chordIdx)

      // BAJO: patrón rítmico
      this.scheduleBass(chordName, cumulativeBeat, durationBeats, chordIdx)

      // BATERÍA: pulso constante
      this.scheduleDrums(cumulativeBeat, durationBeats, chordIdx)

      // Notificar cambio de acorde
      const seconds = this.beatToSeconds(cumulativeBeat)
      Tone.Transport.scheduleOnce((time) => {
        if (this.onBeatCallback) {
          this.onBeatCallback(cumulativeBeat, chordIdx, chordName, this.currentChords.length * 4)
        }
      }, '+' + seconds)

      cumulativeBeat += durationBeats
      chordIdx++
    }

    // Loop: volver a empezar
    const totalBeats = cumulativeBeat
    const loopSeconds = this.beatToSeconds(totalBeats)
    Tone.Transport.scheduleRepeat((time) => {
      this.currentBeat = 0
      this.chordIndex = 0
      this.scheduleSequence()
    }, loopSeconds)
  }

  /**
   * GUITARRA: Rasgueo coordinado con voicing realista
   */
  scheduleGuitar(chordName, startBeat, durationBeats, chordIdx) {
    if (!this.instruments.guitar.active) return

    const voicing = getGuitarVoicing(chordName)
    if (voicing.length === 0) return

    const seconds = this.beatToSeconds(startBeat)

    if (this.instruments.guitar.type === 'strum') {
      // Rasgueo descendente: cada cuerda con pequeño retraso
      voicing.forEach((note, i) => {
        const delay = seconds + (i * 0.05)
        Tone.Transport.scheduleOnce((time) => {
          this.guitar.triggerAttackRelease(note, '0.6', time)
        }, '+' + delay)
      })
    } else if (this.instruments.guitar.type === 'arpeggio') {
      // Arpegio: toca una nota cada 16avo
      for (let beat = 0; beat < durationBeats; beat += 0.25) {
        const noteIdx = Math.floor((beat / 0.25) % voicing.length)
        const noteSeconds = this.beatToSeconds(startBeat + beat)
        Tone.Transport.scheduleOnce((time) => {
          this.guitar.triggerAttackRelease(voicing[noteIdx], '0.25', time)
        }, '+' + noteSeconds)
      }
    }
  }

  /**
   * PIANO: Arpegio invertido suave
   */
  schedulePiano(chordName, startBeat, durationBeats, chordIdx) {
    if (!this.instruments.piano.active) return

    const notes = parseChordNotes(chordName, 3)
    if (notes.length === 0) return

    const seconds = this.beatToSeconds(startBeat)

    if (this.instruments.piano.type === 'arpeggio') {
      // Arpegio en corcheas (8avo)
      for (let beat = 0; beat < durationBeats; beat += 0.5) {
        const noteIdx = Math.floor((beat / 0.5) % notes.length)
        const noteSeconds = this.beatToSeconds(startBeat + beat)
        Tone.Transport.scheduleOnce((time) => {
          this.piano.triggerAttackRelease(notes[noteIdx], '0.4', time)
        }, '+' + noteSeconds)
      }
    } else if (this.instruments.piano.type === 'chord') {
      // Acorde completo al inicio
      Tone.Transport.scheduleOnce((time) => {
        this.piano.triggerAttackRelease(notes, '1.5', time)
      }, '+' + seconds)
    }
  }

  /**
   * BAJO: Patrón rítmico sincronizado
   */
  scheduleBass(chordName, startBeat, durationBeats, chordIdx) {
    if (!this.instruments.bass.active) return

    const notes = parseChordNotes(chordName, 2) // Octava más baja
    if (notes.length === 0) return

    const bassRoot = notes[0]

    if (this.instruments.bass.type === 'roots') {
      // Tónica en cada beat
      for (let beat = 0; beat < durationBeats; beat += 1) {
        const seconds = this.beatToSeconds(startBeat + beat)
        Tone.Transport.scheduleOnce((time) => {
          this.bass.triggerAttackRelease(bassRoot, '0.4', time)
        }, '+' + seconds)
      }
    } else if (this.instruments.bass.type === 'walking') {
      // Patrón walking bass
      for (let beat = 0; beat < durationBeats; beat += 1) {
        let bassNote = bassRoot
        const beatInChord = beat % 4
        
        if (beatInChord === 1 && notes[1]) bassNote = notes[1]
        if (beatInChord === 2 && notes[2]) bassNote = notes[2]
        if (beatInChord === 3) {
          // Aproximación cromática
          const rootMidi = noteToMidi(bassRoot)
          bassNote = midiToNote(rootMidi + 1)
        }

        const seconds = this.beatToSeconds(startBeat + beat)
        Tone.Transport.scheduleOnce((time) => {
          this.bass.triggerAttackRelease(bassNote, '0.35', time)
        }, '+' + seconds)
      }
    }
  }

  /**
   * BATERÍA: Pulso rítmico regular
   */
  scheduleDrums(startBeat, durationBeats, chordIdx) {
    if (!this.instruments.drums.active) return

    if (this.instruments.drums.type === 'basic') {
      // Patrón pop/rock: kick-snare-kick-snare
      for (let beat = 0; beat < durationBeats; beat += 1) {
        const beatInBar = beat % 4
        const seconds = this.beatToSeconds(startBeat + beat)

        // Kick en beats 0 y 2
        if (beatInBar === 0 || beatInBar === 2) {
          Tone.Transport.scheduleOnce((time) => {
            this.kick.triggerAttackRelease('C1', '0.1', time)
          }, '+' + seconds)
        }

        // Snare en beats 1 y 3
        if (beatInBar === 1 || beatInBar === 3) {
          Tone.Transport.scheduleOnce((time) => {
            this.snare.triggerAttack(time)
          }, '+' + seconds)
        }

        // Hi-hat en cada beat
        Tone.Transport.scheduleOnce((time) => {
          this.hihat.triggerAttack(time)
        }, '+' + seconds)
      }
    } else if (this.instruments.drums.type === 'metronome') {
      // Metrónomo simple
      for (let beat = 0; beat < durationBeats; beat += 1) {
        const beatInBar = beat % 4
        const seconds = this.beatToSeconds(startBeat + beat)

        Tone.Transport.scheduleOnce((time) => {
          const pitch = beatInBar === 0 ? 'F2' : 'C2'
          this.kick.triggerAttackRelease(pitch, '0.05', time)
        }, '+' + seconds)
      }
    }
  }

  pause() {
    this.isPlaying = false
    Tone.Transport.pause()
  }

  stop() {
    this.isPlaying = false
    Tone.Transport.stop()
    Tone.Transport.cancel()
    this.currentBeat = 0
    this.chordIndex = 0
  }

  setBpm(newBpm) {
    this.bpm = Math.max(40, Math.min(300, newBpm)) // Limitar 40-300 BPM
    Tone.Transport.bpm.value = this.bpm
  }

  setVolume(instrument, dbVolume) {
    if (!this.instruments[instrument]) return

    this.instruments[instrument].volume = dbVolume

    if (instrument === 'guitar') this.guitar.volume.value = dbVolume
    if (instrument === 'piano') this.piano.volume.value = dbVolume
    if (instrument === 'bass') this.bass.volume.value = dbVolume
    if (instrument === 'drums') {
      this.kick.volume.value = dbVolume + 2
      this.hihat.volume.value = dbVolume - 12
      this.snare.volume.value = dbVolume - 6
    }
  }

  setInstrumentActive(instrument, active) {
    if (this.instruments[instrument]) {
      this.instruments[instrument].active = active
    }
  }

  setPatternType(instrument, patternType) {
    if (this.instruments[instrument]) {
      this.instruments[instrument].type = patternType
    }
  }
}

export const audioEngine = new AudioEngine()
