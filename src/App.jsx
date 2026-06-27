import React, { useState, useEffect, useCallback } from 'react'
import * as Tone from 'tone'
import { parseChordNotes } from './utils/musicTheory'
import { evaluateHarmonicClash } from './utils/musicLogic'
import { useAudioEngine } from './hooks/useAudioEngine'
import { usePlaybackControls } from './context/PlaybackContext.jsx'

import ControlBar from './components/ControlBar'
import AIManagerPanel from './components/AIManagerPanel'
import WorkspaceContainer from './components/WorkspaceContainer'
import ProjectLauncher from './components/ProjectLauncher'

import { useProjectStore } from './store/useProjectStore'
import { useUIStore } from './store/useUIStore'
import { useProjects } from './hooks/useProjects'

export default function App() {
  const { currentLayout, updateUIFocus, activeNoteEdit, setActiveNoteEdit, setMascotAlert } = useUIStore()
  const { sections, activeSectionId, masterJson } = useProjectStore()
  const { isPlaying, setIsPlaying } = usePlaybackControls()
  
  useProjects()

  const [currentChord, setCurrentChord] = useState('')
  const [currentChordIdx, setCurrentChordIdx] = useState(0)



  const handleBeatTick = useCallback((beat) => {
    const sec = sections.find(s => s.id === activeSectionId);
    if (sec && sec.chords) {
      let sum = 0;
      for (let i = 0; i < sec.chords.length; i++) {
        const c = sec.chords[i];
        const chordBeats = c.beats || 4;
        if (beat >= sum && beat < sum + chordBeats) {
          setCurrentChordIdx(prev => prev !== i ? i : prev);
          const newChord = c.chordLabel || c.chord || '';
          setCurrentChord(prev => prev !== newChord ? newChord : prev);
          break;
        }
        sum += chordBeats;
      }
    }
  }, [sections, activeSectionId]);

  const { play, stop, playNote, playChord, isAudioLoaded } = useAudioEngine(masterJson, handleBeatTick);

  useEffect(() => {
    if (!activeNoteEdit) return;
    if (currentChord) {
      const currentChordNotes = parseChordNotes(currentChord, 3);
      const { hasClash, suggestedNote } = evaluateHarmonicClash(currentChordNotes, activeNoteEdit.pitch);
      if (hasClash) {
        setMascotAlert({
          hasLocalError: true,
          message: `¡Ojo! La nota ${activeNoteEdit.pitch} choca armónicamente con el acorde actual (${currentChord}). Te sugiero usar ${suggestedNote} en su lugar.`,
          delta: { chord: currentChord, badNote: activeNoteEdit.pitch, suggestedNote }
        });
      } else {
        setMascotAlert(null);
      }
    }
  }, [activeNoteEdit, currentChord, setMascotAlert]);

  const playFretNote = async (noteName, midiVal) => { 
    setActiveNoteEdit({ pitch: noteName, time: Math.floor(Tone.Transport.seconds * 2) });
    updateUIFocus({ lastUserAction: 'played_note' }); 
    try { 
      if (currentChord) {
        const chordNotes = parseChordNotes(currentChord, 3);
        if (chordNotes.length) await playChord(chordNotes, "4n");
      } else {
        await playNote(midiVal || noteName, "4n");
      }
    } catch (e) { console.error(e) } 
  }

  if (currentLayout === 'launcher') {
    return <ProjectLauncher />;
  }

  if (!isAudioLoaded) {
    return (
      <div className="flex flex-col h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-100 font-sans">
        <div className="animate-spin mb-4 border-4 border-zinc-800 border-t-zinc-300 rounded-full w-10 h-10"></div>
        <h2 className="text-lg font-bold mb-2">Afinando la Orquesta...</h2>
        <p className="text-zinc-400 text-sm">Cargando instrumentos en memoria.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      <ControlBar />
      <div className="flex flex-1 overflow-hidden">
        <AIManagerPanel />
        <WorkspaceContainer playFretNote={playFretNote} />
      </div>
    </div>
  );
}
