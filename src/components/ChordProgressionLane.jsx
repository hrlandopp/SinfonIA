import React from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { usePlaybackControls } from '../context/PlaybackContext';
import { Plus, X } from 'lucide-react';

const ChordProgressionLane = () => {
  const { sections, activeSectionId, setSections } = useProjectStore();
  const { currentBeat, isPlaying } = usePlaybackControls();
  
  const activeSection = sections.find(s => s.id === activeSectionId);
  const chords = activeSection?.chords || [];

  const handleAddChord = () => {
    if (!activeSectionId) return;
    const newChord = { chordLabel: 'Cmaj', beats: 4 };
    setSections(prev => prev.map(s => {
      if (s.id === activeSectionId) {
        return { ...s, chords: [...(s.chords || []), newChord] };
      }
      return s;
    }));
  };

  const handleRemoveChord = (idx) => {
    if (!activeSectionId) return;
    setSections(prev => prev.map(s => {
      if (s.id === activeSectionId) {
        const newChords = [...(s.chords || [])];
        newChords.splice(idx, 1);
        return { ...s, chords: newChords };
      }
      return s;
    }));
  };

  const handleEditChordLabel = (idx, newLabel) => {
    if (!activeSectionId) return;
    setSections(prev => prev.map(s => {
      if (s.id === activeSectionId) {
        const newChords = [...(s.chords || [])];
        newChords[idx] = { ...newChords[idx], chordLabel: newLabel, chord: newLabel };
        return { ...s, chords: newChords };
      }
      return s;
    }));
  };

  const handleEditChordBeats = (idx, newBeats) => {
    if (!activeSectionId) return;
    setSections(prev => prev.map(s => {
      if (s.id === activeSectionId) {
        const newChords = [...(s.chords || [])];
        newChords[idx] = { ...newChords[idx], beats: parseInt(newBeats) || 4 };
        return { ...s, chords: newChords };
      }
      return s;
    }));
  };

  // Determine which chord is currently playing
  let activeChordIdx = -1;
  let sum = 0;
  for (let i = 0; i < chords.length; i++) {
    const cBeats = chords[i].beats || 4;
    if (currentBeat >= sum && currentBeat < sum + cBeats) {
      activeChordIdx = i;
      break;
    }
    sum += cBeats;
  }

  return (
    <div className="w-full flex items-center gap-4 bg-zinc-950 border-b border-zinc-800 p-4 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700 h-32 flex-shrink-0 z-10 shadow-md">
      {chords.map((chord, idx) => {
        const isActive = isPlaying && idx === activeChordIdx;
        return (
          <div 
            key={idx} 
            className={`flex-shrink-0 relative group flex flex-col justify-between w-32 h-full rounded-xl border transition-all duration-300 ${isActive ? 'bg-indigo-500/10 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-zinc-900 border-zinc-800/80 hover:border-zinc-600'}`}
          >
            <button 
              onClick={() => handleRemoveChord(idx)}
              className="absolute -top-2 -right-2 bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-red-400 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg active:scale-95"
            >
              <X size={12} strokeWidth={3} />
            </button>
            <div className="flex-1 flex items-center justify-center p-2">
              <input
                type="text"
                value={chord.chordLabel || chord.chord || ''}
                onChange={(e) => handleEditChordLabel(idx, e.target.value)}
                className={`w-full text-center bg-transparent outline-none font-bold text-2xl ${isActive ? 'text-indigo-400' : 'text-zinc-200'}`}
              />
            </div>
            <div className="h-8 border-t border-zinc-800/80 bg-zinc-950/50 rounded-b-xl flex items-center justify-center">
               <input
                type="number"
                min="1"
                max="16"
                value={chord.beats || 4}
                onChange={(e) => handleEditChordBeats(idx, e.target.value)}
                className="w-10 text-center bg-transparent outline-none font-mono text-[10px] text-zinc-400 font-bold"
              />
              <span className="text-[10px] text-zinc-600 font-mono ml-0.5">BEATS</span>
            </div>
          </div>
        )
      })}
      
      <button 
        onClick={handleAddChord}
        className="flex-shrink-0 flex flex-col items-center justify-center w-32 h-full rounded-xl border border-dashed border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 transition-all duration-200 group cursor-pointer active:scale-95"
      >
        <Plus size={24} className="group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-bold tracking-widest uppercase mt-2">Añadir</span>
      </button>
    </div>
  );
};

export default ChordProgressionLane;
