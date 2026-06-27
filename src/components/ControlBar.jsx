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
  const { isPlaying, setIsPlaying } = usePlaybackControls();
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
    <div className="h-[60px] flex items-center justify-between px-6 bg-zinc-950 border-b border-zinc-800/80 text-zinc-100 flex-shrink-0 z-30 shadow-sm shadow-black/20">
      
      {/* Metadata Section */}
      <div className="flex items-center gap-6">
        <div className="text-sm font-bold tracking-tight">
          {project?.name || 'SinfonIA Pro'}
        </div>
        
        {/* Barra Paramétrica */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800/80 rounded-md px-3 py-1.5 shadow-inner shadow-black/40">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">BPM</span>
            <span className="text-xs font-mono font-medium text-zinc-200">{project?.tempo_bpm || 120}</span>
          </div>
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800/80 rounded-md px-3 py-1.5 shadow-inner shadow-black/40">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">KEY</span>
            <span className="text-xs font-mono font-medium text-zinc-200">{project?.key_signature || 'C'}</span>
          </div>
          
          <button 
            onClick={handleExportMidi}
            title="Exportar a MIDI"
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800/80 hover:border-zinc-700 rounded-md px-3 py-1.5 transition-all active:scale-95"
          >
            <Download size={14} className="text-zinc-400" />
            <span className="text-[10px] font-mono font-medium text-zinc-300 uppercase tracking-wider">MIDI</span>
          </button>
        </div>
      </div>

      {/* Transport Controls & History */}
      <div className="flex items-center gap-2">
        <div className="flex bg-zinc-900/80 border border-zinc-800/80 rounded-md p-0.5">
          <button 
            onClick={() => undo()}
            disabled={pastStates.length === 0}
            title="Deshacer"
            className={`p-1.5 rounded transition-colors ${pastStates.length === 0 ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 active:scale-95'}`}
          >
            <Undo2 size={16} />
          </button>
          <button 
            onClick={() => redo()}
            disabled={futureStates.length === 0}
            title="Rehacer"
            className={`p-1.5 rounded transition-colors ${futureStates.length === 0 ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 active:scale-95'}`}
          >
            <Redo2 size={16} />
          </button>
        </div>

        <div className="w-px h-6 bg-zinc-800 mx-2" />

        <div className="flex items-center gap-1">
          <button 
            onClick={handlePlayToggle}
            className={`flex items-center justify-center w-10 h-8 rounded-md transition-all active:scale-95 border ${isPlaying ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-zinc-900 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800 hover:text-white'}`}
            title="Reproducir/Pausar"
          >
            {isPlaying ? <Pause size={16} className="fill-current" /> : <Play size={16} className="fill-current" />}
          </button>
          <button 
            onClick={handleStop}
            className="flex items-center justify-center w-10 h-8 rounded-md transition-all active:scale-95 bg-zinc-900 border border-zinc-800/80 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            title="Detener"
          >
            <Square size={14} className="fill-current" />
          </button>
          <button 
            onClick={() => {
               // This requires connecting to Tone.Transport.loop in the future, simulating for now
               const el = document.getElementById('loop-btn-icon');
               if(el) el.classList.toggle('text-indigo-400');
            }}
            id="loop-btn-icon"
            className="flex items-center justify-center w-10 h-8 rounded-md transition-all active:scale-95 bg-zinc-900 border border-zinc-800/80 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            title="Repetir (Bucle)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/50">
        {['EDITOR', 'MIXER', 'DASHBOARD'].map(tab => (
          <button
            key={tab}
            onClick={() => updateUIFocus({ activeTab: tab.toLowerCase() })}
            className={`px-4 py-1.5 rounded-md text-[10px] font-bold tracking-widest transition-all ${activeTab === tab.toLowerCase() ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ControlBar;
