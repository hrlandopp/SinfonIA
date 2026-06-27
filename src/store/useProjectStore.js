import { create } from 'zustand';
import { temporal } from 'zundo';
import { compileMasterJson } from '../core/musicCompiler';

export const useProjectStore = create(
  temporal(
    (set, get) => ({
      projectsList: [],
      project: null,
      sections: [],
      activeSectionId: '',
      
      useLocalMode: localStorage.getItem('use_local_mode') === 'true',
      dbStatus: 'Modo Local',
      
      instruments: {
        guitar: { active: true, volume: -14, type: 'strum', editorType: 'fretboard' },
        piano:  { active: true, volume: -18, type: 'arpeggio', editorType: 'pianoroll' },
        bass:   { active: true, volume: -16, type: 'roots', editorType: 'fretboard' },
        drums:  { active: true, volume: -12, type: 'basic', editorType: 'pianoroll' }, // TODO: drumrack
        strings: { active: false, volume: -20, type: 'pad', editorType: 'pianoroll' },
        violin: { active: false, volume: -18, type: 'melody', editorType: 'pianoroll' },
        vibraphone: { active: false, volume: -16, type: 'chords', editorType: 'pianoroll' },
        
        // Nuevos Instrumentos (14)
        bassoon: { active: false, volume: -16, type: 'melody', editorType: 'pianoroll' },
        clarinet: { active: false, volume: -16, type: 'melody', editorType: 'pianoroll' },
        contrabass: { active: false, volume: -18, type: 'roots', editorType: 'pianoroll' },
        flute: { active: false, volume: -16, type: 'melody', editorType: 'pianoroll' },
        frenchHorn: { active: false, volume: -16, type: 'pad', editorType: 'pianoroll' },
        guitarElectric: { active: false, volume: -14, type: 'strum', editorType: 'fretboard' },
        guitarNylon: { active: false, volume: -14, type: 'arpeggio', editorType: 'fretboard' },
        harmonium: { active: false, volume: -18, type: 'pad', editorType: 'pianoroll' },
        harp: { active: false, volume: -16, type: 'arpeggio', editorType: 'pianoroll' },
        organ: { active: false, volume: -18, type: 'pad', editorType: 'pianoroll' },
        saxophone: { active: false, volume: -14, type: 'melody', editorType: 'pianoroll' },
        trombone: { active: false, volume: -14, type: 'melody', editorType: 'pianoroll' },
        trumpet: { active: false, volume: -14, type: 'melody', editorType: 'pianoroll' },
        tuba: { active: false, volume: -16, type: 'roots', editorType: 'pianoroll' }
      },

      masterJson: {
        project: { id: "sinfonia_001", name: "Mi Primera Composición", bpm: 120, timeSignature: [4, 4], key: "C", scale: "major" },
        tracks: [
          { id: "piano", name: "Piano Principal", type: "sampler", instrument: "piano", volume: -6.0, pan: 0, mute: false, solo: false, sequences: [] },
          { id: "bass", name: "Bajo Eléctrico", type: "sampler", instrument: "bass", volume: -12.0, pan: 0, mute: false, solo: false, sequences: [] }
        ]
      },

      setProjectsList: (list) => set({ projectsList: list }),
      setProject: (proj) => set({ project: proj }),
      setSections: (secs) => set((state) => {
        const newSections = typeof secs === 'function' ? secs(state.sections) : secs;
        const newMasterJson = compileMasterJson(newSections, state.activeSectionId, state.masterJson);
        return { sections: newSections, masterJson: newMasterJson };
      }),
      setActiveSectionId: (id) => set((state) => {
        const newId = typeof id === 'function' ? id(state.activeSectionId) : id;
        const newMasterJson = compileMasterJson(state.sections, newId, state.masterJson);
        return { activeSectionId: newId, masterJson: newMasterJson };
      }),
      setInstruments: (insts) => set((state) => ({ 
        instruments: typeof insts === 'function' 
          ? insts(state.instruments) 
          : { ...state.instruments, ...insts } 
      })),
      setMasterJson: (json) => set({ masterJson: typeof json === 'function' ? json(get().masterJson) : json }),
      setUseLocalMode: (mode) => {
        localStorage.setItem('use_local_mode', mode);
        set({ useLocalMode: mode });
      },
      setDbStatus: (status) => set({ dbStatus: status })
    }),
    { limit: 5 }
  )
);
