import { useEffect, useCallback, useMemo } from 'react';
import debounce from 'lodash.debounce';
import localforage from 'localforage';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { useProjectStore } from '../store/useProjectStore';
import { useUIStore } from '../store/useUIStore';

const INITIAL_PROJECTS = [
  { id: 'local-proj-1', name: 'Balada de Otoño',    tempo_bpm: 85,  key_signature: 'Em', capo_position: 2, mood: 'Melancólico', cover_art: '', updated_at: new Date().toISOString() },
  { id: 'local-proj-2', name: 'Ritmo del Desierto', tempo_bpm: 120, key_signature: 'Am', capo_position: 0, mood: 'Enérgico',    cover_art: '', updated_at: new Date().toISOString() },
];

const DEFAULT_SECTIONS = [
  { id: 'sec-intro', name: 'Intro', order_index: 0, chords: [{ chordLabel: 'Am', beats: 4, events: null }, { chordLabel: 'F', beats: 4, events: null }, { chordLabel: 'C', beats: 4, events: null }, { chordLabel: 'G', beats: 4, events: null }], accompaniment: { guitar: 'strum', piano: 'arpeggio', bass: 'roots', drums: 'basic', strings: 'pad', violin: 'melody', vibraphone: 'chords' } },
  { id: 'sec-verso', name: 'Verso', order_index: 1, chords: [{ chordLabel: 'Am', beats: 4, events: null }, { chordLabel: 'Dm', beats: 4, events: null }, { chordLabel: 'G',  beats: 4, events: null }, { chordLabel: 'C', beats: 4, events: null }], accompaniment: { guitar: 'strum', piano: 'arpeggio', bass: 'roots', drums: 'basic', strings: 'pad', violin: 'melody', vibraphone: 'chords' } },
];

export function useProjects() {
  const { 
    projectsList, setProjectsList, project, setProject, sections, setSections, 
    setActiveSectionId, useLocalMode, setDbStatus 
  } = useProjectStore();
  const { setCurrentLayout } = useUIStore();

  const isCloudActive = isSupabaseConfigured() && !useLocalMode;

  const resetLocalProjects = useCallback(() => {
    setProjectsList(INITIAL_PROJECTS);
    localforage.setItem('local_projects_list', INITIAL_PROJECTS);
  }, [setProjectsList]);

  const loadFromSupabase = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('projects').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      setProjectsList(data || []);
    } catch (e) {
      console.error(e);
      setDbStatus('Error en Supabase');
    }
  }, [setProjectsList, setDbStatus]);

  // Initial load
  useEffect(() => {
    if (isCloudActive) {
      setDbStatus('Conectado a Supabase ⚡');
      loadFromSupabase();
    } else {
      setDbStatus(isSupabaseConfigured() ? 'Modo Local (Supabase desactivado)' : 'Modo Local');
      const loadLocal = async () => {
        try {
          const saved = await localforage.getItem('local_projects_list');
          if (saved && Array.isArray(saved)) {
            setProjectsList(saved);
          } else {
            resetLocalProjects();
          }
        } catch (e) {
          console.error("Error loading local projects:", e);
          resetLocalProjects();
        }
      };
      loadLocal();
    }
  }, [useLocalMode, isCloudActive, loadFromSupabase, resetLocalProjects, setDbStatus, setProjectsList]);

  const saveLocal = (list) => {
    setProjectsList(list);
    localforage.setItem('local_projects_list', list);
  };

  const saveToSupabase = async (proj, secs, chat = []) => {
    if (!supabase) return;
    try {
      await supabase.from('projects')
        .update({ name: proj.name, tempo_bpm: proj.tempo_bpm, key_signature: proj.key_signature, capo_position: proj.capo_position, mood: proj.mood, cover_art: proj.cover_art, updated_at: new Date().toISOString() })
        .eq('id', proj.id);
      
      await supabase.from('sections').delete().eq('project_id', proj.id);
      const secInserts = secs.map(s => ({
        project_id: proj.id, 
        name: s.name, 
        order_index: s.order_index, 
        chords: JSON.parse(JSON.stringify(s.chords)),
        accompaniment: JSON.parse(JSON.stringify(s.accompaniment)),
        melody: s.melody ? JSON.parse(JSON.stringify(s.melody)) : [],
        tracks: s.tracks ? JSON.parse(JSON.stringify(s.tracks)) : null
      }));
      await supabase.from('sections').insert(secInserts);

      if (chat && chat.length > 0) {
        await supabase.from('chat_history').delete().eq('project_id', proj.id);
        const chatInserts = chat.map(c => ({
          project_id: proj.id, sender: c.sender, message: c.message, created_at: c.created_at || new Date().toISOString()
        }));
        await supabase.from('chat_history').insert(chatInserts);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const debouncedSaveToSupabase = useMemo(() => debounce((proj, secs, chat) => saveToSupabase(proj, secs, chat), 1500), []);

  const saveState = (proj, secs, chat = null) => {
    if (isCloudActive && proj.id !== 'local-project') { 
      debouncedSaveToSupabase(proj, secs, chat);
    } else {
      saveLocal(projectsList.map(p => p.id === proj.id ? { ...proj, updated_at: new Date().toISOString() } : p));
      localforage.setItem(`local_secs_${proj.id}`, secs);
      if (chat) localforage.setItem(`local_chat_${proj.id}`, chat);
    }
  };

  const selectProject = async (sel) => {
    setProject(sel);
    const fallbackSecs = () => DEFAULT_SECTIONS.map(s => ({ ...s, id: `${s.id}-${Date.now()}` }));
    const fallbackChat = (name) => [{ id: 'welcome', sender: 'assistant', message: `¡Bienvenido a "${name}"! ¿Qué quieres componer hoy?` }];

    if (isCloudActive && sel.id !== 'local-project') {
      try {
        let { data: secs } = await supabase.from('sections').select('*').eq('project_id', sel.id).order('order_index', { ascending: true });
        let finalSecs = secs || [];
        if (!finalSecs.length) {
          const { data: ins } = await supabase.from('sections').insert(DEFAULT_SECTIONS.map((s, i) => ({ project_id: sel.id, name: s.name, order_index: i, chords: s.chords, accompaniment: s.accompaniment }))).select();
          finalSecs = ins || fallbackSecs();
        }
        setSections(finalSecs);
        setActiveSectionId(finalSecs[0]?.id || '');
      } catch (e) {
        console.error(e);
        const ls = await localforage.getItem(`local_secs_${sel.id}`);
        const finalSecs = ls ? ls : fallbackSecs();
        setSections(finalSecs);
        setActiveSectionId(finalSecs[0]?.id || '');
      }
    } else {
      const ls = await localforage.getItem(`local_secs_${sel.id}`);
      const finalSecs = ls ? ls : fallbackSecs();
      setSections(finalSecs);
      setActiveSectionId(finalSecs[0]?.id || '');
      if (!ls) localforage.setItem(`local_secs_${sel.id}`, finalSecs);
    }
    setCurrentLayout('workspace');
  };

  const createProject = async (name) => {
    const data = { name: name.trim(), tempo_bpm: 120, key_signature: 'C', capo_position: 0, mood: 'Neutral', cover_art: '', updated_at: new Date().toISOString() };
    if (isCloudActive) {
      try {
        const { data: p, error } = await supabase.from('projects').insert([data]).select(); 
        if (error) throw error;
        await supabase.from('sections').insert(DEFAULT_SECTIONS.map((s, i) => ({ project_id: p[0].id, name: s.name, order_index: i, chords: s.chords, accompaniment: s.accompaniment })));
        await loadFromSupabase();
        selectProject(p[0]);
      } catch (e) { 
        alert(`Error: ${e.message}`);
      }
    } else { 
      const proj = { ...data, id: `local-${Date.now()}` }; 
      saveLocal([proj, ...projectsList]); 
      selectProject(proj); 
    }
  };

  return {
    isCloudActive,
    loadFromSupabase,
    saveState,
    selectProject,
    createProject
  };
}
