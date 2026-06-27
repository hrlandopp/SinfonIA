import { create } from 'zustand';

export const useUIStore = create((set) => ({
  currentLayout: 'launcher',
  uiFocusContext: {
    activeTab: 'editor',
    selectedInstrument: 'guitar',
    selectedSectionId: null,
    currentBeat: 0,
    lastUserAction: 'initialize'
  },
  mascotAlert: null,
  activeNoteEdit: null,
  isAnalysisOpen: false,

  setCurrentLayout: (layout) => set({ currentLayout: layout }),
  
  updateUIFocus: (updates) => set((state) => ({
    uiFocusContext: { ...state.uiFocusContext, ...updates }
  })),

  setMascotAlert: (alert) => set({ mascotAlert: alert }),
  setActiveNoteEdit: (note) => set({ activeNoteEdit: note }),
  setIsAnalysisOpen: (isOpen) => set({ isAnalysisOpen: isOpen }),
}));
