import React from 'react';
import TracksPanel from '../panels/TracksPanel';
import VisualEditors from '../editors/VisualEditors';
import ChordProgressionLane from '../editors/ChordProgressionLane';
import { useUIStore } from '../../store/useUIStore';

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
    <main className="flex-1 bg-zinc-950 flex flex-col overflow-hidden relative">
      {activeTab === 'editor' ? (
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* Top: Chord Progression Lane */}
          <ChordProgressionLane />
          
          {/* Middle: Minimized Tracks Panel */}
          <TracksPanel />
          
          {/* Bottom: Dynamic Visual Editors */}
          <div className="flex-1 flex flex-col overflow-hidden relative bg-zinc-900 border-t border-zinc-800/80">
            <VisualEditors playFretNote={playFretNote} />
          </div>
          
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center font-mono text-sm text-zinc-500 tracking-widest uppercase">
          [{getDisplayText()}]
        </div>
      )}
    </main>
  );
};

export default WorkspaceContainer;
