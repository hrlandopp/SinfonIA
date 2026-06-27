import React from 'react'

const CHORD_DATA = {
  'C': { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  'Cmaj7': { frets: [-1, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0] },
  'C7': { frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0] },
  'Cadd9': { frets: [-1, 3, 2, 0, 3, 0], fingers: [0, 2, 1, 0, 3, 0] },
  'Cm': { frets: [-1, 3, 5, 5, 4, 3], fingers: [0, 1, 3, 4, 2, 1], baseFret: 3 },
  'Am': { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
  'Am7': { frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0] },
  'A': { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
  'A7': { frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 1, 0, 2, 0] },
  'G': { frets: [3, 2, 0, 0, 0, 3], fingers: [3, 2, 0, 0, 0, 4] },
  'G7': { frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1] },
  'Gsus4': { frets: [3, -1, 0, 0, 1, 3], fingers: [3, 0, 0, 0, 1, 4] },
  'Gm': { frets: [3, 5, 5, 3, 3, 3], fingers: [1, 3, 4, 1, 1, 1], baseFret: 3 },
  'F': { frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1] },
  'Fmaj7': { frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0] },
  'F7': { frets: [1, 3, 1, 2, 1, 1], fingers: [1, 3, 1, 2, 1, 1] },
  'Fm': { frets: [1, 3, 3, 1, 1, 1], fingers: [1, 3, 4, 1, 1, 1] },
  'Dm': { frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
  'Dm7': { frets: [-1, -1, 0, 2, 1, 1], fingers: [0, 0, 0, 2, 1, 1] },
  'D': { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  'D7': { frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3] },
  'Em': { frets: [0, 2, 2, 0, 0, 0], fingers: [0, 1, 2, 0, 0, 0] },
  'Em7': { frets: [0, 2, 0, 0, 0, 0], fingers: [0, 1, 0, 0, 0, 0] },
  'E': { frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
  'E7': { frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0] },
  'Bm': { frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1], baseFret: 2 },
  'Bm7': { frets: [-1, 2, 4, 2, 3, 2], fingers: [0, 1, 3, 1, 2, 1], baseFret: 2 },
  'B': { frets: [-1, 2, 4, 4, 4, 2], fingers: [0, 1, 2, 3, 4, 1], baseFret: 2 },
  'Bb': { frets: [-1, 1, 3, 3, 3, 1], fingers: [0, 1, 2, 3, 4, 1], baseFret: 1 },
  'F#m': { frets: [2, 4, 4, 2, 2, 2], fingers: [1, 3, 4, 1, 1, 1], baseFret: 2 },
  'F#': { frets: [2, 4, 4, 3, 2, 2], fingers: [1, 3, 4, 2, 1, 1], baseFret: 2 },
  'C#m': { frets: [-1, 4, 6, 6, 5, 4], fingers: [0, 1, 3, 4, 2, 1], baseFret: 4 },
  'Eb': { frets: [-1, 6, 8, 8, 8, 6], fingers: [0, 1, 2, 3, 4, 1], baseFret: 6 },
  'Ab': { frets: [4, 6, 6, 5, 4, 4], fingers: [1, 3, 4, 2, 1, 1], baseFret: 4 }
}

export default function GuitarChordDiagram({ chordName }) {
  if (!chordName) return null

  const data = CHORD_DATA[chordName]
  if (!data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl p-4 text-[10px] text-zinc-500 font-mono text-center">
        Diagrama no<br/>disponible
      </div>
    )
  }

  const baseFret = data.baseFret || 1
  const strings = [0, 1, 2, 3, 4, 5]
  const frets = [0, 1, 2, 3, 4]
  
  const width = 120
  const height = 150
  const marginX = 25
  const marginY = 40
  const stringSpacing = (width - marginX * 2) / 5
  const fretSpacing = (height - marginY - 20) / 4

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Título del acorde */}
        <text x={width / 2} y={15} fontSize="14" fontWeight="bold" fill="#e4e4e7" textAnchor="middle">
          {chordName}
        </text>

        {/* Traste Base o Cejilla de la guitarra (Nut) */}
        {baseFret === 1 ? (
          <line x1={marginX} y1={marginY} x2={width - marginX} y2={marginY} stroke="#e4e4e7" strokeWidth="4" />
        ) : (
          <text x={marginX - 15} y={marginY + 12} fontSize="11" fill="#71717a" textAnchor="middle" fontWeight="bold">
            {baseFret}
          </text>
        )}

        {/* Cuerdas (Líneas verticales) */}
        {strings.map(i => (
          <line key={`string-${i}`} x1={marginX + i * stringSpacing} y1={marginY} x2={marginX + i * stringSpacing} y2={height - 20} stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
        ))}

        {/* Trastes (Líneas horizontales) */}
        {frets.map(i => (
          <line key={`fret-${i}`} x1={marginX} y1={marginY + i * fretSpacing} x2={width - marginX} y2={marginY + i * fretSpacing} stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
        ))}

        {/* Indicadores X y O (Cuerdas abiertas o silenciadas) */}
        {data.frets.map((fret, stringIdx) => {
          const x = marginX + stringIdx * stringSpacing
          const y = marginY - 10
          if (fret === -1) {
            return (
              <text key={`x-${stringIdx}`} x={x} y={y} fontSize="10" fill="#ef4444" textAnchor="middle" fontWeight="bold">X</text>
            )
          } else if (fret === 0) {
            return (
              <circle key={`o-${stringIdx}`} cx={x} cy={y - 3} r="3" fill="transparent" stroke="#10b981" strokeWidth="1.5" />
            )
          }
          return null
        })}

        {/* Dedos (Puntos en los trastes) */}
        {data.frets.map((fret, stringIdx) => {
          if (fret <= 0) return null
          
          const relativeFret = fret - baseFret + 1
          if (relativeFret < 1 || relativeFret > 4) return null
          
          const x = marginX + stringIdx * stringSpacing
          const y = marginY + (relativeFret - 0.5) * fretSpacing
          const finger = data.fingers[stringIdx]

          return (
            <g key={`dot-${stringIdx}`}>
              <circle cx={x} cy={y} r="6" fill="#10b981" />
              {finger > 0 && (
                <text x={x} y={y + 3} fontSize="8" fill="#09090b" textAnchor="middle" fontWeight="bold">{finger}</text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
