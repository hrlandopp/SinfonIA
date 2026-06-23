export const NOTE_SEMITONES = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
}

export const ALL_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

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

export const semitoneToNote = (semitone, octave) => {
  const index = ((semitone % 12) + 12) % 12
  const extraOctave = Math.floor(semitone / 12)
  return `${ALL_NOTES[index]}${octave + extraOctave}`
}

export const GUITAR_VOICINGS = {
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
