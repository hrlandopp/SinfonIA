import React from 'react';

const TRACKS = ['GUITAR', 'PIANO', 'BASS', 'STRINGS'];

const TracksPanel = React.memo(({ masterJson, uiFocus, updateUIFocus }) => {
  const sections = masterJson?.sectionsData || [];
  
  // Calcular los compases (beats) totales para distribuir los anchos
  let totalBeats = 0;
  const sectionsWithBeats = sections.map(sec => {
    const secBeats = sec.chords?.reduce((acc, curr) => acc + (curr.beats || 4), 0) || 16;
    totalBeats += secBeats;
    return { ...sec, secBeats };
  });

  return (
    <div style={{
      width: '100%',
      backgroundColor: 'var(--c-bg)',
      display: 'flex',
      flexDirection: 'column',
      borderBottom: '1px solid var(--c-border)'
    }}>
      {/* CABECERA SUPERIOR (Timeline Ruler) */}
      <div style={{
        display: 'flex',
        height: '32px',
        backgroundColor: '#222226',
        borderBottom: '1px solid var(--c-border)'
      }}>
        <div style={{
          width: '200px',
          borderRight: '1px solid var(--c-border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          fontSize: '10px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--c-text-3)'
        }}>
          TRACK_NAME
        </div>
        
        <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
          {sectionsWithBeats.map((sec, idx) => {
            const flexBasis = totalBeats > 0 ? `${(sec.secBeats / totalBeats) * 100}%` : 'auto';
            return (
              <div key={sec.id || idx} style={{
                flexBasis,
                borderRight: '1px solid #2a2a30',
                display: 'flex',
                alignItems: 'center',
                padding: '0 8px',
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--c-text-2)'
              }}>
                {sec.name ? sec.name.toUpperCase() : `SECTION_${idx + 1}`} ({sec.secBeats}B)
              </div>
            );
          })}
        </div>
      </div>

      {/* FILAS DE PISTAS (Track Lanes) */}
      {TRACKS.map(track => {
        const isSelected = uiFocus?.selectedInstrument?.toLowerCase() === track.toLowerCase();
        
        return (
          <div key={track} style={{
            display: 'flex',
            height: '64px',
            borderBottom: '1px solid var(--c-border)',
            backgroundColor: isSelected ? 'var(--c-base)' : '#1a1a1e'
          }}>
            {/* Bloque Izquierdo (Track Header) */}
            <div 
              onClick={() => updateUIFocus({ selectedInstrument: track.toLowerCase() })}
              style={{
                width: '200px',
                borderRight: '1px solid var(--c-border)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                cursor: 'pointer',
                position: 'relative',
                backgroundColor: isSelected ? 'var(--c-elevated)' : 'transparent'
              }}
            >
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '3px',
                  backgroundColor: 'var(--c-accent)'
                }} />
              )}
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: isSelected ? 'var(--c-text-1)' : 'var(--c-text-2)',
                letterSpacing: '0.05em'
              }}>
                {track}
              </span>
            </div>
            
            {/* Bloque Derecho (Grid Timeline) */}
            <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
              {sectionsWithBeats.map((sec, idx) => {
                const flexBasis = totalBeats > 0 ? `${(sec.secBeats / totalBeats) * 100}%` : 'auto';
                return (
                  <div key={`${track}-${sec.id || idx}`} style={{
                    flexBasis,
                    borderRight: '1px solid #2a2a30',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px'
                  }}>
                    <div style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: '1px solid #2a2a30'
                    }} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default TracksPanel;
