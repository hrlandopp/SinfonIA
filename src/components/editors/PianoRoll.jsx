import React, { useRef } from 'react'

const PITCHES = ['C5', 'B4', 'A#4', 'A4', 'G#4', 'G4', 'F#4', 'F4', 'E4', 'D#4', 'D4', 'C#4', 'C4']

const isBlackKey = (pitch) => pitch.includes('#') || pitch.includes('b')

export default function PianoRoll({
  totalBeats = 16,
  melody = [],
  onMelodyChange,
  currentBeat = 0,
  isPlaying = false,
  onPlayNote
}) {
  const keyboardScrollRef = useRef(null)
  const gridScrollRef = useRef(null)

  const handleKeyboardScroll = () => {
    if (keyboardScrollRef.current && gridScrollRef.current) {
      if (gridScrollRef.current.scrollTop !== keyboardScrollRef.current.scrollTop) {
        gridScrollRef.current.scrollTop = keyboardScrollRef.current.scrollTop
      }
    }
  }

  const handleGridScroll = () => {
    if (keyboardScrollRef.current && gridScrollRef.current) {
      if (keyboardScrollRef.current.scrollTop !== gridScrollRef.current.scrollTop) {
        keyboardScrollRef.current.scrollTop = gridScrollRef.current.scrollTop
      }
    }
  }

  const handleCellClick = (pitch, beat) => {
    // Play sound immediately for feedback
    if (onPlayNote) onPlayNote(pitch)
    
    const existingIndex = melody.findIndex(n => n.note === pitch && n.beat === beat)
    let newMelody = [...melody]
    if (existingIndex !== -1) {
      newMelody.splice(existingIndex, 1)
    } else {
      newMelody.push({ note: pitch, beat: beat, duration: '8n' })
    }
    onMelodyChange(newMelody)
  }

  const isNoteActive = (pitch, beat) => {
    return melody.some(n => n.note === pitch && n.beat === beat)
  }

  return (
    <div className="piano-roll-container" style={{
      display: 'flex',
      background: 'var(--c-surface)',
      border: '1px solid var(--c-border)',
      borderRadius: 'var(--r-md)',
      overflow: 'hidden',
      height: '320px',
      boxShadow: 'var(--shadow-card)'
    }}>
      {/* Teclado (Y-axis) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        width: '60px',
        borderRight: '1px solid var(--c-border)',
        background: 'var(--c-base)',
        zIndex: 2
      }}>
        <div style={{ height: '24px', borderBottom: '1px solid var(--c-border)', background: 'var(--c-elevated)' }} />
        <div 
          ref={keyboardScrollRef}
          onScroll={handleKeyboardScroll}
          style={{ flex: 1, overflowY: 'auto' }} 
          className="piano-scroll-sync"
        >
          {PITCHES.map((pitch, i) => (
            <div
              key={pitch}
              onClick={() => onPlayNote && onPlayNote(pitch)}
              style={{
                height: '24px',
                borderBottom: '1px solid var(--c-border-2)',
                background: isBlackKey(pitch) ? '#1e293b' : '#f8fafc',
                color: isBlackKey(pitch) ? '#cbd5e1' : '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: '6px',
                fontSize: '10px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: isBlackKey(pitch) ? 'inset 0 1px 2px rgba(0,0,0,0.2)' : 'none'
              }}
            >
              {pitch}
            </div>
          ))}
        </div>
      </div>

      {/* Grid (X-axis) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowX: 'auto', position: 'relative' }}>
        {/* Ruler */}
        <div style={{
          display: 'flex',
          height: '24px',
          background: 'var(--c-elevated)',
          borderBottom: '1px solid var(--c-border)'
        }}>
          {Array.from({ length: totalBeats }).map((_, beat) => (
            <div key={`ruler-${beat}`} style={{
              minWidth: '40px',
              flex: 1,
              borderRight: '1px solid var(--c-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: 'var(--c-text-3)',
              background: isPlaying && currentBeat === beat ? 'rgba(2, 132, 199, 0.1)' : 'transparent',
              fontWeight: isPlaying && currentBeat === beat ? 'bold' : 'normal'
            }}>
              {beat + 1}
            </div>
          ))}
        </div>

        {/* Celdas */}
        <div 
          ref={gridScrollRef}
          onScroll={handleGridScroll}
          style={{ flex: 1, overflowY: 'auto' }} 
          className="piano-scroll-sync"
        >
          <div style={{ position: 'relative' }}>
            {PITCHES.map((pitch) => (
              <div key={`row-${pitch}`} style={{ display: 'flex', height: '24px' }}>
                {Array.from({ length: totalBeats }).map((_, beat) => {
                  const active = isNoteActive(pitch, beat)
                  const isPlayhead = isPlaying && currentBeat === beat
                  
                  return (
                    <div
                      key={`cell-${pitch}-${beat}`}
                      onClick={() => handleCellClick(pitch, beat)}
                      style={{
                        minWidth: '40px',
                        flex: 1,
                        borderRight: beat % 4 === 3 ? '1px solid var(--c-border-2)' : '1px solid var(--c-border)',
                        borderBottom: '1px solid var(--c-border)',
                        background: isPlayhead ? 'rgba(2, 132, 199, 0.05)' : isBlackKey(pitch) ? 'rgba(0,0,0,0.02)' : 'transparent',
                        cursor: 'pointer',
                        position: 'relative'
                      }}
                    >
                      {active && (
                        <div style={{
                          position: 'absolute',
                          top: '2px',
                          bottom: '2px',
                          left: '1px',
                          right: '1px',
                          background: 'var(--teal)',
                          borderRadius: '2px',
                          boxShadow: '0 0 4px rgba(2, 132, 199, 0.5)',
                          border: '1px solid rgba(255,255,255,0.2)'
                        }} />
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
            
            {/* Línea de reproducción (Playhead) */}
            {isPlaying && (
              <div style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `calc((${currentBeat} / ${totalBeats}) * 100%)`,
                width: '2px',
                background: 'var(--teal)',
                boxShadow: '0 0 6px var(--teal)',
                zIndex: 10,
                pointerEvents: 'none',
                transition: 'left 0.1s linear'
              }} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
