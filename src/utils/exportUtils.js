import { Midi } from '@tonejs/midi';

const parseDurationToBeats = (dur) => {
  if (typeof dur === 'number') return dur;
  if (typeof dur === 'string') {
    if (dur.includes('+')) {
      return dur.split('+').reduce((sum, part) => sum + parseDurationToBeats(part.trim()), 0);
    }
    if (dur.includes('*')) {
      const [mult, type] = dur.split('*').map(s => s.trim());
      return parseFloat(mult) * parseDurationToBeats(type);
    }
    const val = parseInt(dur, 10);
    if (dur.endsWith('n')) return 4 / val;
    if (dur.endsWith('m')) return val * 4;
  }
  return 1; // Default to 1 beat (quarter note)
};

export const exportProjectToMIDI = (masterJson) => {
  try {
    const project = masterJson?.project || {};
    const bpm = project?.tempo_bpm || project?.bpm || 120;
    const secondsPerBeat = 60 / bpm;

    const midi = new Midi();
    midi.header.setTempo(bpm);
    
    const midiTracksMap = {};
    let globalCumulativeBeats = 0;

    // Use sectionsData if available, otherwise just use master tracks directly as one section
    const sectionsToProcess = (masterJson?.sectionsData && masterJson.sectionsData.length > 0)
      ? [...masterJson.sectionsData].sort((a, b) => a.order_index - b.order_index)
      : [{ processedTracks: masterJson?.tracks || [], chords: [{ beats: 16 }] }]; // fallback section

    sectionsToProcess.forEach(sec => {
      if (sec.processedTracks) {
        sec.processedTracks.forEach(pTrack => {
          const instrId = pTrack.instrument || pTrack.id || 'unknown';
          
          if (!midiTracksMap[instrId]) {
            const mTrack = midi.addTrack();
            mTrack.name = instrId.toUpperCase();
            midiTracksMap[instrId] = mTrack;
          }

          const mTrack = midiTracksMap[instrId];

          pTrack.sequences?.forEach(seq => {
            seq.notes?.forEach(note => {
              if (!note.pitch) return;
              
              const pitches = Array.isArray(note.pitch) ? note.pitch : [note.pitch];
              
              let localTimeBeats = 0;
              if (typeof note.time === 'string' && note.time.includes('*')) {
                localTimeBeats = parseFloat(note.time.split('*')[0]) || 0;
              } else {
                localTimeBeats = parseFloat(note.time) || 0;
              }

              // Adjust for micro-timing if present
              const microOffset = parseFloat(note.timeOffset) || 0;

              const absoluteBeats = globalCumulativeBeats + localTimeBeats;
              const absoluteTimeSecs = absoluteBeats * secondsPerBeat + microOffset;
              
              const durationBeats = parseDurationToBeats(note.duration);
              const durationSecs = durationBeats * secondsPerBeat;
              const velocity = typeof note.velocity === 'number' ? note.velocity : 0.8;

              pitches.forEach(pitch => {
                if (pitch !== null && pitch !== undefined) {
                  const noteConfig = {
                    time: absoluteTimeSecs,
                    duration: durationSecs,
                    velocity: velocity
                  };
                  
                  // MIDI Library safety check: if string vs number
                  // A pure number string like "60" will be parsed to a number
                  const parsedPitch = parseFloat(pitch);
                  if (!isNaN(parsedPitch) && parsedPitch.toString() === pitch.toString()) {
                    noteConfig.midi = parsedPitch;
                  } else {
                    noteConfig.name = pitch;
                  }
                  
                  mTrack.addNote(noteConfig);
                }
              });
            });
          });
        });
      }

      const sectionBeats = sec.chords?.reduce((acc, c) => acc + (c.beats || 4), 0) || 16;
      globalCumulativeBeats += sectionBeats;
    });

    const midiData = midi.toArray();
    const blob = new Blob([midiData], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    const sanitizedName = (project?.name || 'SinfonIA_Project').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `${sanitizedName}.mid`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error("Error exporting MIDI:", error);
    return false;
  }
};
