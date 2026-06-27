import React from 'react'

const STANDARD_TUNING = [64, 59, 55, 50, 45, 40]
const STRING_NAMES = ['E', 'B', 'G', 'D', 'A', 'E']

const midiToNoteName = (midiNumber) => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  return notes[midiNumber % 12]
}

const midiToScientificPitch = (midiNumber) => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octave = Math.floor(midiNumber / 12) - 1;
  return `${notes[midiNumber % 12]}${octave}`
}

const SCALES = {
  'Mayor': [0, 2, 4, 5, 7, 9, 11],
  'Menor': [0, 2, 3, 5, 7, 8, 10],
  'Pentatónica Mayor': [0, 2, 4, 7, 9],
  'Pentatónica Menor': [0, 3, 5, 7, 10]
}

const parseKeySignature = (keySig) => {
  if (!keySig) return { root: 'C', scaleType: 'Mayor' }
  let root = keySig
  let scaleType = 'Mayor'
  
  if (keySig.endsWith('m')) {
    root = keySig.slice(0, -1)
    scaleType = 'Menor'
  } else if (keySig.endsWith('min')) {
    root = keySig.slice(0, -3)
    scaleType = 'Menor'
  }
  return { root, scaleType }
}

export default function Fretboard({ 
  keySignature = 'C', 
  activeChordLabel = '', // Para visualización
  activeNotes = [],      // ¡NUEVO! Array dinámico de notas crudas (ej. ['E3', 'G3', 'C4'])
  capoPosition = 0, 
  onPlayNote,
  currentBeat = 0,
  isPlaying = false
}) {
  const numFrets = 15
  const { root: scaleRoot, scaleType } = parseKeySignature(keySignature)
  const scaleIntervals = SCALES[scaleType] || SCALES['Mayor']
  
  const getScaleNotes = () => {
    const notesList = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const rootIndex = notesList.indexOf(scaleRoot)
    if (rootIndex === -1) return []
    return scaleIntervals.map(interval => notesList[(rootIndex + interval) % 12])
  }
  
  const scaleNotes = getScaleNotes()
  
  const isFretMarker = (fret) => [3, 5, 7, 9, 15].includes(fret)
  const isDoubleFretMarker = (fret) => fret === 12

  const getNoteInfo = (stringIndex, fret) => {
    const baseMidi = STANDARD_TUNING[stringIndex]
    
    if (fret < capoPosition && fret !== 0) {
      return { noteName: '', midiVal: 0, isPlayable: false }
    }
    
    const effectiveFret = fret === 0 ? capoPosition : fret
    const midiVal = baseMidi + effectiveFret
    const noteName = midiToNoteName(midiVal)
    const scientificPitch = midiToScientificPitch(midiVal)
    
    const isRoot = noteName === scaleRoot
    const isScaleNote = scaleNotes.includes(noteName)
    // Se ilumina si la nota exacta (ej 'E4') o la nota genérica (ej 'E') están en el array
    const isActiveNote = activeNotes.includes(scientificPitch) || activeNotes.includes(noteName)
    
    return {
      noteName,
      scientificPitch,
      midiVal,
      isPlayable: true,
      isRoot,
      isScaleNote,
      isActiveNote
    }
  }

  return (
    <section className="flex flex-col gap-4 flex-1">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] text-zinc-400 font-mono">
            Tonalidad: <strong className="text-zinc-200">{keySignature}</strong> ({scaleType})
            {capoPosition > 0 && ` | Capo en traste ${capoPosition}`}
            {activeChordLabel && ` | Acorde: `}
            {activeChordLabel && <strong className={isPlaying ? 'text-emerald-400' : 'text-zinc-200'}>{activeChordLabel}</strong>}
          </p>
          {isPlaying && (
            <div className="mt-1 text-[10px] flex items-center gap-2 text-emerald-400 font-mono">
              <span className="animate-pulse">●</span>
              Beat: {Math.floor(currentBeat)}
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-500">
            <span className="w-2 h-2 rounded-full bg-zinc-200"></span>
            <span>Tónica ({scaleRoot})</span>
          </div>
          <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Nota Activa</span>
          </div>
          <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-500">
            <span className="w-2 h-2 rounded-full border border-zinc-600 bg-white/5"></span>
            <span>Escala</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto pb-4 w-full scrollbar-thin scrollbar-thumb-zinc-700">
        <div className="relative flex flex-col bg-zinc-950 py-3 rounded-lg border border-white/5 shadow-inner min-w-[800px]">
          
          {/* Indicador visual de progreso */}
          {isPlaying && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-transparent opacity-60 z-10 animate-pulse" />
          )}
          
          {capoPosition > 0 && (
            <div 
              className="absolute top-0 bottom-0 bg-zinc-700/80 w-4 rounded-sm border border-zinc-500 z-10 shadow-[0_0_10px_rgba(0,0,0,0.5)]" 
              style={{ left: `calc(${(capoPosition / (numFrets + 1)) * 100}% + 20px)` }}
              title={`Capo en traste ${capoPosition}`}
            />
          )}

          {STANDARD_TUNING.map((stringMidi, stringIdx) => (
            <div 
              key={stringIdx} 
              className="flex items-center relative h-[36px] border-b border-white/5"
            >
              {/* String background line */}
              <div className="absolute left-[30px] right-0 h-[2px] bg-zinc-800 pointer-events-none z-0" 
                style={{ top: '50%', transform: 'translateY(-50%)', height: `${1 + (5-stringIdx)*0.5}px` }} 
              />
              
              {/* String Name */}
              <div className="w-[30px] text-[10px] font-bold text-zinc-500 text-center z-10 bg-zinc-950">
                {midiToNoteName(stringMidi + capoPosition)}
                <span className="text-[8px] block opacity-50">({STRING_NAMES[stringIdx]})</span>
              </div>

              {/* Frets */}
              {Array.from({ length: numFrets + 1 }).map((_, fretIdx) => {
                const noteInfo = getNoteInfo(stringIdx, fretIdx)
                const isMarker = stringIdx === 2 && isFretMarker(fretIdx)
                const isDoubleMarker = stringIdx === 2 && isDoubleFretMarker(fretIdx)
                
                return (
                  <div 
                    key={fretIdx} 
                    className="flex-1 min-w-[45px] h-full border-r border-white/10 flex items-center justify-center relative z-10"
                    onClick={() => noteInfo.isPlayable && onPlayNote && onPlayNote(noteInfo.noteName, noteInfo.midiVal)}
                  >
                    {/* Fret Markers */}
                    {isMarker && (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/10 pointer-events-none -z-10" />
                    )}
                    {isDoubleMarker && (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/10 pointer-events-none -z-10 shadow-[0_-15px_0_0_rgba(255,255,255,0.1),0_15px_0_0_rgba(255,255,255,0.1)]" />
                    )}
                    
                    {/* Note Dots */}
                    {noteInfo.isPlayable && (noteInfo.isScaleNote || noteInfo.isActiveNote) && (
                      <button 
                        className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer transition-all ${
                          noteInfo.isRoot ? 'bg-zinc-200 text-zinc-900 shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 
                          noteInfo.isActiveNote ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.8)]' : 
                          'bg-white/10 text-white/80 hover:bg-white/30 hover:text-white'
                        }`}
                        title={`${noteInfo.scientificPitch} (Traste ${fretIdx})`}
                      >
                        {noteInfo.noteName}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
