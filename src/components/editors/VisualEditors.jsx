import React, { useMemo } from 'react';
import Fretboard from './Fretboard';
import PianoRoll from './PianoRoll';
import GuitarChordDiagram from './GuitarChordDiagram';
import { useProjectStore } from '../../store/useProjectStore';
import { useUIStore } from '../../store/useUIStore';
import { usePlaybackControls } from '../../context/PlaybackContext';

const VisualEditors = React.memo(({ playFretNote }) => {
  const { project, sections, activeSectionId, instruments, setSections } = useProjectStore();
  const { uiFocusContext, activeNoteEdit } = useUIStore();
  const { isPlaying, currentBeat } = usePlaybackControls();
  
  const instrument = (uiFocusContext?.selectedInstrument || 'guitar').toLowerCase();
  const activeSection = sections.find(s => s.id === activeSectionId);
  const activeNotes = activeNoteEdit ? [activeNoteEdit.pitch] : [];
  
  const isGuitarMode = instrument === 'guitar' || instrument === 'bass';
  const editorType = isGuitarMode ? 'guitar' : (instruments?.[instrument]?.editorType || 'pianoroll');

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

  return (
    <div className="flex-1 bg-zinc-950 p-6 flex flex-col relative overflow-hidden">
      {editorType === 'pianoroll' ? (
        <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards bg-zinc-900 border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden p-4">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Secuenciador MIDI Profundo</h3>
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
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards">
          <div className="flex-1 bg-zinc-900 border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden p-4 flex flex-col">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Diapasón Interactivo</h3>
            <div className="flex-1 flex flex-col min-h-[300px]">
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
          
          <div className="w-full lg:w-[400px] bg-zinc-900 border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden p-4 flex flex-col">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Acordes Inteligentes</h3>
            <div className="flex-1 flex items-center justify-center p-4">
               <GuitarChordDiagram chordName={activeChordLabel} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

VisualEditors.displayName = 'VisualEditors';

export default VisualEditors;
