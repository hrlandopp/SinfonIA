import React, { createContext, useContext, useState, useRef, useEffect, useMemo } from 'react';
import { useAudioEngine } from '../core/useAudioEngine';

const BeatContext = createContext(0);
const PlaybackContext = createContext(null);

export const PlaybackProvider = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  
  // Array de refs para mutar directamente los estilos del DOM y evitar re-renders en canvas de alta velocidad
  const playheadRefs = useRef([]);

  useEffect(() => {
    // Metrónomo aislado para evitar re-renders en la raíz
    const repeatId = Tone.Transport.scheduleRepeat((time) => {
      const position = Tone.Transport.position;
      if (typeof position === 'string') {
        const [bars, beats] = position.split(':').map(Number);
        const timeSig = Tone.Transport.timeSignature;
        const ts = Array.isArray(timeSig) ? timeSig[0] : timeSig;
        const currentAbsoluteBeat = (bars * (ts || 4)) + beats;
        
        Tone.Draw.schedule(() => {
          setCurrentBeat(currentAbsoluteBeat);
          
          // Failsafe: Mutación directa del DOM para la barra de reproducción
          if (playheadRefs.current.length > 0) {
            playheadRefs.current.forEach(ref => {
              if (ref && ref.style) {
                // By-pass de React:
                // ref.style.transform = `translateX(${currentAbsoluteBeat * zoomFactor}px)`;
              }
            });
          }
        }, time);
      }
    }, "4n");

    return () => Tone.Transport.clear(repeatId);
  }, []);

  // Memoizar el contexto estático para que los consumidores de isPlaying NO se re-rendericen en cada beat
  const playbackValue = useMemo(() => ({
    isPlaying,
    setIsPlaying,
    playheadRefs
  }), [isPlaying]);

  return (
    <PlaybackContext.Provider value={playbackValue}>
      <BeatContext.Provider value={currentBeat}>
        {children}
      </BeatContext.Provider>
    </PlaybackContext.Provider>
  );
};

// Hook híbrido para componentes visuales (PianoRoll, Secuenciador)
export const usePlayback = () => {
  const beat = useContext(BeatContext);
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error('usePlayback debe ser usado dentro de un PlaybackProvider');
  return { ...ctx, currentBeat: beat };
};

// Hook estático para la raíz o botones de control (Evita los 60 FPS)
export const usePlaybackControls = () => {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error('usePlaybackControls debe ser usado dentro de un PlaybackProvider');
  return ctx;
};
