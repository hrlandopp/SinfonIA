import * as Tone from 'tone'

// ═══════════════════════════════════════════════════════════════════
// NOTA: Sistema de notas con octavas correctas
// ═══════════════════════════════════════════════════════════════════

const NOTE_SEMITONES = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
}

const ALL_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export const noteToMidi = (noteName) => {
  const match = noteName.match(/([A-G][#b]?)(\d)/)
  if (!match) return null
  const [_, note, octave] = match
  const semitone = NOTE_SEMITONES[note]
  return semitone + (parseInt(octave) + 1) * 12
}

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

const GUITAR_VOICINGS = {
  'C': ['C3', 'E3', 'G3', 'C4', 'E4'],
  'Cmaj7': ['C3', 'E3', 'G3', 'B3', 'E4'],
  'C7': ['C3', 'E3', 'Bb3', 'C4', 'E4'],
  'Cadd9': ['C3', 'E3', 'G3', 'D4', 'E4'],
  'Cm': ['C3', 'G3', 'C4', 'Eb4', 'G4'],
  
  'Am': ['A2', 'E3', 'A3', 'C4', 'E4'],
  'Am7': ['A2', 'E3', 'G3', 'C4', 'E4'],
  'A': ['A2', 'E3', 'A3', 'C#4', 'E4'],
  'A7': ['A2', 'E3', 'G3', 'C#4', 'E4'],
  
  'G': ['G2', 'B2', 'D3', 'G3', 'B3', 'G4'],
  'G7': ['G2', 'B2', 'D3', 'G3', 'B3', 'F4'],
  'Gsus4': ['G2', 'C3', 'D3', 'G3', 'B3', 'G4'],
  'Gm': ['G2', 'D3', 'G3', 'Bb3', 'D4', 'G4'],
  
  'F': ['F2', 'C3', 'F3', 'A3', 'C4', 'F4'],
  'Fmaj7': ['F2', 'C3', 'F3', 'A3', 'C4', 'E4'],
  'F7': ['F2', 'C3', 'Eb3', 'A3', 'C4', 'F4'],
  'Fm': ['F2', 'C3', 'F3', 'Ab3', 'C4', 'F4'],
  
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
  'Bb': ['Bb2', 'F3', 'Bb3', 'D4', 'F4'],
  
  'F#m': ['F#2', 'C#3', 'F#3', 'A3', 'C#4', 'F#4'],
  'F#': ['F#2', 'C#3', 'F#3', 'A#3', 'C#4', 'F#4'],
  'C#m': ['C#3', 'G#3', 'C#4', 'E4', 'G#4'],
  
  'Eb': ['Eb3', 'Bb3', 'Eb4', 'G4', 'Bb4'],
  'Ab': ['Ab2', 'Eb3', 'Ab3', 'C4', 'Eb4']
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

export const getGuitarVoicing = (chordName) => {
  if (GUITAR_VOICINGS[chordName]) return GUITAR_VOICINGS[chordName]
  
  const notes = parseChordNotes(chordName, 3)
  if (notes.length === 0) return []
  const rootMidi = noteToMidi(notes[0])
  const voicingMidi = [rootMidi - 12, rootMidi - 5, rootMidi, rootMidi + 4, rootMidi + 7]
  return voicingMidi.map(midi => midiToNote(midi))
}

// ═══════════════════════════════════════════════════════════════════
// MOTOR DE SONIDO
// ═══════════════════════════════════════════════════════════════════

class AudioEngine {
  constructor() {
    this.isPlaying = false
    this.bpm = 120
    this.currentBeat = 0
    this.chordIndex = 0
    this.currentChords = []
    this.currentMelody = []
    
    // 1. GUITARRA
    this.guitarFilter = new Tone.Filter(3000, 'lowpass').toDestination()
    this.guitar = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 1.0, sustain: 0.1, release: 0.6 }
    }).connect(this.guitarFilter)
    
    // 2. PIANO
    this.pianoFilter = new Tone.Filter(1200, 'lowpass').toDestination()
    this.piano = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.05, decay: 1.2, sustain: 0.15, release: 1.0 }
    }).connect(this.pianoFilter)
    
    // 3. BAJO
    this.bassFilter = new Tone.Filter(250, 'lowpass').toDestination()
    this.bass = new Tone.MonoSynth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.5 }
    }).connect(this.bassFilter)
    
    // 4. BATERÍA
    this.kick = new Tone.MembraneSynth().toDestination()
    this.hihat = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.05, release: 0.05 } }).toDestination()
    this.snare = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.1, sustain: 0 } }).toDestination()
    
    // 5. CUERDAS (Strings)
    this.stringsFilter = new Tone.Filter(800, 'lowpass').toDestination()
    this.strings = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 1.0, decay: 1.0, sustain: 0.8, release: 2.0 }
    }).connect(this.stringsFilter)
    
    // 6. VIOLÍN (Lead)
    this.violinVibrato = new Tone.Vibrato(5, 0.1).toDestination()
    this.violin = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.5, decay: 0.1, sustain: 0.8, release: 1.5 }
    }).connect(this.violinVibrato)
    
    // 7. VIBRÁFONO
    this.vibraphone = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3.0, modulationIndex: 10,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 1.5, sustain: 0, release: 1.0 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.01, decay: 0.5, sustain: 0, release: 0.5 }
    }).toDestination()

    this.instruments = {
      guitar: { active: true, volume: -14, type: 'strum' },
      piano: { active: true, volume: -18, type: 'arpeggio' },
      bass: { active: true, volume: -16, type: 'roots' },
      drums: { active: true, volume: -12, type: 'basic' },
      strings: { active: false, volume: -20, type: 'pad' },
      violin: { active: false, volume: -18, type: 'melody' },
      vibraphone: { active: false, volume: -16, type: 'chords' }
    }

    this.onBeatCallback = null
    this.syncEventIds = []
    
    this.applyVolumes()
  }

  applyVolumes() {
    this.guitar.volume.value = this.instruments.guitar.volume
    this.piano.volume.value = this.instruments.piano.volume
    this.bass.volume.value = this.instruments.bass.volume
    this.kick.volume.value = this.instruments.drums.volume + 2
    this.hihat.volume.value = this.instruments.drums.volume - 12
    this.snare.volume.value = this.instruments.drums.volume - 6
    this.strings.volume.value = this.instruments.strings.volume
    this.violin.volume.value = this.instruments.violin.volume
    this.vibraphone.volume.value = this.instruments.vibraphone.volume
  }

  async startContext() {
    await Tone.start()
  }

  setChords(chords) {
    this.currentChords = chords
    this.currentBeat = 0
    this.chordIndex = 0
  }

  setMelody(melody) {
    this.currentMelody = melody || []
  }

  play() {
    if (this.isPlaying) return
    this.isPlaying = true
    
    Tone.Transport.cancel()
    this.syncEventIds.forEach(id => Tone.Transport.clear(id))
    this.syncEventIds = []

    if (this.currentChords.length === 0) return

    let totalBeats = this.currentChords.reduce((sum, c) => sum + (c.beats || 4), 0)
    
    // Configurar loop correcto de Tone.js
    Tone.Transport.loop = true
    Tone.Transport.loopStart = 0
    Tone.Transport.loopEnd = `${totalBeats} * 4n` // Duración total en negras
    
    let cumulativeBeat = 0
    this.currentChords.forEach((chordObj, chordIdx) => {
      const chordName = chordObj.chord
      const durationBeats = chordObj.beats || 4
      
      this.scheduleGuitar(chordName, cumulativeBeat, durationBeats)
      this.schedulePiano(chordName, cumulativeBeat, durationBeats)
      this.scheduleBass(chordName, cumulativeBeat, durationBeats)
      this.scheduleDrums(cumulativeBeat, durationBeats)
      this.scheduleStrings(chordName, cumulativeBeat, durationBeats)
      this.scheduleViolin(chordName, cumulativeBeat, durationBeats)
      this.scheduleVibraphone(chordName, cumulativeBeat, durationBeats)

      cumulativeBeat += durationBeats
    })

    // Programar notas de la melodía personalizada
    if (this.currentMelody && this.currentMelody.length > 0) {
      this.currentMelody.forEach(noteObj => {
        const { note, beat, duration = '8n' } = noteObj
        const timeOffset = `${beat} * 4n`
        Tone.Transport.schedule((time) => {
          if (this.instruments.violin.active) {
            this.violin.triggerAttackRelease(note, duration, time)
          } else if (this.instruments.piano.active) {
            this.piano.triggerAttackRelease(note, duration, time)
          }
        }, timeOffset)
      })
    }

    // Callback de UI: Dispara cada 1 beat (negrilla)
    const beatEventId = Tone.Transport.scheduleRepeat((time) => {
      // Calcular beat actual de forma segura
      const positionStr = Tone.Transport.position.toString()
      const [bars, beats, sixteenths] = positionStr.split(':').map(Number)
      const currentGlobalBeat = (bars * 4) + beats
      
      // Encontrar el acorde activo actual
      let beatAccum = 0
      let activeChordIdx = 0
      let activeChordName = ''
      
      for (let i = 0; i < this.currentChords.length; i++) {
        beatAccum += this.currentChords[i].beats || 4
        if (currentGlobalBeat < beatAccum) {
          activeChordIdx = i
          activeChordName = this.currentChords[i].chord
          break
        }
      }

      Tone.Draw.schedule(() => {
        if (this.onBeatCallback) {
          this.onBeatCallback(currentGlobalBeat, activeChordIdx, activeChordName, totalBeats)
        }
      }, time)
    }, '4n')

    this.syncEventIds.push(beatEventId)
    
    Tone.Transport.bpm.value = this.bpm
    Tone.Transport.start()
  }

  scheduleGuitar(chordName, startBeat, durationBeats) {
    if (!this.instruments.guitar.active) return
    const voicing = getGuitarVoicing(chordName)
    if (voicing.length === 0) return

    if (this.instruments.guitar.type === 'strum') {
      voicing.forEach((note, i) => {
        const timeOffset = `${startBeat} * 4n + ${i * 0.05}`
        Tone.Transport.schedule((time) => { this.guitar.triggerAttackRelease(note, '0.6', time) }, timeOffset)
      })
    } else if (this.instruments.guitar.type === 'arpeggio' || this.instruments.guitar.type === 'fingerpicking') {
      for (let beat = 0; beat < durationBeats; beat += 0.5) {
        const noteIdx = Math.floor((beat / 0.5) % voicing.length)
        const timeOffset = `${startBeat + beat} * 4n`
        Tone.Transport.schedule((time) => { this.guitar.triggerAttackRelease(voicing[noteIdx], '0.25', time) }, timeOffset)
      }
    }
  }

  schedulePiano(chordName, startBeat, durationBeats) {
    if (!this.instruments.piano.active) return
    const notes = parseChordNotes(chordName, 3)
    if (notes.length === 0) return

    if (this.instruments.piano.type === 'arpeggio') {
      for (let beat = 0; beat < durationBeats; beat += 0.5) {
        const noteIdx = Math.floor((beat / 0.5) % notes.length)
        const timeOffset = `${startBeat + beat} * 4n`
        Tone.Transport.schedule((time) => { this.piano.triggerAttackRelease(notes[noteIdx], '0.4', time) }, timeOffset)
      }
    } else if (this.instruments.piano.type === 'chord' || this.instruments.piano.type === 'boogie') {
      // Acorde completo
      Tone.Transport.schedule((time) => { this.piano.triggerAttackRelease(notes, `${durationBeats} * 4n`, time) }, `${startBeat} * 4n`)
    }
  }

  scheduleBass(chordName, startBeat, durationBeats) {
    if (!this.instruments.bass.active) return
    const notes = parseChordNotes(chordName, 2)
    if (notes.length === 0) return
    const bassRoot = notes[0]

    if (this.instruments.bass.type === 'roots') {
      for (let beat = 0; beat < durationBeats; beat += 1) {
        Tone.Transport.schedule((time) => { this.bass.triggerAttackRelease(bassRoot, '0.4', time) }, `${startBeat + beat} * 4n`)
      }
    } else if (this.instruments.bass.type === 'walking' || this.instruments.bass.type === 'funk slap') {
      for (let beat = 0; beat < durationBeats; beat += 1) {
        let bassNote = bassRoot
        const beatInChord = beat % 4
        if (beatInChord === 1 && notes[1]) bassNote = notes[1]
        if (beatInChord === 2 && notes[2]) bassNote = notes[2]
        if (beatInChord === 3) {
          const rootMidi = noteToMidi(bassRoot)
          bassNote = midiToNote(rootMidi + (this.instruments.bass.type === 'walking' ? 1 : 12)) // Funk slap octava alta
        }
        Tone.Transport.schedule((time) => { this.bass.triggerAttackRelease(bassNote, '0.35', time) }, `${startBeat + beat} * 4n`)
      }
    }
  }

  scheduleDrums(startBeat, durationBeats) {
    if (!this.instruments.drums.active) return

    for (let beat = 0; beat < durationBeats; beat += 1) {
      const beatInBar = beat % 4
      const timeOffset = `${startBeat + beat} * 4n`

      if (this.instruments.drums.type === 'basic' || this.instruments.drums.type === 'shuffle') {
        if (beatInBar === 0 || beatInBar === 2) {
          Tone.Transport.schedule((time) => { this.kick.triggerAttackRelease('C1', '0.1', time) }, timeOffset)
        }
        if (beatInBar === 1 || beatInBar === 3) {
          Tone.Transport.schedule((time) => { this.snare.triggerAttack(time) }, timeOffset)
        }
        Tone.Transport.schedule((time) => { this.hihat.triggerAttack(time) }, timeOffset)
      } else if (this.instruments.drums.type === 'metronome') {
        Tone.Transport.schedule((time) => {
          const pitch = beatInBar === 0 ? 'F2' : 'C2'
          this.kick.triggerAttackRelease(pitch, '0.05', time)
        }, timeOffset)
      }
    }
  }

  scheduleStrings(chordName, startBeat, durationBeats) {
    if (!this.instruments.strings.active) return
    const notes = parseChordNotes(chordName, 4)
    if (notes.length === 0) return
    Tone.Transport.schedule((time) => {
      this.strings.triggerAttackRelease(notes, `${durationBeats} * 4n`, time)
    }, `${startBeat} * 4n`)
  }

  scheduleViolin(chordName, startBeat, durationBeats) {
    if (!this.instruments.violin.active) return
    if (this.currentMelody && this.currentMelody.length > 0) return // Si hay melodía personalizada, no tocar la tónica

    const notes = parseChordNotes(chordName, 5)
    if (notes.length === 0) return
    // Tocar la tónica de forma melódica larga
    Tone.Transport.schedule((time) => {
      this.violin.triggerAttackRelease(notes[0], `${durationBeats} * 4n`, time)
    }, `${startBeat} * 4n`)
  }

  scheduleVibraphone(chordName, startBeat, durationBeats) {
    if (!this.instruments.vibraphone.active) return
    const notes = parseChordNotes(chordName, 4)
    if (notes.length === 0) return
    
    // Arpegio invertido saltado
    for (let beat = 0; beat < durationBeats; beat += 0.5) {
      const noteIdx = Math.floor((beat / 0.5) % notes.length)
      Tone.Transport.schedule((time) => {
        this.vibraphone.triggerAttackRelease(notes[notes.length - 1 - noteIdx], '0.3', time)
      }, `${startBeat + beat} * 4n`)
    }
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
    this.bpm = Math.max(40, Math.min(300, newBpm))
    Tone.Transport.bpm.value = this.bpm
  }

  setVolume(instrument, dbVolume) {
    if (!this.instruments[instrument]) return
    this.instruments[instrument].volume = dbVolume
    this.applyVolumes()
  }

  setPatternType(instrument, type) {
    if (this.instruments[instrument]) {
      this.instruments[instrument].type = type
      if (this.isPlaying) {
        this.stop()
        this.play() // Re-schedule with new pattern
      }
    }
  }

  setInstrumentActive(instrument, active) {
    if (this.instruments[instrument]) {
      this.instruments[instrument].active = active
      if (this.isPlaying) {
        this.stop()
        this.play() // Re-schedule to include/exclude track
      }
    }
  }

  playChord(chordName, duration = 1) {
    const voicing = getGuitarVoicing(chordName)
    if (voicing.length === 0) return
    voicing.forEach((note, i) => {
      const delay = i * 0.05
      this.guitar.triggerAttackRelease(note, Math.max(0.4, duration - delay), '+' + delay)
    })
  }

  playNote(note, duration = 0.5) {
    this.guitar.triggerAttackRelease(note, duration)
  }
}

export const audioEngine = new AudioEngine()
