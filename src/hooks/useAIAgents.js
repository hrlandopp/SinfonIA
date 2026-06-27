import { useState, useEffect } from 'react';
import localforage from 'localforage';
import { supabase } from '../utils/supabaseClient';
import { useProjectStore } from '../store/useProjectStore';
import { useUIStore } from '../store/useUIStore';
import { isGeminiConfigured, sendMessageToProducerAI, sendMessageToEducatorAI } from '../utils/geminiClient';

export function useAIAgents() {
  const [producerHistory, setProducerHistory] = useState([]);
  const [mascotHistory, setMascotHistory] = useState([]);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  const { project, setProject, sections, setSections, activeSectionId, setActiveSectionId, instruments, setInstruments, isCloudActive, masterJson } = useProjectStore();
  const { uiFocusContext, mascotAlert } = useUIStore();

  // Cargar historial de chat cuando cambia el proyecto
  useEffect(() => {
    if (!project) return;
    const fallbackChat = (name) => [{ id: 'welcome', sender: 'assistant', message: `¡Bienvenido a "${name}"! ¿Qué quieres componer hoy?` }];
    
    const loadChat = async () => {
      if (isCloudActive && project.id !== 'local-project') {
        try {
          const { data: chat } = await supabase.from('chat_history').select('*').eq('project_id', project.id).order('created_at', { ascending: true });
          setProducerHistory(chat?.length ? chat : fallbackChat(project.name));
        } catch (e) {
          const lc = await localforage.getItem(`local_chat_${project.id}`);
          setProducerHistory(lc ? lc : fallbackChat(project.name));
        }
      } else {
        const lc = await localforage.getItem(`local_chat_${project.id}`);
        setProducerHistory(lc ? lc : fallbackChat(project.name));
      }
    };
    loadChat();
  }, [project, isCloudActive]);

  const saveChatLocal = (hist) => {
    if (project) {
      localforage.setItem(`local_chat_${project.id}`, hist);
    }
  };

  const handleAgentInteraction = async (agentType, promptOverride = null) => {
    const txt = promptOverride;
    if (!txt || isLoadingAi) return;
    if (!isGeminiConfigured()) {
      alert('Configura tu Gemini API Key en Ajustes primero.');
      return;
    }
    
    const userMsg = { id: `u-${Date.now()}`, sender: 'user', message: txt };
    const currentHistory = agentType === 'producer' ? producerHistory : mascotHistory;
    const setHistory = agentType === 'producer' ? setProducerHistory : setMascotHistory;
    
    const hist = [...currentHistory, userMsg]; 
    setHistory(hist); 
    setIsLoadingAi(true);

    try {
      const context = {
        // masterJson is skipped here to avoid passing huge object, we can pass what's needed
        uiFocus: uiFocusContext,
        opposingHistory: agentType === 'producer' ? mascotHistory.slice(-5) : producerHistory.slice(-5)
      };

      let ai;
      if (agentType === 'producer') {
        ai = await sendMessageToProducerAI(userMsg.message, hist, masterJson);
      } else {
        ai = await sendMessageToEducatorAI(userMsg.message, hist, uiFocusContext);
      }

      const aMsg = { id: `a-${Date.now()}`, sender: 'assistant', message: ai.message || 'Sin respuesta.' };
      let uProj = { ...project }, uSecs = [...sections]; 
      const ch = ai.changes;

      if (ch && Object.keys(ch).length > 0) {
        if (ch.tempo_bpm) uProj = { ...uProj, tempo_bpm: ch.tempo_bpm };
        if (ch.key_signature) uProj = { ...uProj, key_signature: ch.key_signature };
        if (typeof ch.capo_position === 'number') uProj = { ...uProj, capo_position: ch.capo_position };
        if (ch.mood) uProj = { ...uProj, mood: ch.mood };
        if (ch.instruments) {
          Object.keys(ch.instruments).forEach(k => {
            if (instruments[k]) {
              setInstruments(p => ({...p, [k]: {...p[k], ...ch.instruments[k]}}));
            }
          });
        }
        if (ch.sections?.length) {
          const aiTracks = ch.tracks || null;
          uSecs = ch.sections.map((s, i) => ({
            id: sections[i]?.id || `sec-ai-${Date.now()}-${i}`,
            name: s.name,
            order_index: s.order_index ?? i,
            chords: s.chords || [],
            melody: s.melody || sections[i]?.melody || [],
            accompaniment: sections[i]?.accompaniment || { guitar: 'strum', piano: 'arpeggio', bass: 'roots', drums: 'basic', strings: 'pad', violin: 'melody', vibraphone: 'chords' },
            tracks: aiTracks || sections[i]?.tracks || null
          }));
        } else if (ch.tracks?.length) {
          uSecs = sections.map(s => {
            if (s.id === activeSectionId) return { ...s, tracks: ch.tracks };
            return s;
          });
        }
        setProject(uProj); 
        setSections(uSecs);
        if (uSecs.length > 0 && !uSecs.find(s => s.id === activeSectionId)) setActiveSectionId(uSecs[0].id);
        
        const logParts = [ch.tempo_bpm && `${ch.tempo_bpm} BPM`, ch.key_signature && `Tono: ${ch.key_signature}`, ch.sections && `${ch.sections.length} secciones`, ch.tracks && `${ch.tracks.length} tracks orquestados`].filter(Boolean).join(' · ');
        const log = { id: `l-${Date.now()}`, sender: 'system', message: `Cambios aplicados — ${logParts}` };
        const final = [...hist, aMsg, log]; 
        setHistory(final); 
        if (agentType === 'producer') saveChatLocal(final);
      } else {
        const final = [...hist, aMsg]; 
        setHistory(final); 
        if (agentType === 'producer') saveChatLocal(final);
      }
    } catch(err) { 
      setHistory(p => [...p, { id: `e-${Date.now()}`, sender: 'assistant', message: `Error: ${err.message}` }]);
    } finally {
      setIsLoadingAi(false);
    }
  };

  const requestMascotHelp = () => {
    if (!mascotAlert) return;
    const payload = `Resolver anomalía armónica: ${mascotAlert.message}. Delta: ${JSON.stringify(mascotAlert.delta)}`;
    handleAgentInteraction('mascot', payload);
  };

  return {
    producerHistory,
    mascotHistory,
    isLoadingAi,
    handleAgentInteraction,
    requestMascotHelp
  };
}
