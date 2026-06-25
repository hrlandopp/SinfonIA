import React from 'react'
import { parseChordNotes } from '../utils/musicTheory'

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
    <section className="glass-panel fretboard-panel" id="fretboard-section">
      <div className="fretboard-header">
        <div>
          <h2 style={{ fontSize: '1.25rem' }}>Visualizador del Diapasón</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Tonalidad: <strong style={{ color: 'var(--text-primary)' }}>{keySignature}</strong> ({scaleType})
            {capoPosition > 0 && ` | Capo en traste ${capoPosition}`}
            {activeChordLabel && ` | Acorde actual: `}
            {activeChordLabel && <strong style={{ color: isPlaying ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>{activeChordLabel}</strong>}
          </p>
          {isPlaying && (
            <div style={{ 
              marginTop: '0.5rem', 
              fontSize: '0.75rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              color: 'var(--accent-cyan)'
            }}>
              <span style={{ animation: 'pulse 0.5s infinite', display: 'inline-block' }}>●</span>
              En reproducción - Beat: {Math.floor(currentBeat)}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-rose)' }}></span>
            <span>Tónica ({scaleRoot})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)' }}></span>
            <span>Nota Activa</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.85)', border: '1px solid var(--accent-indigo)' }}></span>
            <span>Escala</span>
          </div>
        </div>
      </div>

      <div className="fretboard-scroll-container" style={{ overflowX: 'auto', paddingBottom: '16px', width: '100%' }}>
        <div className="fretboard-neck" style={{ position: 'relative', display: 'flex', flexDirection: 'column', background: '#1a1a1a', padding: '12px 0', borderRadius: '8px', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)', minWidth: '800px' }}>
          
          {/* Indicador visual de progreso (solo si está reproduciendo) */}
          {isPlaying && (
            <div 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: 'linear-gradient(to right, var(--accent-cyan), transparent)',
                opacity: 0.6,
                zIndex: 10,
                animation: 'pulse-fade 0.5s ease-in-out'
              }}
            />
          )}
          
          {capoPosition > 0 && (
            <div 
              className="capo-overlay-bar" 
              style={{ 
                left: `calc(${(capoPosition / (numFrets + 1)) * 100}% + 20px)` 
              }}
              title={`Capo en traste ${capoPosition}`}
            />
          )}

          {STANDARD_TUNING.map((stringMidi, stringIdx) => (
            <div 
              key={stringIdx} 
              className={`fretboard-string string-${stringIdx}`}
              style={{ display: 'flex', alignItems: 'center', position: 'relative', height: '36px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div 
                style={{ 
                  width: '30px', 
                  fontSize: '0.75rem', 
                  fontWeight: 'bold', 
                  color: 'var(--text-secondary)',
                  textAlign: 'center',
                  zIndex: 5 
                }}
              >
                {midiToNoteName(stringMidi + capoPosition)}
                <span style={{ fontSize: '0.6rem', display: 'block', opacity: 0.5 }}>({STRING_NAMES[stringIdx]})</span>
              </div>

              {Array.from({ length: numFrets + 1 }).map((_, fretIdx) => {
                const noteInfo = getNoteInfo(stringIdx, fretIdx)
                const isMarker = stringIdx === 2 && isFretMarker(fretIdx)
                const isDoubleMarker = stringIdx === 2 && isDoubleFretMarker(fretIdx)
                
                return (
                  <div 
                    key={fretIdx} 
                    className={`fretboard-fret fret-${fretIdx} ${isMarker ? 'fret-marker' : ''} ${isDoubleMarker ? 'fret-marker-double' : ''}`}
                    style={{ flex: 1, minWidth: '45px', height: '100%', borderRight: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
                    onClick={() => noteInfo.isPlayable && onPlayNote && onPlayNote(noteInfo.noteName, noteInfo.midiVal)}
                  >
                    {noteInfo.isPlayable && (noteInfo.isScaleNote || noteInfo.isActiveNote) && (
                      <button 
                        className={`fret-note-node ${
                          noteInfo.isRoot ? 'fret-note-root' : 
                          noteInfo.isActiveNote ? 'fret-note-chord' : 
                          'fret-note-scale'
                        }`}
                        style={{ width:'22px', height:'22px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', zIndex:10, cursor:'pointer', border:'none', fontWeight:'bold', color: '#fff', background: noteInfo.isRoot ? 'var(--accent-rose)' : noteInfo.isActiveNote ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.15)' }}
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
