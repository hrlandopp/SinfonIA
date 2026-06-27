import React, { useMemo } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { useUIStore } from '../../store/useUIStore';

const TracksPanel = React.memo(() => {
  const { sections: masterSections, instruments } = useProjectStore();
  const { uiFocusContext, updateUIFocus } = useUIStore();
  const sections = masterSections || [];
  
  const trackKeys = useMemo(() => Object.keys(instruments || {}).map(k => k.toUpperCase()), [instruments]);
  
  // Calcular los compases (beats) totales para distribuir los anchos
  let totalBeats = 0;
  const sectionsWithBeats = sections.map(sec => {
    const secBeats = sec.chords?.reduce((acc, curr) => acc + (curr.beats || 4), 0) || 16;
    totalBeats += secBeats;
    return { ...sec, secBeats };
  });

  return (
    <div className="w-full bg-zinc-950 flex flex-col border-b border-zinc-800 flex-shrink-0 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
      {/* CABECERA SUPERIOR (Timeline Ruler) */}
      <div className="flex h-6 bg-zinc-900 border-b border-zinc-800/80 sticky top-0 z-10">
        <div className="w-[150px] border-r border-zinc-800/80 flex items-center px-3 text-[9px] font-mono font-bold text-zinc-500 tracking-widest uppercase">
          TRACK_NAME
        </div>
        
        <div className="flex-1 flex relative">
          {sectionsWithBeats.map((sec, idx) => {
            const flexBasis = totalBeats > 0 ? `${(sec.secBeats / totalBeats) * 100}%` : 'auto';
            return (
              <div key={sec.id || idx} style={{ flexBasis }} className="border-r border-zinc-800/50 flex items-center px-2 text-[9px] font-mono text-zinc-600">
                {sec.name ? sec.name.toUpperCase() : `SECTION_${idx + 1}`} ({sec.secBeats}B)
              </div>
            );
          })}
        </div>
      </div>

      {/* FILAS DE PISTAS (Track Lanes) */}
      {trackKeys.map(track => {
        const isSelected = uiFocusContext?.selectedInstrument?.toLowerCase() === track.toLowerCase();
        
        return (
          <div key={track} className={`flex h-8 border-b border-zinc-800/50 transition-colors ${isSelected ? 'bg-zinc-900/50' : 'bg-zinc-950'}`}>
            {/* Bloque Izquierdo (Track Header) */}
            <div 
              onClick={() => updateUIFocus({ selectedInstrument: track.toLowerCase() })}
              className={`w-[150px] border-r border-zinc-800/80 flex items-center px-3 cursor-pointer relative transition-colors ${isSelected ? 'bg-zinc-800/50' : 'hover:bg-zinc-900'}`}
            >
              {isSelected && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-500" />
              )}
              <span className={`font-mono text-[10px] tracking-widest uppercase ${isSelected ? 'text-zinc-200 font-bold' : 'text-zinc-500 font-medium'}`}>
                {track}
              </span>
            </div>
            
            {/* Bloque Derecho (Grid Timeline) */}
            <div className="flex-1 flex relative">
              {sectionsWithBeats.map((sec, idx) => {
                const flexBasis = totalBeats > 0 ? `${(sec.secBeats / totalBeats) * 100}%` : 'auto';
                return (
                  <div key={`${track}-${sec.id || idx}`} style={{ flexBasis }} className="border-r border-zinc-800/30 flex items-center justify-center p-1">
                    <div className="w-full h-full bg-white/5 border border-white/5 rounded-sm" />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
});

TracksPanel.displayName = 'TracksPanel';

export default TracksPanel;
