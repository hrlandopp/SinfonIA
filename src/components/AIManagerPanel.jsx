import React from 'react';

const AIManagerPanel = React.memo(({ uiFocusContext, mascotAlert }) => {
  return (
    <aside style={{
      width: '280px',
      backgroundColor: 'var(--c-base)',
      borderRight: '1px solid var(--c-border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px',
      gap: '16px',
      overflowY: 'auto'
    }}>
      <div style={{
        fontSize: '11px',
        fontWeight: '600',
        color: 'var(--c-text-2)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        borderBottom: '1px solid var(--c-border)',
        paddingBottom: '8px'
      }}>
        AI Management Console
      </div>

      <div style={{
        backgroundColor: 'var(--c-surface)',
        border: '1px solid var(--c-border)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ fontSize: '10px', color: 'var(--c-text-3)', textTransform: 'uppercase' }}>Focus Properties</div>
        <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Instrument:</span> <span style={{ color: 'var(--c-text-1)' }}>{uiFocusContext?.selectedInstrument || 'NONE'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span>Section ID:</span> <span style={{ color: 'var(--c-text-1)' }}>{uiFocusContext?.selectedSectionId || 'NONE'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span>Beat:</span> <span style={{ color: 'var(--c-text-1)' }}>{uiFocusContext?.currentBeat || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span>Last Action:</span> <span style={{ color: 'var(--c-text-1)' }}>{uiFocusContext?.lastUserAction || 'NONE'}</span>
          </div>
        </div>
      </div>

      <div style={{
        backgroundColor: 'var(--c-surface)',
        border: '1px solid var(--c-border)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ fontSize: '10px', color: 'var(--c-text-3)', textTransform: 'uppercase' }}>Contextual Harmonic Analyzer</div>
        {mascotAlert ? (
          <div style={{ fontSize: '12px', color: 'var(--c-warn)', lineHeight: '1.4' }}>
            [WARNING] {mascotAlert.message}
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: 'var(--c-ok)', fontFamily: 'var(--font-mono)' }}>
            [STATUS] HARMONIC SYNC OK
          </div>
        )}
      </div>

    </aside>
  );
});

export default AIManagerPanel;
