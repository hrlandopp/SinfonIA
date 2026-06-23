import { useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';

export const useAudioEngine = (masterJson) => {
  // Referencias para mantener las instancias en memoria sin provocar re-renders en React
  const instrumentsRef = useRef({});
  const partsRef = useRef({});
  const channelsRef = useRef({});

  // ---------------------------------------------------------
  // 1. INICIALIZACIÓN DE INSTRUMENTOS (Se ejecuta una sola vez)
  // ---------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    const initAudio = async () => {
      // Piano Principal (Sampler)
      const piano = new Tone.Sampler({
        urls: {
          A0: "A0.mp3", C1: "C1.mp3", "D#1": "Ds1.mp3", "F#1": "Fs1.mp3",
          A1: "A1.mp3", C2: "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3",
          A2: "A2.mp3", C3: "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3",
          A3: "A3.mp3", C4: "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3",
          A4: "A4.mp3", C5: "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3",
          A5: "A5.mp3", C6: "C6.mp3", "D#6": "Ds6.mp3", "F#6": "Fs6.mp3",
          A6: "A6.mp3", C7: "C7.mp3", "D#7": "Ds7.mp3", "F#7": "Fs7.mp3",
          A7: "A7.mp3", C8: "C8.mp3"
        },
        baseUrl: "/samples/piano/",
        onload: () => {
          if (isMounted) console.log("🎹 Piano Principal cargado exitosamente.");
        }
      }).toDestination();

      // Bajo Sintético (FMSynth)
      const bass = new Tone.FMSynth({
        harmonicity: 3, modulationIndex: 10,
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.5 },
        modulation: { type: "square" },
        modulationEnvelope: { attack: 0.01, decay: 0.05, sustain: 0.0, release: 0.05 }
      }).toDestination();

      // Guardamos las instancias de los instrumentos (deben coincidir con los IDs del JSON)
      instrumentsRef.current = {
        track_01: piano,
        track_02: bass
      };
      
      console.log("🎧 Motor de audio inicializado.");
    };

    initAudio();

    return () => {
      isMounted = false;
      console.log("🧹 Limpiando memoria de instrumentos principales...");
      Object.values(instrumentsRef.current).forEach((instrument) => {
        if (instrument && typeof instrument.dispose === 'function') instrument.dispose();
      });
      instrumentsRef.current = {};
    };
  }, []);

  // ---------------------------------------------------------
  // 2. REACCIÓN AL JSON MAESTRO (Programación de Secuencias)
  // ---------------------------------------------------------
  useEffect(() => {
    if (!masterJson) return;

    // A. Actualizar Tempo Global
    if (masterJson.project?.bpm) {
      Tone.Transport.bpm.value = masterJson.project.bpm;
    }

    // B. Leer tracks y crear Tone.Parts (Secuencias)
    if (masterJson.tracks) {
      masterJson.tracks.forEach(track => {
        const instrument = instrumentsRef.current[track.id];
        
        // Si el instrumento no está cargado o no hay secuencias, saltar
        if (!instrument || !track.sequences) return;

        track.sequences.forEach(seq => {
          // Crear la secuencia en Tone.js
          const part = new Tone.Part((time, noteValue) => {
            instrument.triggerAttackRelease(
              noteValue.pitch,
              noteValue.duration,
              time,
              noteValue.velocity
            );
          }, seq.notes);
          
          // Anclar la parte al timeline en el tiempo indicado por seq.startTime
          part.start(seq.startTime);

          // Guardar en la referencia para poder destruirla
          partsRef.current[seq.id] = part;
        });
      });
    }

    // CLEAN-UP DE PARTES: Si el JSON cambia, destruimos las partes viejas 
    // antes de que el próximo render cree las nuevas (evita duplicidad de notas)
    return () => {
      Object.values(partsRef.current).forEach((part) => {
        if (part && typeof part.dispose === 'function') {
          part.dispose();
        }
      });
      partsRef.current = {};
    };
  }, [masterJson]);

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

  const playNote = useCallback(async (pitch, duration = "4n") => {
    await Tone.start();
    const piano = instrumentsRef.current['track_01'];
    if (piano) {
      const tonePitch = typeof pitch === 'number' ? Tone.Frequency(pitch, "midi").toNote() : pitch;
      piano.triggerAttackRelease(tonePitch, duration);
    }
  }, []);

  const playChord = useCallback(async (pitches, duration = "4n") => {
    await Tone.start();
    const piano = instrumentsRef.current['track_01'];
    if (piano) {
      piano.triggerAttackRelease(pitches, duration);
    }
  }, []);

  return {
    instruments: instrumentsRef,
    parts: partsRef,
    channels: channelsRef,
    play,
    stop,
    playNote,
    playChord
  };
};
