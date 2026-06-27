import React from 'react';
import TracksPanel from './TracksPanel';
import VisualEditors from './VisualEditors';
import { useUIStore } from '../store/useUIStore';

const WorkspaceContainer = ({ playFretNote }) => {
  const { uiFocusContext } = useUIStore();
  const activeTab = uiFocusContext?.activeTab || 'editor';

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
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {activeTab === 'editor' ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: '0 0 50%', display: 'flex', flexDirection: 'column', borderBottom: '1px solid #2a2a30' }}>
            <TracksPanel />
          </div>
          <div style={{ flex: '0 0 50%', display: 'flex', flexDirection: 'column' }}>
            <VisualEditors playFretNote={playFretNote} />
          </div>
        </div>
      ) : (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: '14px',
          color: 'var(--c-text-3)',
          letterSpacing: '0.1em'
        }}>
          [{getDisplayText()}]
        </div>
      )}
    </main>
  );
};

export default WorkspaceContainer;
