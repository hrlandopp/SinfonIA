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

class AudioEngine {
  constructor() {
    this.isPlaying = false
    this.bpm = 120
    
    // 1. Piano PolySynth
    this.piano = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.05,
        decay: 0.1,
        sustain: 0.8,
        release: 1.5
      }
    }).toDestination()
    this.piano.volume.value = -8

    // 2. Guitar Synth
    this.guitar = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.005,
        decay: 0.4,
        sustain: 0.1,
        release: 0.8
      }
    }).toDestination()
    this.guitar.volume.value = -12

    // 3. Bajo Synth
    this.bass = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      filter: {
        Q: 1,
        type: 'lowpass',
        frequency: 200
      },
      envelope: {
        attack: 0.02,
        decay: 0.2,
        sustain: 0.5,
        release: 0.8
      }
    }).toDestination()
    this.bass.volume.value = -10

    // 4. Batería (Membrane y Metal)
    this.kick = new Tone.MembraneSynth().toDestination()
    this.kick.volume.value = -6
    
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

    this.currentChords = []
    this.currentBeat = 0
    this.chordIndex = 0
    
    this.instruments = {
      piano: { active: true, volume: -8, type: 'arpeggio' },
      guitar: { active: false, volume: -12, type: 'strum' },
      bass: { active: true, volume: -10, type: 'roots' },
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

      if (isQuarterBeat && this.onBeatCallback) {
        this.onBeatCallback(Math.floor(this.currentBeat), this.chordIndex, targetChord)
      }

      this.currentBeat += 0.5
    }, '8n')
  }

  triggerAccompaniment(chordName, subBeat, time) {
    const notes = parseChordNotes(chordName, 3)
    const bassRoot = parseChordNotes(chordName, 2)[0]
    
    if (notes.length === 0) return

    // Piano
    if (this.instruments.piano.active) {
      const type = this.instruments.piano.type
      if (type === 'chord' && subBeat === 0) {
        this.piano.triggerAttackRelease(notes, '2n', time)
      } else if (type === 'arpeggio') {
        const noteIndex = subBeat % notes.length
        this.piano.triggerAttackRelease(notes[noteIndex], '8n', time)
      }
    }

    // Guitar
    if (this.instruments.guitar.active) {
      if (subBeat === 0 || subBeat === 4) {
        notes.forEach((note, i) => {
          this.guitar.triggerAttackRelease(note, '4n', time + (i * 0.02))
        })
      }
    }

    // Bass
    if (this.instruments.bass.active && bassRoot) {
      const type = this.instruments.bass.type
      if (type === 'roots' && (subBeat === 0 || subBeat === 4)) {
        this.bass.triggerAttackRelease(bassRoot, '4n', time)
      } else if (type === 'walking') {
        if (subBeat % 2 === 0) {
          const beatIndex = subBeat / 2
          let bassNote = bassRoot
          
          if (beatIndex === 1 && notes[1]) bassNote = notes[1]
          if (beatIndex === 2 && notes[2]) bassNote = notes[2]
          if (beatIndex === 3) {
            const rootNum = Tone.Frequency(bassRoot).toMidi()
            bassNote = Tone.Frequency(rootNum - 1, 'midi').toNote()
          }
          this.bass.triggerAttackRelease(bassNote, '8n', time)
        }
      }
    }

    // Drums
    if (this.instruments.drums.active) {
      const type = this.instruments.drums.type
      if (type === 'basic') {
        if (subBeat === 0 || subBeat === 4) {
          this.kick.triggerAttackRelease('C1', '8n', time)
        }
        if (subBeat === 2 || subBeat === 6) {
          this.snare.triggerAttack(time)
        }
        this.hihat.triggerAttack(time)
      } else if (type === 'metronome') {
        if (subBeat % 2 === 0) {
          const beatIndex = subBeat / 2
          this.kick.triggerAttackRelease(beatIndex === 0 ? 'G2' : 'C2', '16n', time)
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
      if (this[instrument]) {
        this[instrument].volume.value = dbVolume
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
