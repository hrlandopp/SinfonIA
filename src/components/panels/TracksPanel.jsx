import React, { useState, useMemo } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { useUIStore } from '../../store/useUIStore';
import { Maximize2, Minimize2 } from 'lucide-react';

const TracksPanel = React.memo(() => {
  const { sections: masterSections, instruments, masterJson } = useProjectStore();
  const { uiFocusContext, updateUIFocus } = useUIStore();
  const sections = masterSections || [];
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Only show active tracks
  const activeTrackKeys = useMemo(() => {
    return Object.keys(instruments || {}).filter(k => instruments[k].active).map(k => k.toUpperCase());
  }, [instruments]);
  
  // Calculate total beats for width distribution
  let totalBeats = 0;
  const sectionsWithBeats = sections.map(sec => {
    const secBeats = sec.chords?.reduce((acc, curr) => acc + (curr.beats || 4), 0) || 16;
    totalBeats += secBeats;
    return { ...sec, secBeats, startBeat: totalBeats - secBeats };
  });

  return (
    <div className={`w-full bg-black/40 backdrop-blur-md flex flex-col border-b border-white/10 flex-shrink-0 transition-all duration-300 ${isExpanded ? 'h-64' : 'h-32'} overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700`}>
      {/* HEADER (Timeline Ruler) */}
      <div className="flex h-6 bg-black/60 border-b border-white/10 sticky top-0 z-10">
        <div className="w-[150px] border-r border-white/10 flex items-center justify-between px-3 text-[9px] font-mono font-bold text-zinc-400 tracking-widest uppercase">
          <span>TIMELINE</span>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-emerald-500 hover:text-emerald-300 transition-colors"
            title={isExpanded ? "Colapsar Timeline" : "Expandir Timeline"}
          >
            {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
        
        <div className="flex-1 flex relative">
          {sectionsWithBeats.map((sec, idx) => {
            const flexBasis = totalBeats > 0 ? `${(sec.secBeats / totalBeats) * 100}%` : 'auto';
            return (
              <div key={sec.id || idx} style={{ flexBasis }} className="border-r border-white/5 flex items-center px-2 text-[9px] font-mono text-zinc-500">
                {sec.name ? sec.name.toUpperCase() : `SEC_${idx + 1}`}
              </div>
            );
          })}
        </div>
      </div>

      {/* TRACK LANES */}
      {activeTrackKeys.map(track => {
        const isSelected = uiFocusContext?.selectedInstrument?.toLowerCase() === track.toLowerCase();
        
        // Find notes for this track from masterJson
        const trackData = masterJson?.tracks?.find(t => t.id.toLowerCase() === track.toLowerCase());
        const sequences = trackData?.sequences || [];
        
        return (
          <div key={track} className={`flex border-b border-white/5 transition-all duration-300 ${isSelected ? 'bg-white/5' : 'bg-transparent'} ${isExpanded ? 'h-12' : 'h-6'}`}>
            {/* Left Block (Track Header) */}
            <div 
              onClick={() => updateUIFocus({ selectedInstrument: track.toLowerCase() })}
              className={`w-[150px] border-r border-white/10 flex items-center px-3 cursor-pointer relative transition-colors ${isSelected ? 'bg-emerald-500/10' : 'hover:bg-white/5'}`}
            >
              {isSelected && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
              )}
              <span className={`font-mono text-[10px] tracking-widest uppercase ${isSelected ? 'text-emerald-400 font-bold' : 'text-zinc-500 font-medium'}`}>
                {track}
              </span>
            </div>
            
            {/* Right Block (Grid Timeline) */}
            <div className="flex-1 flex relative">
              {sectionsWithBeats.map((sec, idx) => {
                const flexBasis = totalBeats > 0 ? `${(sec.secBeats / totalBeats) * 100}%` : 'auto';
                
                // If there are sequences in this section, we show a mock visual summary
                const hasData = sequences.some(s => s.time >= sec.startBeat && s.time < sec.startBeat + sec.secBeats);
                
                return (
                  <div key={`${track}-${sec.id || idx}`} style={{ flexBasis }} className="border-r border-white/5 flex items-center justify-center p-0.5 relative overflow-hidden">
                    {isExpanded ? (
                      <div className={`w-full h-full rounded-sm flex items-center px-1 gap-0.5 opacity-80 ${hasData ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-white/5'}`}>
                        {hasData && Array.from({length: Math.min(sec.secBeats, 8)}).map((_, i) => (
                          <div key={i} className="flex-1 h-1/3 bg-emerald-400/60 rounded-full" style={{ opacity: Math.random() * 0.5 + 0.3 }} />
                        ))}
                      </div>
                    ) : (
                      <div className={`w-full h-full rounded-sm ${hasData ? 'bg-emerald-500/40' : 'bg-white/5'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      
      {activeTrackKeys.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
          NO ACTIVE TRACKS
        </div>
      )}
    </div>
  );
});

TracksPanel.displayName = 'TracksPanel';

export default TracksPanel;
