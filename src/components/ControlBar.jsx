import React from 'react';
import { Play, Pause, Square } from 'lucide-react';

const ControlBar = ({ project, isPlaying, onPlayToggle, onStop, activeTab, onTabChange }) => {
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
        <div style={{ display: 'flex', gap: '16px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--c-text-2)' }}>
          <div>BPM: <span style={{ color: 'var(--c-text-1)' }}>{project?.tempo_bpm || 120}</span></div>
          <div>KEY: <span style={{ color: 'var(--c-text-1)' }}>{project?.key_signature || 'C'}</span></div>
        </div>
      </div>

      {/* Transport Controls */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          onClick={onPlayToggle}
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
          onClick={onStop}
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
            onClick={() => onTabChange(tab.toLowerCase())}
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
