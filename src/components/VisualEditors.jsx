import React from 'react';
import Fretboard from './Fretboard';
import PianoRoll from './PianoRoll';
import { useProjectStore } from '../store/useProjectStore';
import { useUIStore } from '../store/useUIStore';
import { usePlaybackControls } from '../context/PlaybackContext';

const VisualEditors = React.memo(({ playFretNote }) => {
  const { project, sections, activeSectionId, instruments, setSections } = useProjectStore();
  const { uiFocusContext, activeNoteEdit } = useUIStore();
  const { isPlaying, currentBeat } = usePlaybackControls();
  
  const instrument = (uiFocusContext?.selectedInstrument || 'guitar').toLowerCase();
  const activeSection = sections.find(s => s.id === activeSectionId);
  const activeNotes = activeNoteEdit ? [activeNoteEdit.pitch] : [];
  
  const editorType = instruments?.[instrument]?.editorType || 'pianoroll';

  if (editorType === 'pianoroll') {
    const melody = activeSection?.melody || [];
    
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#16161a', padding: '16px' }}>
        <PianoRoll 
          totalBeats={activeSection?.chords?.reduce((acc, c) => acc + (c.beats || 4), 0) || 16}
          melody={melody}
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
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#16161a', padding: '16px' }}>
      <Fretboard 
        keySignature={project?.key_signature || 'C'}
        activeChordLabel={''} // Calculate based on currentBeat if needed
        activeNotes={activeNotes}
        capoPosition={project?.capo_position || 0}
        onPlayNote={(note, midi) => playFretNote(note, midi)}
        currentBeat={currentBeat}
        isPlaying={isPlaying}
      />
    </div>
  );
});

VisualEditors.displayName = 'VisualEditors';

export default VisualEditors;
