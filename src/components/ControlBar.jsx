import React from 'react';
import { Play, Pause, Square, Download, Undo2, Redo2 } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import { useUIStore } from '../store/useUIStore';
import { usePlaybackControls } from '../context/PlaybackContext';
import { exportProjectToMIDI } from '../utils/exportUtils';

const ControlBar = () => {
  const { project, masterJson } = useProjectStore();
  const { undo, redo, pastStates, futureStates } = useProjectStore.temporal(state => state);
  
  const { uiFocusContext, updateUIFocus } = useUIStore();
  const { isPlaying, setIsPlaying, playNote } = usePlaybackControls();
  const activeTab = uiFocusContext?.activeTab || 'editor';

  const handlePlayToggle = () => setIsPlaying(!isPlaying);
  const handleStop = () => setIsPlaying(false);

  const handleExportMidi = () => {
    if (!masterJson || (!masterJson.sectionsData && !masterJson.tracks)) {
      alert("No hay secuencias generadas para exportar.");
      return;
    }
    const success = exportProjectToMIDI(masterJson);
    if (!success) {
      alert("Ocurrió un error al exportar la pista MIDI. Revisa la consola.");
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '60px',
      padding: '0 24px',
      backgroundColor: 'var(--c-base)',
      borderBottom: '1px solid var(--c-border)',
      color: 'var(--c-text-1)',
      fontFamily: 'var(--font-ui)'
    }}>
      {/* Metadata Section */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', fontFamily: 'var(--font-head)' }}>
          {project?.name || 'SinfonIA Pro'}
        </div>
        <div style={{ display: 'flex', gap: '16px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--c-text-2)', alignItems: 'center' }}>
          <div>BPM: <span style={{ color: 'var(--c-text-1)' }}>{project?.tempo_bpm || 120}</span></div>
          <div>KEY: <span style={{ color: 'var(--c-text-1)' }}>{project?.key_signature || 'C'}</span></div>
          <button 
            onClick={handleExportMidi}
            title="Exportar a MIDI"
            style={{
              background: 'transparent',
              border: '1px solid var(--c-border-focus)',
              color: 'var(--c-text-1)',
              padding: '4px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '4px'
            }}
          >
            <Download size={12} /> <span style={{ fontSize: '10px', textTransform: 'uppercase' }}>MIDI</span>
          </button>
        </div>
      </div>

      {/* Transport Controls & History */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button 
          onClick={() => undo()}
          disabled={pastStates.length === 0}
          title="Deshacer"
          style={{
            background: 'transparent',
            border: 'none',
            color: pastStates.length === 0 ? 'var(--c-text-3)' : 'var(--c-text-1)',
            cursor: pastStates.length === 0 ? 'not-allowed' : 'pointer',
            padding: '4px'
          }}
        >
          <Undo2 size={16} />
        </button>
        <button 
          onClick={() => redo()}
          disabled={futureStates.length === 0}
          title="Rehacer"
          style={{
            background: 'transparent',
            border: 'none',
            color: futureStates.length === 0 ? 'var(--c-text-3)' : 'var(--c-text-1)',
            cursor: futureStates.length === 0 ? 'not-allowed' : 'pointer',
            padding: '4px'
          }}
        >
          <Redo2 size={16} />
        </button>
        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--c-border)', margin: '0 8px' }}></div>
        <button 
          onClick={handlePlayToggle}
          style={{
            background: 'transparent',
            border: '1px solid var(--c-border-focus)',
            color: isPlaying ? 'var(--c-ok)' : 'var(--c-text-1)',
            padding: '6px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button 
          onClick={handleStop}
          style={{
            background: 'transparent',
            border: '1px solid var(--c-border-focus)',
            color: 'var(--c-text-1)',
            padding: '6px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Square size={14} />
        </button>
      </div>

      {/* View Tabs */}
      <div style={{ display: 'flex', gap: '16px' }}>
        {['EDITOR', 'MIXER', 'DASHBOARD'].map(tab => (
          <button
            key={tab}
            onClick={() => updateUIFocus({ activeTab: tab.toLowerCase() })}
            style={{
              background: 'transparent',
              border: 'none',
              color: activeTab === tab.toLowerCase() ? 'var(--c-text-1)' : 'var(--c-text-3)',
              fontSize: '11px',
              fontWeight: '600',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              textTransform: 'uppercase'
            }}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ControlBar;
