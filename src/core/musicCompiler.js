import { parseChordNotes } from './musicTheory';

/**
 * Motor de Compilación Musical Puro.
 * Transforma el JSON de secciones (generado por la IA o el usuario) 
 * en pistas reproducibles por Tone.js.
 * 
 * @param {Array} sections - Arreglo de secciones musicales.
 * @param {string} activeSectionId - ID de la sección activa a reproducir.
 * @param {Object} previousMasterJson - Estado maestro anterior para mantener paneos, volumenes, etc.
 * @returns {Object} Nuevo estado masterJson compilado.
 */
export const compileMasterJson = (sections, activeSectionId, previousMasterJson = {}) => {
  if (!sections || !Array.isArray(sections)) return previousMasterJson;

  const nextJson = { ...previousMasterJson };
  
  nextJson.sectionsData = [...sections]
    .sort((a, b) => a.order_index - b.order_index)
    .map(sec => {
      let generatedTracks = [];

      if (sec.tracks && sec.tracks.length > 0) {
        // La IA devolvió pistas detalladas (events)
        const existingMixMap = {};
        (previousMasterJson.tracks || []).forEach(t => { 
          existingMixMap[t.id] = { volume: t.volume, pan: t.pan, mute: t.mute, solo: t.solo }; 
        });

        generatedTracks = sec.tracks.map(aiTrack => ({
          id: aiTrack.id,
          name: aiTrack.name || aiTrack.id,
          type: 'sampler',
          instrument: aiTrack.id,
          volume: existingMixMap[aiTrack.id]?.volume ?? -6.0,
          pan: existingMixMap[aiTrack.id]?.pan ?? 0,
          mute: existingMixMap[aiTrack.id]?.mute ?? false,
          solo: existingMixMap[aiTrack.id]?.solo ?? false,
          sequences: aiTrack.sequences || []
        }));

        if (sec.melody && sec.melody.length > 0) {
          const pianoTrack = generatedTracks.find(t => t.id === 'piano');
          if (pianoTrack) {
            const melodyNotes = sec.melody.map(m => ({ 
              pitch: m.note, 
              time: `${m.beat} * 4n`, 
              duration: m.duration || "8n", 
              velocity: 0.8 
            }));
            if (pianoTrack.sequences.length > 0) {
              pianoTrack.sequences[0].notes = [...pianoTrack.sequences[0].notes, ...melodyNotes];
            } else {
              pianoTrack.sequences.push({ id: `seq_melody_${sec.id}`, startTime: "0:0:0", notes: melodyNotes });
            }
          }
        }
      } else {
        // La IA solo devolvió acordes. Usar el fallback del compilador base.
        const trackNotes = { piano: [], bass: [], guitar: [] };
        let cumulativeBeat = 0;

        (sec.chords || []).forEach(c => {
          const chordName = c.chordLabel || c.chord;
          const durationBeats = c.beats || 4;

          if (c.events && Object.keys(c.events).length > 0) {
            Object.keys(c.events).forEach(instrKey => {
              if (!trackNotes[instrKey]) trackNotes[instrKey] = [];
              c.events[instrKey].forEach(ev => {
                trackNotes[instrKey].push({
                  pitch: ev.pitch,
                  time: ev.timeOffset !== undefined ? `${cumulativeBeat + ev.timeOffset} * 4n` : `${cumulativeBeat} * 4n`,
                  duration: ev.duration || "4n",
                  velocity: ev.velocity !== undefined ? ev.velocity : 0.7,
                  timeOffset: ev.timeOffset || 0,
                  articulation: ev.articulation || undefined
                });
              });
            });
          } else {
            // Acordes simples si no hay eventos especificados
            const pianoChordNotes = parseChordNotes(chordName, 3);
            const bassChordNotes = parseChordNotes(chordName, 2);

            if (pianoChordNotes.length > 0) {
              trackNotes.piano.push({ pitch: pianoChordNotes, time: `${cumulativeBeat} * 4n`, duration: `${durationBeats} * 4n`, velocity: 0.7 });
            }
            if (bassChordNotes.length > 0) {
              const rootNote = bassChordNotes[0];
              for (let b = 0; b < durationBeats; b++) {
                trackNotes.bass.push({ pitch: rootNote, time: `${cumulativeBeat + b} * 4n`, duration: "8n", velocity: 0.9 });
              }
            }
          }
          cumulativeBeat += durationBeats;
        });

        if (sec.melody && sec.melody.length > 0) {
          sec.melody.forEach(m => {
            if(!trackNotes.piano) trackNotes.piano = [];
            trackNotes.piano.push({ pitch: m.note, time: `${m.beat} * 4n`, duration: m.duration || "8n", velocity: 0.8 });
          });
        }

        generatedTracks = Object.keys(trackNotes)
          .filter(instrId => trackNotes[instrId].length > 0)
          .map(instrId => {
            const existingTrack = (previousMasterJson.tracks || []).find(t => t.id === instrId);
            return {
              id: instrId,
              name: existingTrack?.name || instrId,
              type: 'sampler',
              instrument: instrId,
              volume: existingTrack?.volume ?? -6.0,
              pan: existingTrack?.pan ?? 0,
              mute: existingTrack?.mute ?? false,
              solo: existingTrack?.solo ?? false,
              sequences: [{ id: `seq_${instrId}_${sec.id}`, startTime: "0:0:0", notes: trackNotes[instrId] }]
            };
          });
      }

      return { ...sec, processedTracks: generatedTracks };
    });

  nextJson.activeSectionId = activeSectionId;
  const activeSecData = nextJson.sectionsData.find(s => s.id === activeSectionId);
  if (activeSecData) {
    nextJson.tracks = activeSecData.processedTracks;
  } else {
    nextJson.tracks = [];
  }

  return nextJson;
};
