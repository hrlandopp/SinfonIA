import { useEffect, useRef, useCallback, useState } from 'react';
import * as Tone from 'tone';
import { applyStrumming, applyGroove, applyArticulationParams, evaluateHarmonicClash, reduceToDyad } from '../utils/musicLogic';

// ---------------------------------------------------------
// CONFIGURACIÓN DE SAMPLES (Mapeo de Instrumentos)
// ---------------------------------------------------------
const INSTRUMENT_CONFIGS = {
  piano: {
    baseUrl: "/samples/piano/",
    urls: {
      A0: "A0.mp3", C1: "C1.mp3", "D#1": "Ds1.mp3", "F#1": "Fs1.mp3",
      A1: "A1.mp3", C2: "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3",
      A2: "A2.mp3", C3: "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3",
      A3: "A3.mp3", C4: "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3",
      A4: "A4.mp3", C5: "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3",
      A5: "A5.mp3", C6: "C6.mp3", "D#6": "Ds6.mp3", "F#6": "Fs6.mp3",
      A6: "A6.mp3", C7: "C7.mp3", "D#7": "Ds7.mp3", "F#7": "Fs7.mp3",
      A7: "A7.mp3", C8: "C8.mp3"
    }
  },
  guitar: {
    baseUrl: "/samples/guitar-acoustic/",
    urls: {
      D2: "D2.mp3", E2: "E2.mp3", F2: "F2.mp3", "F#2": "Fs2.mp3", G2: "G2.mp3", "G#2": "Gs2.mp3",
      A2: "A2.mp3", "A#2": "As2.mp3", B2: "B2.mp3",
      C3: "C3.mp3", "C#3": "Cs3.mp3", D3: "D3.mp3", "D#3": "Ds3.mp3", E3: "E3.mp3", F3: "F3.mp3", "F#3": "Fs3.mp3", G3: "G3.mp3", "G#3": "Gs3.mp3",
      A3: "A3.mp3", "A#3": "As3.mp3", B3: "B3.mp3",
      C4: "C4.mp3", "C#4": "Cs4.mp3", D4: "D4.mp3", "D#4": "Ds4.mp3", E4: "E4.mp3", F4: "F4.mp3", "F#4": "Fs4.mp3", G4: "G4.mp3", "G#4": "Gs4.mp3",
      A4: "A4.mp3", "A#4": "As4.mp3", B4: "B4.mp3",
      C5: "C5.mp3", "C#5": "Cs5.mp3", D5: "D5.mp3"
    }
  },
  bass: {
    baseUrl: "/samples/bass-electric/",
    urls: {
      "C#1": "Cs1.mp3", E1: "E1.mp3", G1: "G1.mp3",
      "A#1": "As1.mp3", "C#2": "Cs2.mp3", E2: "E2.mp3", G2: "G2.mp3",
      "A#2": "As2.mp3", "C#3": "Cs3.mp3", E3: "E3.mp3", G3: "G3.mp3",
      "A#3": "As3.mp3", "C#4": "Cs4.mp3", E4: "E4.mp3", G4: "G4.mp3",
      "A#4": "As4.mp3", "C#5": "Cs5.mp3"
    }
  },
  violin: {
    baseUrl: "/samples/violin/",
    urls: {
      G3: "G3.mp3", A3: "A3.mp3",
      C4: "C4.mp3", E4: "E4.mp3", G4: "G4.mp3", A4: "A4.mp3",
      C5: "C5.mp3", E5: "E5.mp3", G5: "G5.mp3", A5: "A5.mp3",
      C6: "C6.mp3", E6: "E6.mp3", G6: "G6.mp3", A6: "A6.mp3",
      C7: "C7.mp3"
    }
  },
  strings: {
    baseUrl: "/samples/cello/",
    urls: {
      C2: "C2.mp3", D2: "D2.mp3", E2: "E2.mp3", G2: "G2.mp3", A2: "A2.mp3",
      C3: "C3.mp3", "C#3": "Cs3.mp3", D3: "D3.mp3", E3: "E3.mp3", F3: "F3.mp3", "F#3": "Fs3.mp3", G3: "G3.mp3",
      C4: "C4.mp3", "C#4": "Cs4.mp3", D4: "D4.mp3", E4: "E4.mp3", F4: "F4.mp3", "F#4": "Fs4.mp3", G4: "G4.mp3",
      C5: "C5.mp3"
    }
  },
  vibraphone: {
    baseUrl: "/samples/xylophone/",
    urls: {
      G4: "G4.mp3", C5: "C5.mp3", G5: "G5.mp3",
      C6: "C6.mp3", G6: "G6.mp3",
      C7: "C7.mp3", G7: "G7.mp3",
      C8: "C8.mp3"
    }
  }
};

// ---------------------------------------------------------
// ARTICULACIONES QUE ACTIVAN applyStrumming
// ---------------------------------------------------------
const STRUM_ARTICULATIONS = {
  strum_down: 'down',
  strum_up: 'up'
};

// ---------------------------------------------------------
// ARTICULACIONES QUE ACTIVAN applyGroove
// ---------------------------------------------------------
const GROOVE_ARTICULATIONS = ['syncopated'];

export const useAudioEngine = (masterJson, onBeatTick, isFullSongMode = true) => {
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);

  // Referencias para mantener las instancias en memoria sin provocar re-renders en React
  const instrumentsRef = useRef({});
  const partsRef = useRef({});
  const channelsRef = useRef({});
  const sequencesHashRef = useRef({});
  const autoStopEventRef = useRef(null);

  // ---------------------------------------------------------
  // 1. INICIALIZACIÓN DE INSTRUMENTOS (Se ejecuta una sola vez)
  // ---------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    const initAudio = async () => {
      // Iterar sobre las configuraciones para crear canales e instrumentos basados en samples
      Object.keys(INSTRUMENT_CONFIGS).forEach(instrumentName => {
        const config = INSTRUMENT_CONFIGS[instrumentName];
        
        // Crear un canal de mezcla independiente y conectarlo al destino final
        const channel = new Tone.Channel().toDestination();
        channelsRef.current[instrumentName] = channel;

        // Crear el Sampler con la configuración correspondiente
        const sampler = new Tone.Sampler({
          urls: config.urls,
          baseUrl: config.baseUrl,
          onload: () => {
            if (isMounted) console.log(`🎵 Instrumento cargado en memoria: ${instrumentName}`);
          }
        }).connect(channel);

        instrumentsRef.current[instrumentName] = sampler;
      });

      // BATERÍA: Sintetizador de membrana para kicks y percusiones
      const drumsChannel = new Tone.Channel().toDestination();
      channelsRef.current['drums'] = drumsChannel;
      const drumsSynth = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 6,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
      }).connect(drumsChannel);
      instrumentsRef.current['drums'] = drumsSynth;

      console.log("🎧 Motor de audio inicializado. Esperando descarga de samples...");
      
      try {
        // Wait for all samples to be loaded in Tone.js buffers (con timeout de 4s para evitar bloqueo de UI)
        await Promise.race([
          Tone.loaded(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout cargando audios")), 4000))
        ]);
        
        if (isMounted) {
          setIsAudioLoaded(true);
          console.log("✅ Samples cargados. El motor está listo.");
        }
      } catch (error) {
        console.warn("⚠️ Advertencia: Algunos samples de audio fallaron al cargar o no existen en /public. El motor se iniciará en modo degradado para no bloquear la UI.", error);
        if (isMounted) {
          setIsAudioLoaded(true);
        }
      }
    };

    initAudio();

    return () => {
      isMounted = false;
      console.log("🧹 Limpiando memoria de instrumentos y canales...");
      
      // Limpiar instrumentos
      Object.values(instrumentsRef.current).forEach((instrument) => {
        if (instrument && typeof instrument.dispose === 'function') instrument.dispose();
      });
      instrumentsRef.current = {};

      // Limpiar canales
      Object.values(channelsRef.current).forEach((channel) => {
        if (channel && typeof channel.dispose === 'function') channel.dispose();
      });
      channelsRef.current = {};

      // Limpiar partes (secuencias)
      Object.values(partsRef.current).forEach((part) => {
        if (part && typeof part.dispose === 'function') part.dispose();
      });
      partsRef.current = {};
    };
  }, []);

  // ---------------------------------------------------------
  // 2. REACCIÓN AL JSON MAESTRO (Programación de Secuencias)
  //    Con soporte para micro-timing, humanización y articulaciones (DELTA UPDATES)
  // ---------------------------------------------------------
  useEffect(() => {
    if (!masterJson) return;

    // A. Actualizar Tempo Global y Automatizaciones de Transporte
    if (masterJson.project?.bpm) {
      Tone.Transport.bpm.cancelScheduledValues(0);
      Tone.Transport.bpm.setValueAtTime(masterJson.project.bpm, 0);
    }
    
    if (masterJson.automations) {
      masterJson.automations.filter(a => a.targetType === 'transport').forEach(auto => {
        const startSeconds = Tone.Time(auto.startTime).toSeconds();
        const endSeconds = Tone.Time(auto.endTime).toSeconds();
        const paramRef = Tone.Transport[auto.param]; // ej: bpm
        if (paramRef) {
          paramRef.setValueAtTime(auto.startValue, startSeconds);
          if (auto.curveType === 'linear') {
            paramRef.linearRampToValueAtTime(auto.endValue, endSeconds);
          } else {
            paramRef.exponentialRampToValueAtTime(auto.endValue, endSeconds);
          }
        }
      });
    }

    const currentBpm = Tone.Transport.bpm.value;

    // B. Actualizar canales (Volumen, Pan, Mute, Solo)
    if (masterJson.tracks) {
      masterJson.tracks.forEach(track => {
        const instrumentId = track.id || track.instrument;
        const channel = channelsRef.current[instrumentId];
        if (channel) {
          if (track.volume !== undefined) {
            channel.volume.cancelScheduledValues(0);
            channel.volume.rampTo(track.volume, 0.1);
          }
          if (track.pan !== undefined) {
            channel.pan.cancelScheduledValues(0);
            channel.pan.rampTo(track.pan, 0.1);
          }
          if (track.mute !== undefined) channel.mute = track.mute;
          if (track.solo !== undefined) channel.solo = track.solo;
        }
      });
    }
    
    // Automatizaciones de Canales (Crescendos, Paneos dinámicos)
    if (masterJson.automations) {
      masterJson.automations.filter(a => a.targetType === 'channel').forEach(auto => {
        const channel = channelsRef.current[auto.targetId];
        if (!channel) return;
        
        const paramRef = channel[auto.param]; // ej: channel.volume o channel.pan
        if (!paramRef) return;

        const startSeconds = Tone.Time(auto.startTime).toSeconds();
        const endSeconds = Tone.Time(auto.endTime).toSeconds();

        paramRef.cancelScheduledValues(0);
        paramRef.setValueAtTime(auto.startValue, startSeconds);
        
        if (auto.curveType === 'linear') {
          paramRef.linearRampToValueAtTime(auto.endValue, endSeconds);
        } else if (auto.curveType === 'exponential') {
          const safeEndValue = auto.endValue <= -100 ? -100 : auto.endValue;
          paramRef.exponentialRampToValueAtTime(safeEndValue, endSeconds);
        }
      });
    }

    // C. Línea de Tiempo Secuencial Absoluta (DELTA UPDATES)
    let absoluteBeatOffset = 0;
    const activeSequenceKeys = new Set();
    
    const sectionsToPlay = (isFullSongMode && masterJson.sectionsData) 
      ? masterJson.sectionsData 
      : (masterJson.sectionsData 
          ? masterJson.sectionsData.filter(s => s.id === masterJson.activeSectionId) 
          : [{ processedTracks: masterJson.tracks }]);

    sectionsToPlay.forEach(sec => {
      // Calcular la duración de esta sección en beats para recorrer el timeline
      let sectionBeats = 16; // fallback
      if (sec.chords) {
        sectionBeats = sec.chords.reduce((acc, c) => acc + (c.beats || 4), 0);
      }
      
      const startTimeOffset = `${absoluteBeatOffset} * 4n`;
      const tracksToProcess = sec.processedTracks || masterJson.tracks || [];

      tracksToProcess.forEach(track => {
        const instrumentId = track.id || track.instrument;
        const instrument = instrumentsRef.current[instrumentId];
        
        if (!instrument || !track.sequences) return;

        track.sequences.forEach(seq => {
          const partKey = `${seq.id}_${sec.id || absoluteBeatOffset}`;
          activeSequenceKeys.add(partKey);

          let processedNotes = [...(seq.notes || [])];

          // ── PROCESAMIENTO DE ARTICULACIONES ──
          const firstArticulation = processedNotes.find(n => n.articulation)?.articulation;
          if (firstArticulation && STRUM_ARTICULATIONS[firstArticulation]) {
            processedNotes = applyStrumming(processedNotes, STRUM_ARTICULATIONS[firstArticulation], currentBpm);
          }
          if (seq.groove && GROOVE_ARTICULATIONS.includes(seq.groove)) {
            processedNotes = applyGroove(processedNotes, seq.groove);
          }

          // ── LIMPIEZA DE TEXTURAS (reduceToDyad) ──
          if (instrumentId === 'piano') {
            const guitarTrack = masterJson.tracks?.find(t => t.id === 'guitar' || t.instrument === 'guitar');
            const isGuitarActive = guitarTrack && !guitarTrack.mute;
            processedNotes = processedNotes.map(n => {
              if (Array.isArray(n.pitch) && n.pitch.length >= 3 && (isGuitarActive || masterJson.project?.density === 'low')) {
                return { ...n, pitch: reduceToDyad(n.pitch) };
              }
              return n;
            });
          }

          // ── FILTRO ANTI-CHOQUES (evaluateHarmonicClash) ──
          if (instrumentId === 'violin' || instrumentId === 'melody' || track.type === 'melody') {
            const accompTracks = tracksToProcess.filter(t => t.id === 'piano' || t.id === 'guitar' || t.instrument === 'piano' || t.instrument === 'guitar');
            processedNotes = processedNotes.map(n => {
              let accompPitches = [];
              accompTracks.forEach(t => t.sequences?.forEach(s => s.notes?.forEach(an => {
                if (an.time === n.time && Array.isArray(an.pitch)) accompPitches.push(...an.pitch);
              })));
              
              if (accompPitches.length > 0 && typeof n.pitch === 'string') {
                const { hasClash, suggestedNote } = evaluateHarmonicClash(accompPitches, n.pitch);
                if (hasClash) return { ...n, pitch: suggestedNote, velocity: (n.velocity || 0.7) * 0.85 };
              }
              return n;
            });
          }

          // ── APLICAR ARTICULACIONES (staccato, legato, apoyado, tirando) ──
          processedNotes = processedNotes.map(n => applyArticulationParams(n));

          // ── DELTA UPDATE CHECK ──
          const currentHash = JSON.stringify(processedNotes);
          if (sequencesHashRef.current[partKey] === currentHash && partsRef.current[partKey]) {
            // Secuencia idéntica. Tone.js ya la tiene perfecta. Evitamos lag y clipping de envolventes.
            return;
          }

          // Si cambió, destruimos la versión vieja y creamos la nueva
          if (partsRef.current[partKey]) {
            partsRef.current[partKey].dispose();
          }

          // ── CREAR Tone.Part CON MICRO-TIMING Y OFFSET ABSOLUTO ──
          const part = new Tone.Part((time, noteValue) => {
            const microOffset = noteValue.timeOffset || 0;
            const actualTime = time + microOffset;
            const velocity = noteValue.velocity !== undefined ? noteValue.velocity : 0.7;
            const duration = noteValue.duration || "4n";

            instrument.triggerAttackRelease(noteValue.pitch, duration, actualTime, velocity);
          }, processedNotes);
          
          // Mapeo Absoluto vs Acumulativo
          const partStart = seq.absoluteStartTime || startTimeOffset;
          part.start(partStart);

          // Guardar en la referencia para el próximo Delta Check
          partsRef.current[partKey] = part;
          sequencesHashRef.current[partKey] = currentHash;
        });
      });

      // Sumar la duración para la siguiente sección
      absoluteBeatOffset += sectionBeats;
    });

    // ── GARBAGE COLLECTION (Limpiar secuencias huérfanas) ──
    Object.keys(partsRef.current).forEach(partKey => {
      if (!activeSequenceKeys.has(partKey)) {
        if (partsRef.current[partKey]) partsRef.current[partKey].dispose();
        delete partsRef.current[partKey];
        delete sequencesHashRef.current[partKey];
      }
    });

    // ── PARADA AUTOMÁTICA INTELIGENTE ──
    if (autoStopEventRef.current !== null) {
      Tone.Transport.clear(autoStopEventRef.current);
    }

    if (absoluteBeatOffset > 0) {
      autoStopEventRef.current = Tone.Transport.schedule((time) => {
        Tone.Transport.stop(time);
        console.log("⏹️ Auto-Stop: Composición finalizada en el beat absoluto", absoluteBeatOffset);
      }, `${absoluteBeatOffset} * 4n`);
    }

  }, [masterJson, isFullSongMode]);

  // ---------------------------------------------------------
  // 3. METRÓNOMO LÓGICO DEL CORE
  // ---------------------------------------------------------
  useEffect(() => {
    let repeatEventId;
    
    if (onBeatTick) {
      repeatEventId = Tone.Transport.scheduleRepeat((time) => {
        // La posición es un string o array, ejemplo: "0:2:0" (Compás 0, Beat 2, Semifusa 0)
        const position = Tone.Transport.position;
        if (typeof position === 'string') {
          const [bars, beats] = position.split(':').map(Number);
          const timeSig = masterJson?.project?.timeSignature?.[0] || 4;
          const currentAbsoluteBeat = (bars * timeSig) + beats;
          
          // Sincronizar el tick exacto de audio con el ciclo de render de React (seguro contra desfasajes)
          Tone.Draw.schedule(() => {
            onBeatTick(currentAbsoluteBeat);
          }, time);
        }
      }, "4n");
    }

    return () => {
      if (repeatEventId !== undefined) {
        Tone.Transport.clear(repeatEventId);
      }
    };
  }, [onBeatTick, masterJson?.project?.timeSignature]);

  // ---------------------------------------------------------
  // 3. CONTROLES GLOBALES DE TRANSPORTE
  // ---------------------------------------------------------
  const play = useCallback(async () => {
    // Tone.start() desbloquea el audio en los navegadores (requiere interacción previa del usuario)
    await Tone.start();
    Tone.Transport.start();
    console.log("▶️ Play: Transport iniciado");
  }, []);

  const stop = useCallback(() => {
    Tone.Transport.stop();
    console.log("⏹️ Stop: Transport detenido");
  }, []);

  const playNote = useCallback(async (pitch, duration = "4n", instrumentId = "piano") => {
    await Tone.start();
    const instrument = instrumentsRef.current[instrumentId];
    if (instrument) {
      const tonePitch = typeof pitch === 'number' ? Tone.Frequency(pitch, "midi").toNote() : pitch;
      instrument.triggerAttackRelease(tonePitch, duration);
    }
  }, []);

  const playChord = useCallback(async (pitches, duration = "4n", instrumentId = "piano") => {
    await Tone.start();
    const instrument = instrumentsRef.current[instrumentId];
    if (instrument) {
      instrument.triggerAttackRelease(pitches, duration);
    }
  }, []);

  return {
    instruments: instrumentsRef,
    parts: partsRef,
    channels: channelsRef,
    play,
    stop,
    playNote,
    playChord,
    isAudioLoaded
  };
};
