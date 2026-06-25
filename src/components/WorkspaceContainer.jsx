import React from 'react';

const WorkspaceContainer = ({ activeTab }) => {
  const getDisplayText = () => {
    switch (activeTab) {
      case 'editor':
        return 'GRID_SEQUENCER_TIMELINE_ACTIVE';
      case 'mixer':
        return 'MIXER_CONSOLE_RACK_ACTIVE';
      case 'dashboard':
        return 'PROJECT_DASHBOARD_ACTIVE';
      default:
        return 'WORKSPACE_ACTIVE';
    }
  };

  return (
    <main style={{
      flex: 1,
      backgroundColor: 'var(--c-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden'
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '14px',
        color: 'var(--c-text-3)',
        letterSpacing: '0.1em'
      }}>
        [{getDisplayText()}]
      </div>
    </main>
  );
};

export default WorkspaceContainer;
