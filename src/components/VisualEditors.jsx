import React from 'react';

const FretboardMatrix = ({ instrument, playFretNote }) => {
  const isBass = instrument === 'bass';
  const strings = isBass ? ['G', 'D', 'A', 'E'] : ['E', 'B', 'G', 'D', 'A', 'E_LOW'];
  const frets = 16;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#16161a' }}>
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #2a2a30', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--c-text-3)', letterSpacing: '0.05em' }}>
        [VISUAL_EDITOR_MATRIX] :: {instrument.toUpperCase()}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', gap: '8px', overflowY: 'auto' }}>
        {strings.map((str) => (
          <div key={str} style={{ display: 'flex', height: '24px', alignItems: 'center' }}>
            <div style={{ width: '40px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--c-text-2)' }}>
              {str.replace('_LOW', '')}
            </div>
            <div style={{ flex: 1, display: 'flex', border: '1px solid #2a2a30', backgroundColor: '#222226' }}>
              {Array.from({ length: frets }).map((_, fIdx) => (
                <div 
                  key={fIdx}
                  onClick={() => playFretNote(`${str.replace('_LOW','')}${isBass ? 2 : 3}`, 60)} 
                  style={{
                    flex: 1,
                    borderRight: fIdx < frets - 1 ? '1px solid #2a2a30' : 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0s'
                  }}
                  onMouseDown={e => e.currentTarget.style.backgroundColor = '#3b82f6'}
                  onMouseUp={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '4px 16px', borderTop: '1px solid #2a2a30', fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--c-text-3)' }}>
        [TRIGGER_NOTE_EVENT] READY
      </div>
    </div>
  );
};

const PianoRollMatrix = ({ instrument, playFretNote }) => {
  const keys = ['C4', 'B3', 'A#3', 'A3', 'G#3', 'G3', 'F#3', 'F3', 'E3', 'D#3', 'D3', 'C#3', 'C3'];
  const isBlack = (k) => k.includes('#');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#16161a' }}>
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #2a2a30', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--c-text-3)', letterSpacing: '0.05em' }}>
        [PITCH_REGISTRY] :: {instrument.toUpperCase()}
      </div>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Teclado vertical */}
        <div style={{ width: '60px', borderRight: '1px solid #2a2a30', display: 'flex', flexDirection: 'column' }}>
          {keys.map(k => (
            <div 
              key={k}
              onClick={() => playFretNote(k, 60)}
              style={{
                flex: 1,
                backgroundColor: isBlack(k) ? '#121214' : '#e4e4e7',
                borderBottom: '1px solid #2a2a30',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: '4px',
                transition: 'background-color 0s'
              }}
              onMouseDown={e => e.currentTarget.style.backgroundColor = '#3b82f6'}
              onMouseUp={e => e.currentTarget.style.backgroundColor = isBlack(k) ? '#121214' : '#e4e4e7'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = isBlack(k) ? '#121214' : '#e4e4e7'}
            >
              <span style={{ fontSize: '8px', fontFamily: 'var(--font-mono)', color: isBlack(k) ? '#fff' : '#000' }}>{k}</span>
            </div>
          ))}
        </div>
        {/* Carriles rítmicos */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowX: 'auto', backgroundColor: '#16161a' }}>
          {keys.map(k => (
            <div key={k} style={{ flex: 1, borderBottom: '1px solid #2a2a30', display: 'flex' }}>
              {Array.from({ length: 32 }).map((_, i) => (
                <div key={i} style={{ minWidth: '32px', borderRight: '1px solid #2a2a30' }} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: '4px 16px', borderTop: '1px solid #2a2a30', fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--c-text-3)' }}>
        [TRIGGER_NOTE_EVENT] READY
      </div>
    </div>
  );
};

const VisualEditors = React.memo(({ uiFocus, playFretNote }) => {
  const instrument = (uiFocus?.selectedInstrument || 'guitar').toLowerCase();

  if (instrument === 'piano' || instrument === 'strings' || instrument === 'vibraphone') {
    return <PianoRollMatrix instrument={instrument} playFretNote={playFretNote} />;
  }

  return <FretboardMatrix instrument={instrument} playFretNote={playFretNote} />;
});

export default VisualEditors;
