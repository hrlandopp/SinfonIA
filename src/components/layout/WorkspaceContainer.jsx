import React from 'react';
import TracksPanel from '../panels/TracksPanel';
import VisualEditors from '../editors/VisualEditors';
import ChordProgressionLane from '../editors/ChordProgressionLane';
import TrackManagerPanel from '../panels/TrackManagerPanel';
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
    <main className="flex-1 bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-950/20 flex overflow-hidden relative">
      {activeTab === 'editor' ? (
        <>
          <div className="flex-1 flex flex-col overflow-hidden relative backdrop-blur-md">
            
            {/* Top: Chord Progression Lane */}
            <ChordProgressionLane />
            
            {/* Middle: Minimized Tracks Panel */}
            <TracksPanel />
            
            {/* Bottom: Dynamic Visual Editors */}
            <div className="flex-1 flex flex-col overflow-hidden relative bg-black/40 backdrop-blur-md border-t border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <VisualEditors playFretNote={playFretNote} />
            </div>
            
          </div>
          <TrackManagerPanel />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center font-mono text-sm text-zinc-500 tracking-widest uppercase">
          [{getDisplayText()}]
        </div>
      )}
    </main>
  );
};

export default WorkspaceContainer;
