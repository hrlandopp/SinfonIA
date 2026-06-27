import React, { useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { Plus, Trash2, Volume2, Music } from 'lucide-react';

const TrackManagerPanel = () => {
  const { instruments, setInstruments } = useProjectStore();
  const [showAddMenu, setShowAddMenu] = useState(false);

  const activeTracks = Object.entries(instruments).filter(([_, data]) => data.active);
  const inactiveTracks = Object.entries(instruments).filter(([_, data]) => !data.active);

  const handleToggleTrack = (trackId, activeStatus) => {
    setInstruments(prev => ({
      ...prev,
      [trackId]: { ...prev[trackId], active: activeStatus }
    }));
    setShowAddMenu(false);
  };

  const handleVolumeChange = (trackId, volume) => {
    setInstruments(prev => ({
      ...prev,
      [trackId]: { ...prev[trackId], volume }
    }));
  };

  return (
    <aside className="w-64 border-l border-white/10 bg-black/40 backdrop-blur-xl flex flex-col flex-shrink-0 z-20 shadow-[inset_1px_0_0_rgba(255,255,255,0.05)]">
      {/* Header */}
      <div className="p-4 bg-black/40 backdrop-blur-md border-b border-white/10 flex items-center justify-between shadow-inner">
        <div className="flex items-center gap-2">
          <Music className="text-emerald-400" size={16} />
          <h2 className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
            Gestor de Pistas
          </h2>
        </div>
        <button 
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="p-1 rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-zinc-950 transition-all border border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]"
          title="Añadir Pista"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Add Menu (Dropdown) */}
      {showAddMenu && (
        <div className="p-3 bg-black/60 border-b border-white/10 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
          <h3 className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-2">Añadir Instrumento</h3>
          {inactiveTracks.length === 0 ? (
            <div className="text-[10px] text-zinc-500">Todos activos</div>
          ) : (
            <div className="flex flex-col gap-1">
              {inactiveTracks.map(([id, _]) => (
                <button
                  key={id}
                  onClick={() => handleToggleTrack(id, true)}
                  className="flex items-center justify-between px-2 py-1.5 rounded-md bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-400 text-zinc-300 text-[10px] font-mono uppercase tracking-wider transition-all"
                >
                  {id}
                  <Plus size={12} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active Tracks List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 scrollbar-thin scrollbar-thumb-zinc-700">
        {activeTracks.map(([id, data]) => (
          <div key={id} className="flex flex-col gap-2 p-2 rounded-lg bg-black/40 border border-white/5 hover:border-white/10 transition-colors shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-widest">
                {id}
              </span>
              <button 
                onClick={() => handleToggleTrack(id, false)}
                className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                title="Eliminar pista"
              >
                <Trash2 size={12} />
              </button>
            </div>
            
            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <Volume2 size={12} className="text-zinc-500" />
              <input 
                type="range" 
                min="-60" 
                max="0" 
                value={data.volume}
                onChange={(e) => handleVolumeChange(id, parseInt(e.target.value))}
                className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <span className="text-[9px] font-mono text-zinc-500 w-6 text-right">{data.volume}</span>
            </div>
          </div>
        ))}
        {activeTracks.length === 0 && (
          <div className="text-center text-zinc-600 text-[10px] mt-4 font-mono">
            No hay pistas activas
          </div>
        )}
      </div>
    </aside>
  );
};

export default TrackManagerPanel;
