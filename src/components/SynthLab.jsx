import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Tone from 'tone';

export default function SynthLab() {
  // PILAR 1: Instancia Única en useRef para evitar clonaciones y cortes de audio en re-renders
  const synthRef = useRef(null);
  
  // Estado local SOLO para mantener la interfaz sincronizada (si hubieran sliders)
  const [synthParams, setSynthParams] = useState({
    oscType: 'sine',
    attack: 0.1,
    decay: 0.2,
    sustain: 0.5,
    release: 1
  });

  // PILAR 3: Clean-up estricto al desmontar el componente
  useEffect(() => {
    // Inicialización silenciosa: se crea el sintetizador al montar el Laboratorio
    synthRef.current = new Tone.Synth({
      oscillator: { type: synthParams.oscType },
      envelope: { 
        attack: synthParams.attack, 
        decay: synthParams.decay, 
        sustain: synthParams.sustain, 
        release: synthParams.release 
      }
    }).toDestination();

    console.log("🧪 Laboratorio: Sintetizador cargado y listo.");

    // Función de limpieza
    return () => {
      console.log("🧹 Laboratorio: Eliminando sintetizador de la memoria...");
      if (synthRef.current) {
        synthRef.current.dispose();
        synthRef.current = null;
      }
    };
    // El arreglo de dependencias vacío asegura que esto solo ocurra al montar/desmontar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // PILAR 2: Modificación Directa de Parámetros en tiempo real
  const handleOscillatorTypeChange = (type) => {
    setSynthParams(p => ({ ...p, oscType: type }));
    if (synthRef.current) {
      // Modificación directa y profunda sin reiniciar la instancia
      synthRef.current.oscillator.type = type;
    }
  };

  const handleEnvelopeChange = (param, value) => {
    const numValue = parseFloat(value);
    setSynthParams(p => ({ ...p, [param]: numValue }));
    if (synthRef.current) {
      // Se altera la envolvente ADSR en vivo. No rompe notas sostenidas, solo altera la curva
      synthRef.current.envelope[param] = numValue;
    }
  };

  // Función libre para probar el sonido
  const playTestNote = useCallback(async () => {
    await Tone.start();
    if (synthRef.current) {
      synthRef.current.triggerAttackRelease("C4", "8n");
    }
  }, []);

  // ESQUELETO VISUAL: Preparado para que luego agregues los inputs/sliders reales
  return (
    <section className="glass-panel synth-lab-panel" style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Laboratorio de Sintetizadores</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
        Modificación en vivo garantizada. Sin clics, sin fugas de memoria.
      </p>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <button className="btn-primary" onClick={playTestNote}>
          🔊 Probar Sonido (C4)
        </button>
      </div>

      {/* Aquí irían los controles reales, por ahora los exponemos visualmente como prueba */}
      <div style={{ background: 'var(--c-surface)', padding: '16px', borderRadius: 'var(--r-md)' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--accent-cyan)' }}>Parámetros Internos Expuestos</h3>
        <pre style={{ fontSize: '0.8rem', color: 'var(--c-text-3)', marginTop: '8px' }}>
          {JSON.stringify(synthParams, null, 2)}
        </pre>
      </div>
    </section>
  );
}
