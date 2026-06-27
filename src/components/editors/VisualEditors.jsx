import React, { useMemo, useState, useEffect } from 'react';
import Fretboard from './Fretboard';
import PianoRoll from './PianoRoll';
import GuitarChordDiagram from './GuitarChordDiagram';
import { useProjectStore } from '../../store/useProjectStore';
import { useUIStore } from '../../store/useUIStore';
import { usePlaybackControls } from '../../context/PlaybackContext';
import { ChevronDown, ChevronUp } from 'lucide-react';

const VisualEditors = React.memo(({ playFretNote }) => {
  const { project, sections, activeSectionId, instruments, setSections } = useProjectStore();
  const { uiFocusContext, activeNoteEdit } = useUIStore();
  const { isPlaying, currentBeat } = usePlaybackControls();
  
  const instrument = (uiFocusContext?.selectedInstrument || 'guitar').toLowerCase();
  const activeSection = sections.find(s => s.id === activeSectionId);
  const activeNotes = activeNoteEdit ? [activeNoteEdit.pitch] : [];
  
  const isGuitarMode = instrument === 'guitar' || instrument === 'bass' || instrument === 'guitarelectric' || instrument === 'guitarnylon';
  
  const [isPianoRollExpanded, setIsPianoRollExpanded] = useState(!isGuitarMode);

  useEffect(() => {
    setIsPianoRollExpanded(!isGuitarMode);
  }, [isGuitarMode]);

  // Calculate current chord label based on currentBeat
  const activeChordLabel = useMemo(() => {
    if (!activeSection?.chords) return '';
    let sum = 0;
    for (let c of activeSection.chords) {
      const beats = c.beats || 4;
      if (currentBeat >= sum && currentBeat < sum + beats) return c.chordLabel || c.chord;
      sum += beats;
    }
    return '';
  }, [activeSection?.chords, currentBeat]);

  const renderPianoRoll = () => (
    <div className={`flex-1 flex flex-col bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl overflow-hidden p-4 transition-all duration-300 ${isPianoRollExpanded ? 'min-h-[300px] opacity-100' : 'h-0 min-h-0 p-0 opacity-0 border-0'}`}>
      {isPianoRollExpanded && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Piano Roll ({instrument})</h3>
          </div>
          <PianoRoll 
            totalBeats={activeSection?.chords?.reduce((acc, c) => acc + (c.beats || 4), 0) || 16}
            melody={activeSection?.melody || []}
            onMelodyChange={(newMelody) => {
              if (activeSectionId) {
                setSections((prevSections) =>
                  prevSections.map((sec) =>
                    sec.id === activeSectionId ? { ...sec, melody: newMelody } : sec
                  )
                );
              }
            }}
            currentBeat={Math.floor(currentBeat)}
            isPlaying={isPlaying}
            onPlayNote={(note) => playFretNote(note, 60)}
          />
        </>
      )}
    </div>
  );

  return (
    <div className="flex-1 p-6 flex flex-col gap-4 relative overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-zinc-700">
      
      {isGuitarMode && (
        <div className="flex flex-col xl:flex-row gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards">
          {/* Fretboard */}
          <div className="flex-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl overflow-hidden p-4 flex flex-col">
            <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-4">Diapasón ({instrument})</h3>
            <div className="flex-1 flex flex-col min-h-[250px]">
              <Fretboard 
                keySignature={project?.key_signature || 'C'}
                activeChordLabel={activeChordLabel}
                activeNotes={activeNotes}
                capoPosition={project?.capo_position || 0}
                onPlayNote={(note, midi) => playFretNote(note, midi)}
                currentBeat={currentBeat}
                isPlaying={isPlaying}
              />
            </div>
          </div>
          
          {/* Chord Diagram */}
          <div className="w-full xl:w-[350px] bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl overflow-hidden p-4 flex flex-col flex-shrink-0">
            <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-4">Acordes en Progresión</h3>
            <div className="flex-1 flex items-center justify-center p-4">
               <GuitarChordDiagram chordName={activeChordLabel} />
            </div>
          </div>
        </div>
      )}

      {isGuitarMode && (
        <button 
          onClick={() => setIsPianoRollExpanded(!isPianoRollExpanded)}
          className="w-full py-2 flex items-center justify-center gap-2 bg-white/5 hover:bg-emerald-500/20 text-emerald-400 text-[10px] uppercase font-bold tracking-widest border border-white/10 rounded-lg transition-colors"
        >
          {isPianoRollExpanded ? <><ChevronUp size={14} /> Ocultar Piano Roll</> : <><ChevronDown size={14} /> Mostrar Piano Roll</>}
        </button>
      )}

      {/* Render Piano Roll last for guitar, or solo for other instruments */}
      {renderPianoRoll()}
      
    </div>
  );
});

VisualEditors.displayName = 'VisualEditors';

export default VisualEditors;
