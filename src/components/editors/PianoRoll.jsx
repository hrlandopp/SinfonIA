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
    <div className="flex w-full h-full bg-black/50 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl relative">
      {/* Teclado (Y-axis) */}
      <div className="flex flex-col w-[60px] border-r border-white/10 bg-black/60 z-10">
        <div className="h-[24px] border-b border-white/10 bg-white/5" />
        <div 
          ref={keyboardScrollRef}
          onScroll={handleKeyboardScroll}
          className="flex-1 overflow-y-auto scrollbar-none"
        >
          {PITCHES.map((pitch) => {
            const blackKey = isBlackKey(pitch);
            return (
              <div
                key={pitch}
                onClick={() => onPlayNote && onPlayNote(pitch)}
                className={`h-[24px] border-b border-white/5 flex items-center justify-end px-2 text-[10px] font-bold cursor-pointer transition-colors ${
                  blackKey ? 'bg-zinc-950 text-zinc-500 shadow-inner' : 'bg-zinc-200 text-zinc-900 hover:bg-white'
                }`}
              >
                {pitch}
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid (X-axis) */}
      <div className="flex-1 flex flex-col overflow-x-auto relative">
        {/* Ruler */}
        <div className="flex h-[24px] bg-white/5 border-b border-white/10">
          {Array.from({ length: totalBeats }).map((_, beat) => {
            const isBarStart = beat % 4 === 0;
            const isPlayhead = isPlaying && currentBeat === beat;
            return (
              <div key={`ruler-${beat}`} className={`min-w-[40px] flex-1 border-r flex items-center justify-center text-[10px] ${
                isBarStart ? 'border-white/20 text-zinc-400 font-bold' : 'border-white/5 text-zinc-600'
              } ${isPlayhead ? 'bg-emerald-500/20 text-emerald-400' : ''}`}>
                {isBarStart ? (beat / 4) + 1 : '.'}
              </div>
            );
          })}
        </div>

        {/* Celdas */}
        <div 
          ref={gridScrollRef}
          onScroll={handleGridScroll}
          className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 relative"
        >
          <div className="relative">
            {PITCHES.map((pitch) => (
              <div key={`row-${pitch}`} className="flex h-[24px]">
                {Array.from({ length: totalBeats }).map((_, beat) => {
                  const active = isNoteActive(pitch, beat);
                  const isPlayhead = isPlaying && currentBeat === beat;
                  const isBarStart = beat % 4 === 0;
                  const blackKey = isBlackKey(pitch);
                  
                  return (
                    <div
                      key={`cell-${pitch}-${beat}`}
                      onClick={() => handleCellClick(pitch, beat)}
                      className={`min-w-[40px] flex-1 border-b border-white/5 border-r cursor-pointer relative transition-colors ${
                        isBarStart ? 'border-r-white/20' : 'border-r-white/5'
                      } ${isPlayhead ? 'bg-emerald-500/10' : blackKey ? 'bg-black/20' : 'bg-transparent'} hover:bg-emerald-500/20`}
                    >
                      {active && (
                        <div className="absolute top-[2px] bottom-[2px] left-[1px] right-[1px] bg-emerald-500/80 rounded-[2px] border border-emerald-300/50 shadow-[0_0_8px_rgba(16,185,129,0.4)] transition-all" />
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
            
            {/* Línea de reproducción (Playhead) */}
            {isPlaying && (
              <div className="absolute top-0 bottom-0 w-[2px] bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)] z-10 pointer-events-none transition-all duration-100 ease-linear"
                style={{ left: `calc((${currentBeat} / ${totalBeats}) * 100%)` }} 
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
