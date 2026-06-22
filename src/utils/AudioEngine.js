import * as Tone from 'tone'

const NOTE_SEMITONES = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
}

const semitoneToNote = (semitone, octave) => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const index = ((semitone % 12) + 12) % 12
  const extraOctave = Math.floor(semitone / 12)
  return `${notes[index]}${octave + extraOctave}`
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

export const parseChordNotes = (chordName, baseOctave = 3) => {
  if (!chordName) return []
  
  let root = chordName.substring(0, 1)
  let rest = chordName.substring(1)
  
  if (rest.startsWith('#') || rest.startsWith('b')) {
    root += rest.substring(0, 1)
    rest = rest.substring(1)
  }
  
  const rootSemitone = NOTE_SEMITONES[root]
  if (rootSemitone === undefined) return []
  
  let intervals = [0, 4, 7] // Mayor
  
  if (rest === 'm' || rest === 'min' || rest.startsWith('m-') || rest.startsWith('min-')) {
    intervals = [0, 3, 7]
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
  const rootMidi = Tone.Frequency(root).toMidi()
  
  // Construir acorde distribuido en el diapasón (Tónica baja, quinta, tónica octava, tercera, quinta alta)
  const voicingMidi = [
    rootMidi - 12, // Tónica grave
    rootMidi - 5,  // Quinta
    rootMidi,      // Tónica media
    rootMidi + 4,  // Tercera (o menor según el acorde)
    rootMidi + 7   // Quinta alta
  ]
  
  return voicingMidi.map(midi => Tone.Frequency(midi, 'midi').toNote())
}

class AudioEngine {
  constructor() {
    this.isPlaying = false
    this.bpm = 120
    
    // --- EFECTOS Y FILTROS PARA UN SONIDO REALISTA ---
    // Filtro para guitarra (recorta agudos molestos, simula madera/cuerpo)
    this.guitarFilter = new Tone.Filter(1500, 'lowpass').toDestination()
    
    // Filtro para piano (Rhodes cálido)
    this.pianoFilter = new Tone.Filter(900, 'lowpass').toDestination()
    
    // Filtro para bajo (recorta agudos, sub-bass redondo)
    this.bassFilter = new Tone.Filter(180, 'lowpass').toDestination()

    // --- SINTETIZADORES ---
    // 1. GUITARRA (Pluck acústico con prioridad)
    this.guitar = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.002, // Ataque inmediato del plectro/uña
        decay: 1.2,    // Resonancia de la caja
        sustain: 0.05,
        release: 0.5
      }
    }).connect(this.guitarFilter)
    this.guitar.volume.value = -6 // Prioridad de volumen

    // 2. PIANO (Acompañamiento Rhodes suave)
    this.piano = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.04,  // Ataque suave de martillo
        decay: 1.5,
        sustain: 0.2,
        release: 1.5
      }
    }).connect(this.pianoFilter)
    this.piano.volume.value = -12

    // 3. BAJO (Fender Jazz Bass sintetizado)
    this.bass = new Tone.MonoSynth({
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.02,
        decay: 0.4,
        sustain: 0.8,
        release: 0.8
      }
    }).connect(this.bassFilter)
    this.bass.volume.value = -8

    // 4. BATERÍA (Bombo, Caja y Platillo)
    this.kick = new Tone.MembraneSynth().toDestination()
    this.kick.volume.value = -8
    
    this.hihat = new Tone.MetalSynth({
      envelope: {
        attack: 0.001,
        decay: 0.04,
        release: 0.04
      }
    }).toDestination()
    this.hihat.volume.value = -22
    
    this.snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: {
        attack: 0.001,
        decay: 0.08,
        sustain: 0
      }
    }).toDestination()
    this.snare.volume.value = -16

    this.currentChords = []
    this.currentBeat = 0
    this.chordIndex = 0
    
    this.instruments = {
      guitar: { active: true, volume: -6, type: 'strum' }, // Prioridad activa por defecto
      piano: { active: true, volume: -12, type: 'arpeggio' },
      bass: { active: true, volume: -8, type: 'roots' },
      drums: { active: true, volume: -12, type: 'basic' }
    }

    this.onBeatCallback = null
    this.setupTransport()
  }

  async startContext() {
    await Tone.start()
  }

  setupTransport() {
    Tone.Transport.cancel()
    
    // Corcheas (8n) para soportar arpegios y subdivisión
    Tone.Transport.scheduleRepeat((time) => {
      if (this.currentChords.length === 0) return

      let totalBeats = 0
      let targetChord = null
      let targetIndex = -1
      
      const currentQuarterBeat = Math.floor(this.currentBeat)

      for (let i = 0; i < this.currentChords.length; i++) {
        const c = this.currentChords[i]
        const duration = c.beats || 4
        if (currentQuarterBeat >= totalBeats && currentQuarterBeat < totalBeats + duration) {
          targetChord = c.chord
          targetIndex = i
          break
        }
        totalBeats += duration
      }

      // Loop al final de la progresión
      if (currentQuarterBeat >= totalBeats) {
        this.currentBeat = 0
        this.chordIndex = 0
        targetChord = this.currentChords[0]?.chord || null
        targetIndex = 0
      } else {
        this.chordIndex = targetIndex
      }

      const isQuarterBeat = this.currentBeat % 1 === 0
      const subBeatIndex = Math.floor(this.currentBeat * 2) % 8

      if (targetChord) {
        this.triggerAccompaniment(targetChord, subBeatIndex, time)
      }

      // Notificar al frontend en cada beat completo (negra)
      if (isQuarterBeat && this.onBeatCallback) {
        // Retornamos el beat global acumulado de la sección actual
        this.onBeatCallback(currentQuarterBeat, this.chordIndex, targetChord, totalBeats)
      }

      this.currentBeat += 0.5
    }, '8n')
  }

  triggerAccompaniment(chordName, subBeat, time) {
    const guitarNotes = getGuitarVoicing(chordName)
    const pianoNotes = parseChordNotes(chordName, 3)
    const bassRoot = parseChordNotes(chordName, 2)[0]
    
    // --- 1. GUITARRA (La prioridad acústica) ---
    if (this.instruments.guitar.active && guitarNotes.length > 0) {
      const type = this.instruments.guitar.type
      
      if (type === 'strum' && subBeat === 0) {
        // Rasgueo hacia abajo: pequeño retraso acumulativo entre cuerdas
        guitarNotes.forEach((note, i) => {
          this.guitar.triggerAttackRelease(note, '2n', time + (i * 0.025))
        })
      } else if (type === 'arpeggio') {
        // Arpegiador de guitarra en corcheas (tocando una cuerda cada beat)
        const noteIdx = subBeat % guitarNotes.length
        this.guitar.triggerAttackRelease(guitarNotes[noteIdx], '4n', time)
      }
    }

    // --- 2. PIANO ---
    if (this.instruments.piano.active && pianoNotes.length > 0) {
      const type = this.instruments.piano.type
      
      if (type === 'chord' && subBeat === 0) {
        // Acordes en bloque al inicio
        this.piano.triggerAttackRelease(pianoNotes, '2n', time)
      } else if (type === 'arpeggio') {
        // Arpegio invertido de piano para no chocar con la guitarra
        const noteIdx = (7 - subBeat) % pianoNotes.length
        this.piano.triggerAttackRelease(pianoNotes[noteIdx], '8n', time)
      }
    }

    // --- 3. BAJO ---
    if (this.instruments.bass.active && bassRoot) {
      const type = this.instruments.bass.type
      
      if (type === 'roots' && (subBeat === 0 || subBeat === 4)) {
        this.bass.triggerAttackRelease(bassRoot, '4n', time)
      } else if (type === 'walking') {
        // Una nota por pulso (en negras: subBeats 0, 2, 4, 6)
        if (subBeat % 2 === 0) {
          const beatIndex = subBeat / 2
          let bassNote = bassRoot
          
          if (beatIndex === 1 && pianoNotes[1]) bassNote = pianoNotes[1] // Tercera del acorde
          if (beatIndex === 2 && pianoNotes[2]) bassNote = pianoNotes[2] // Quinta del acorde
          if (beatIndex === 3) {
            // Nota de aproximación cromática a la siguiente tónica
            const rootMidi = Tone.Frequency(bassRoot).toMidi()
            bassNote = Tone.Frequency(rootMidi + 1, 'midi').toNote()
          }
          this.bass.triggerAttackRelease(bassNote, '8n', time)
        }
      }
    }

    // --- 4. BATERÍA ---
    if (this.instruments.drums.active) {
      const type = this.instruments.drums.type
      
      if (type === 'basic') {
        // Patrón Pop/Rock estándar: Bombo en 1 y 3, Caja en 2 y 4, contratiempo constante
        if (subBeat === 0 || subBeat === 4) {
          this.kick.triggerAttackRelease('C1', '8n', time)
        }
        if (subBeat === 2 || subBeat === 6) {
          this.snare.triggerAttack(time)
        }
        this.hihat.triggerAttack(time)
      } else if (type === 'metronome') {
        // Click simple en negras
        if (subBeat % 2 === 0) {
          const beatIndex = subBeat / 2
          this.kick.triggerAttackRelease(beatIndex === 0 ? 'F2' : 'C2', '16n', time)
        }
      }
    }
  }

  setChords(chords) {
    this.currentChords = chords
  }

  play() {
    this.isPlaying = true
    this.currentBeat = 0
    this.chordIndex = 0
    Tone.Transport.start()
  }

  pause() {
    this.isPlaying = false
    Tone.Transport.pause()
  }

  stop() {
    this.isPlaying = false
    Tone.Transport.stop()
    this.currentBeat = 0
    this.chordIndex = 0
  }

  setBpm(newBpm) {
    this.bpm = newBpm
    Tone.Transport.bpm.value = newBpm
  }

  setVolume(instrument, dbVolume) {
    if (this.instruments[instrument]) {
      this.instruments[instrument].volume = dbVolume
      if (instrument === 'guitar' && this.guitar) this.guitar.volume.value = dbVolume
      if (instrument === 'piano' && this.piano) this.piano.volume.value = dbVolume
      if (instrument === 'bass' && this.bass) this.bass.volume.value = dbVolume
      if (instrument === 'drums') {
        this.kick.volume.value = dbVolume + 4
        this.hihat.volume.value = dbVolume - 10
        this.snare.volume.value = dbVolume - 4
      }
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
