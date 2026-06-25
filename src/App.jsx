import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Play, Pause, Square, Send, Settings, Plus, Trash2,
  Music, Sparkles, ChevronLeft,
  FolderOpen, BookOpen, HardDrive, Image as ImageIcon
} from 'lucide-react'

import debounce from 'lodash.debounce'
import { supabase, isSupabaseConfigured, saveSupabaseCredentials } from './utils/supabaseClient'
import {
  runDeepCompositionAnalysis,
  generateSongArt,
  isGeminiConfigured,
  saveGeminiKey
} from './utils/geminiClient'
import { sendMessageToAI } from './utils/aiClient'
import { useAudioEngine } from './hooks/useAudioEngine'
import { parseChordNotes } from './utils/musicTheory'
import { evaluateHarmonicClash } from './utils/musicLogic'
import { usePlaybackControls } from './context/PlaybackContext.jsx'
import Fretboard from './components/Fretboard'
import PianoRoll from './components/PianoRoll'
import GuitarChordDiagram from './components/GuitarChordDiagram'
import ControlBar from './components/ControlBar'
import AIManagerPanel from './components/AIManagerPanel'
import WorkspaceContainer from './components/WorkspaceContainer'

const INITIAL_PROJECTS = [
  { id: 'local-proj-1', name: 'Balada de Otoño',    tempo_bpm: 85,  key_signature: 'Em', capo_position: 2, mood: 'Melancólico', cover_art: '', updated_at: new Date().toISOString() },
  { id: 'local-proj-2', name: 'Ritmo del Desierto', tempo_bpm: 120, key_signature: 'Am', capo_position: 0, mood: 'Enérgico',    cover_art: '', updated_at: new Date().toISOString() },
]

const DEFAULT_SECTIONS = [
  { id: 'sec-intro', name: 'Intro', order_index: 0, chords: [{ chordLabel: 'Am', beats: 4, events: null }, { chordLabel: 'F', beats: 4, events: null }, { chordLabel: 'C', beats: 4, events: null }, { chordLabel: 'G', beats: 4, events: null }], accompaniment: { guitar: 'strum', piano: 'arpeggio', bass: 'roots', drums: 'basic', strings: 'pad', violin: 'melody', vibraphone: 'chords' } },
  { id: 'sec-verso', name: 'Verso', order_index: 1, chords: [{ chordLabel: 'Am', beats: 4, events: null }, { chordLabel: 'Dm', beats: 4, events: null }, { chordLabel: 'G',  beats: 4, events: null }, { chordLabel: 'C', beats: 4, events: null }], accompaniment: { guitar: 'strum', piano: 'arpeggio', bass: 'roots', drums: 'basic', strings: 'pad', violin: 'melody', vibraphone: 'chords' } },
]

export default function App() {
  const [masterJson, setMasterJson] = useState({
    project: {
      id: "sinfonia_001",
      name: "Mi Primera Composición",
      bpm: 120,
      timeSignature: [4, 4],
      key: "C",
      scale: "major"
    },
    tracks: [
      {
        id: "piano",
        name: "Piano Principal",
        type: "sampler", 
        instrument: "piano", 
        volume: -6.0, 
        pan: 0,
        mute: false,
        solo: false,
        sequences: []
      },
      {
        id: "bass",
        name: "Bajo Eléctrico",
        type: "sampler",
        instrument: "bass",
        volume: -12.0,
        pan: 0,
        mute: false,
        solo: false,
        sequences: []
      }
    ]
  })


  // ── SINFONIA PRO: Nuevos Estados ──
  const [focusedZone, setFocusedZone] = useState('canvas')
  const [activeMidiTrack, setActiveMidiTrack] = useState(null)
  const [audioPerf, setAudioPerf] = useState({ cpu: 12.4, memory: 45 })

  const [currentView,    setCurrentView]    = useState('dashboard')
  const [activeTab,      setActiveTab]      = useState('projects')
  const [projectsList,   setProjectsList]   = useState([])
  const [project,        setProject]        = useState(null)
  const [sections,       setSections]       = useState([])
  const [activeSectionId,setActiveSectionId]= useState('')
  const { isPlaying, setIsPlaying } = usePlaybackControls()

  // Efecto simulador de carga de audio
  useEffect(() => {
    if (!isPlaying) {
      setAudioPerf({ cpu: 2.1, memory: 45 })
      return
    }
    const interval = setInterval(() => {
      setAudioPerf({ 
        cpu: (12 + Math.random() * 8).toFixed(1), 
        memory: (45 + Math.random() * 2).toFixed(1) 
      })
    }, 300)
    return () => clearInterval(interval)
  }, [isPlaying])

  // currentBeat y metrónomo alta velocidad fueron movidos a PlaybackContext
  const [totalBeats,     setTotalBeats]     = useState(16)
  const [currentChordIdx,setCurrentChordIdx]= useState(0)
  const [currentChord,   setCurrentChord]   = useState('')
  const [producerHistory, setProducerHistory] = useState([])
  const [mascotHistory,   setMascotHistory]   = useState([])
  const [producerProvider, setProducerProvider] = useState('gemini')
  const [mascotProvider,   setMascotProvider]   = useState('openai')
  const [chatInput,      setChatInput]      = useState('')
  const [isLoadingAi,    setIsLoadingAi]    = useState(false)
  const [analysisResult, setAnalysisResult] = useState('')
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false)
  const [isGeneratingArt,setIsGeneratingArt]= useState(false)
  const [instruments,    setInstruments]    = useState({
    guitar: { active: true, volume: -14, type: 'strum' },
    piano:  { active: true, volume: -18, type: 'arpeggio' },
    bass:   { active: true, volume: -16, type: 'roots' },
    drums:  { active: true, volume: -12, type: 'basic' },
    strings: { active: false, volume: -20, type: 'pad' },
    violin: { active: false, volume: -18, type: 'melody' },
    vibraphone: { active: false, volume: -16, type: 'chords' }
  })
  const [supabaseUrl,    setSupabaseUrl]    = useState(localStorage.getItem('supabase_url') || '')
  const [supabaseKey,    setSupabaseKey]    = useState(localStorage.getItem('supabase_anon_key') || '')
  const [geminiKey,      setGeminiKey]      = useState(localStorage.getItem('gemini_api_key') || '')
  const [dbStatus,       setDbStatus]       = useState('Modo Local')
  const [geminiTestResult, setGeminiTestResult] = useState('')
  const [isTestingGemini,  setIsTestingGemini]  = useState(false)
  const [useLocalMode,   setUseLocalMode]   = useState(() => localStorage.getItem('use_local_mode') === 'true')
  const [activeBottomTab, setActiveBottomTab] = useState('fretboard')
  const [collapsedTimelineTracks, setCollapsedTimelineTracks] = useState({})
  const [collapsedMixerChannels, setCollapsedMixerChannels] = useState({})
  const chatEndRef = useRef(null)

  const [uiFocusContext, setUiFocusContext] = useState({
    activeTab: 'editor',
    selectedInstrument: 'guitar',
    selectedSectionId: null,
    currentBeat: 0,
    lastUserAction: 'initialize'
  })

  const updateUIFocus = useCallback((updates) => {
    setUiFocusContext(prev => ({ ...prev, ...updates }));
  }, [])

  const [mascotAlert, setMascotAlert] = useState(null)
  const [activeNoteEdit, setActiveNoteEdit] = useState(null)

  useEffect(() => {
    if (!activeNoteEdit) return;
    if (currentChord) {
      const currentChordNotes = parseChordNotes(currentChord, 3);
      const { hasClash, suggestedNote } = evaluateHarmonicClash(currentChordNotes, activeNoteEdit.pitch);
      if (hasClash) {
        setMascotAlert({
          hasLocalError: true,
          message: `¡Ojo! La nota ${activeNoteEdit.pitch} choca armónicamente con el acorde actual (${currentChord}). Te sugiero usar ${suggestedNote} en su lugar.`,
          delta: { chord: currentChord, badNote: activeNoteEdit.pitch, suggestedNote }
        });
      } else {
        setMascotAlert(null);
      }
    }
  }, [activeNoteEdit, currentChord]);

  const isCloudActive = isSupabaseConfigured() && !useLocalMode

  // ── Sincronizador de UI -> JSON Maestro ──
  // Absorbe orquestaciones nativas de Gemini si existen, o genera fallback inteligente
  useEffect(() => {
    const sec = sections.find(s => s.id === activeSectionId)
    if (!sec) return

    setMasterJson(prev => {
      const nextJson = { ...prev };

      // ═══ PROCESAMIENTO DE TODAS LAS SECCIONES ═══
      nextJson.sectionsData = [...sections].sort((a,b) => a.order_index - b.order_index).map(sec => {
        let generatedTracks = [];

        if (sec.tracks && sec.tracks.length > 0) {
          const existingMixMap = {};
          (prev.tracks || []).forEach(t => { existingMixMap[t.id] = { volume: t.volume, pan: t.pan, mute: t.mute, solo: t.solo }; });

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
              const melodyNotes = sec.melody.map(m => ({ pitch: m.note, time: `${m.beat} * 4n`, duration: m.duration || "8n", velocity: 0.8 }));
              if (pianoTrack.sequences.length > 0) {
                pianoTrack.sequences[0].notes = [...pianoTrack.sequences[0].notes, ...melodyNotes];
              } else {
                pianoTrack.sequences.push({ id: `seq_melody_${sec.id}`, startTime: "0:0:0", notes: melodyNotes });
              }
            }
          }
        } else {
          const trackNotes = { piano: [], bass: [], guitar: [] };
          let cumulativeBeat = 0;

          sec.chords.forEach(c => {
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
              const existingTrack = (prev.tracks || []).find(t => t.id === instrId);
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

      // Mantenemos masterJson.tracks referenciando sólo a la activa para compatibilidad del mixer
      nextJson.activeSectionId = activeSectionId;
      const activeSecData = nextJson.sectionsData.find(s => s.id === activeSectionId);
      if (activeSecData) {
        nextJson.tracks = activeSecData.processedTracks;
      }

      return nextJson;
    });
  }, [sections, activeSectionId]);

  // ── Effects ─────────────────────────────────────────────────────
  useEffect(() => {
    if (isCloudActive) { setDbStatus('Conectado a Supabase ⚡'); loadFromSupabase() }
    else {
      setDbStatus(isSupabaseConfigured() ? 'Modo Local (Supabase desactivado)' : 'Modo Local')
      const saved = localStorage.getItem('local_projects_list')
      if (saved) { try { setProjectsList(JSON.parse(saved)) } catch { reset() } }
      else reset()
    }
  }, [useLocalMode])

  const reset = () => { setProjectsList(INITIAL_PROJECTS); localStorage.setItem('local_projects_list', JSON.stringify(INITIAL_PROJECTS)) }

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [producerHistory, mascotHistory])

  useEffect(() => {
    const sec = sections.find(s => s.id === activeSectionId)
    if (!sec) return
    setTotalBeats(sec.chords.reduce((a, c) => a + (c.beats || 4), 0))
    if (sec.accompaniment) Object.keys(sec.accompaniment).forEach(k => {
      setInstruments(p => ({...p, [k]: {...p[k], type: sec.accompaniment[k]}}))
    })
  }, [sections, activeSectionId])

  // ── Sincronización Lenta de Acordes (El transporte real vive en PlaybackContext) ──
  const handleBeatTick = useCallback((beat) => {
    const sec = sections.find(s => s.id === activeSectionId);
    if (sec && sec.chords) {
      let sum = 0;
      for (let i = 0; i < sec.chords.length; i++) {
        const c = sec.chords[i];
        const chordBeats = c.beats || 4;
        if (beat >= sum && beat < sum + chordBeats) {
          setCurrentChordIdx(prev => prev !== i ? i : prev);
          const newChord = c.chordLabel || c.chord || '';
          setCurrentChord(prev => prev !== newChord ? newChord : prev);
          break;
        }
        sum += chordBeats;
      }
    }
  }, [sections, activeSectionId]);

  const { play, stop, playNote, playChord } = useAudioEngine(masterJson, handleBeatTick);

  // ── Storage ──────────────────────────────────────────────────────
  const saveLocal = (list) => { setProjectsList(list); localStorage.setItem('local_projects_list', JSON.stringify(list)) }

  const debouncedSaveToSupabase = useCallback(
    debounce((proj, secs, chat) => {
      saveToSupabase(proj, secs, chat);
    }, 1500),
    []
  );

  const saveState = (proj, secs, chat) => {
    const chatToSave = chat || producerHistory
    if (isCloudActive && proj.id !== 'local-project') { 
      debouncedSaveToSupabase(proj, secs, chatToSave) 
    }
    else {
      saveLocal(projectsList.map(p => p.id === proj.id ? { ...proj, updated_at: new Date().toISOString() } : p))
      localStorage.setItem(`local_secs_${proj.id}`, JSON.stringify(secs))
      localStorage.setItem(`local_chat_${proj.id}`, JSON.stringify(chatToSave))
    }
  }

  // ── Supabase ─────────────────────────────────────────────────────
  const loadFromSupabase = async () => {
    try { const { data, error } = await supabase.from('projects').select('*').order('updated_at', { ascending: false }); if (error) throw error; setProjectsList(data || []) }
    catch (e) { console.error(e); setDbStatus('Error en Supabase') }
  }

  const saveToSupabase = async (proj, secs, chat) => {
    if (!supabase) return
    try {
      await supabase.from('projects').update({ name: proj.name, tempo_bpm: proj.tempo_bpm, key_signature: proj.key_signature, capo_position: proj.capo_position, mood: proj.mood, cover_art: proj.cover_art, updated_at: new Date().toISOString() }).eq('id', proj.id)
      
      await supabase.from('sections').delete().eq('project_id', proj.id)
      const secInserts = secs.map(s => ({
        project_id: proj.id, 
        name: s.name, 
        order_index: s.order_index, 
        chords: JSON.parse(JSON.stringify(s.chords)), // Clonación profunda
        accompaniment: JSON.parse(JSON.stringify(s.accompaniment)), // Clonación profunda
        melody: s.melody ? JSON.parse(JSON.stringify(s.melody)) : [],
        tracks: s.tracks ? JSON.parse(JSON.stringify(s.tracks)) : null // Inmunidad a pérdida de tracks JSONB
      }))
      await supabase.from('sections').insert(secInserts)

      if (chat && chat.length > 0) {
        await supabase.from('chat_history').delete().eq('project_id', proj.id)
        const chatInserts = chat.map(c => ({
          project_id: proj.id, sender: c.sender, message: c.message, created_at: c.created_at || new Date().toISOString()
        }))
        await supabase.from('chat_history').insert(chatInserts)
      }
    } catch (e) { console.error(e) }
  }

  // ── Select project ───────────────────────────────────────────────
  const handleSelectProject = async (sel) => {
    setProject(sel); handleStop()
    const fallbackSecs = () => DEFAULT_SECTIONS.map(s => ({ ...s, id: `${s.id}-${Date.now()}` }))
    const fallbackChat = (name) => [{ id: 'welcome', sender: 'assistant', message: `¡Bienvenido a "${name}"! ¿Qué quieres componer hoy?` }]

    if (isCloudActive && sel.id !== 'local-project') {
      try {
        let { data: secs } = await supabase.from('sections').select('*').eq('project_id', sel.id).order('order_index', { ascending: true })
        let finalSecs = secs || []
        if (!finalSecs.length) {
          const { data: ins } = await supabase.from('sections').insert(DEFAULT_SECTIONS.map((s, i) => ({ project_id: sel.id, name: s.name, order_index: i, chords: s.chords, accompaniment: s.accompaniment }))).select()
          finalSecs = ins || fallbackSecs()
        }
        setSections(finalSecs); setActiveSectionId(finalSecs[0]?.id || '')
        const { data: chat } = await supabase.from('chat_history').select('*').eq('project_id', sel.id).order('created_at', { ascending: true })
        setProducerHistory(chat?.length ? chat : fallbackChat(sel.name))
      } catch (e) {
        console.error(e)
        const ls = localStorage.getItem(`local_secs_${sel.id}`); const lc = localStorage.getItem(`local_chat_${sel.id}`)
        const secs = ls ? (()=>{try{return JSON.parse(ls)}catch{return fallbackSecs()}})() : fallbackSecs()
        setSections(secs); setActiveSectionId(secs[0]?.id || '')
        setProducerHistory(lc ? (()=>{try{return JSON.parse(lc)}catch{return fallbackChat(sel.name)}})() : fallbackChat(sel.name))
      }
    } else {
      const ls = localStorage.getItem(`local_secs_${sel.id}`); const lc = localStorage.getItem(`local_chat_${sel.id}`)
      const secs = ls ? (()=>{try{return JSON.parse(ls)}catch{return null}})() : null
      const finalSecs = secs || fallbackSecs()
      setSections(finalSecs); setActiveSectionId(finalSecs[0]?.id || '')
      if (!secs) localStorage.setItem(`local_secs_${sel.id}`, JSON.stringify(finalSecs))
      const chat = lc ? (()=>{try{return JSON.parse(lc)}catch{return null}})() : null
      const finalChat = chat || fallbackChat(sel.name)
      setProducerHistory(finalChat)
      if (!chat) localStorage.setItem(`local_chat_${sel.id}`, JSON.stringify(finalChat))
    }
    setCurrentView('editor')
  }

  // ── Create / Delete ──────────────────────────────────────────────
  const handleCreateProject = async () => {
    const name = prompt('Nombre del proyecto:', 'Mi Canción'); if (!name?.trim()) return
    const data = { name: name.trim(), tempo_bpm: 120, key_signature: 'C', capo_position: 0, mood: 'Neutral', cover_art: '', updated_at: new Date().toISOString() }
    if (isCloudActive) {
      try {
        const { data: p, error } = await supabase.from('projects').insert([data]).select(); if (error) throw error
        await supabase.from('sections').insert(DEFAULT_SECTIONS.map((s, i) => ({ project_id: p[0].id, name: s.name, order_index: i, chords: s.chords, accompaniment: s.accompaniment })))
        await loadFromSupabase(); handleSelectProject(p[0])
      } catch (e) { alert(`Error: ${e.message}`) }
    } else { const proj = { ...data, id: `local-${Date.now()}` }; saveLocal([proj, ...projectsList]); handleSelectProject(proj) }
  }

  const handleDeleteProject = async (id, e) => {
    e.stopPropagation(); if (!confirm('¿Borrar este proyecto?')) return
    if (isCloudActive) { try { await supabase.from('projects').delete().eq('id', id); loadFromSupabase() } catch (err) { console.error(err) } }
    else { saveLocal(projectsList.filter(p => p.id !== id)); localStorage.removeItem(`local_secs_${id}`); localStorage.removeItem(`local_chat_${id}`) }
  }

  // ── Transport ────────────────────────────────────────────────────
  const handleStop = () => { stop(); setIsPlaying(false); setCurrentBeat(0); setCurrentChordIdx(0); setCurrentChord('') }
  const handlePlayToggle = async () => {
    if (isPlaying) { stop(); setIsPlaying(false) }
    else { try { await play(); setIsPlaying(true) } catch (e) { alert('Haz clic en la página primero para activar el audio.') } }
  }
  const playFretNote = async (noteName, midiVal) => { 
    setActiveNoteEdit({ pitch: noteName, time: Math.floor(Tone.Transport.seconds * 2) });
    updateUIFocus({ lastUserAction: 'played_note' }); 
    try { 
      if (currentChord) {
        const chordNotes = parseChordNotes(currentChord, 3);
        if (chordNotes.length) await playChord(chordNotes, "4n");
      } else {
        await playNote(midiVal || noteName, "4n");
      }
    } catch (e) { console.error(e) } 
  }

  const updateBpm = (v) => { const val = Math.min(240, Math.max(40, parseInt(v)||120)); const u={...project, tempo_bpm: val}; setProject(u); saveState(u, sections) }
  const updateKey = (k) => { const u={...project, key_signature: k}; setProject(u); saveState(u, sections) }
  const updateCapo = (v) => { const val=Math.min(12,Math.max(0,parseInt(v)||0)); const u={...project, capo_position: val}; setProject(u); saveState(u, sections) }

  // ── Mixer ────────────────────────────────────────────────────────
  const handleToggleMute = (trackId) => {
    setMasterJson(prev => ({ ...prev, tracks: prev.tracks.map(t => t.id === trackId ? { ...t, mute: !t.mute } : t) }))
  }
  const handleToggleSolo = (trackId) => {
    setMasterJson(prev => ({ ...prev, tracks: prev.tracks.map(t => t.id === trackId ? { ...t, solo: !t.solo } : t) }))
  }
  const handleTrackVolume = (trackId, vol) => {
    setMasterJson(prev => ({ ...prev, tracks: prev.tracks.map(t => t.id === trackId ? { ...t, volume: parseFloat(vol) } : t) }))
  }

  const toggleInstrument = (n) => { const a=!instruments[n].active; setInstruments(p=>({...p,[n]:{...p[n],active:a}})); }
  const handleVolume     = (n, v) => { const vol=parseFloat(v); setInstruments(p=>({...p,[n]:{...p[n],volume:vol}})); }
  const handlePattern    = (n, t) => {
    setInstruments(p=>({...p,[n]:{...p[n],type:t}}));
    const upd=sections.map(s=>s.id===activeSectionId?{...s,accompaniment:{...s.accompaniment,[n]:t}}:s); setSections(upd); saveState(project,upd)
  }

  // ── Sections ─────────────────────────────────────────────────────
  const addSection = () => {
    const NAMES=['Verso','Coro','Puente','Outro']; const idx=sections.length
    const sec={id:`sec-${Date.now()}`,name:`${NAMES[idx%4]||'Sección'} ${Math.floor(idx/4)+1}`,order_index:idx,chords:[{chordLabel:'C',beats:4},{chordLabel:'G',beats:4},{chordLabel:'Am',beats:4},{chordLabel:'F',beats:4}],accompaniment:{piano:'arpeggio',bass:'roots',drums:'basic'}}
    const upd=[...sections,sec]; setSections(upd); saveState(project,upd)
  }
  const deleteSection = (id, e) => {
    e.stopPropagation(); if(sections.length<=1)return
    const upd=sections.filter(s=>s.id!==id).map((s,i)=>({...s,order_index:i})); setSections(upd)
    if(activeSectionId===id) setActiveSectionId(upd[0].id); saveState(project,upd)
  }
  const addChord = (ch) => { const upd=sections.map(s=>s.id===activeSectionId?{...s,chords:[...s.chords,{chordLabel:ch,beats:4}]}:s); setSections(upd); saveState(project,upd) }
  const removeLastChord = () => { const upd=sections.map(s=>{if(s.id!==activeSectionId||s.chords.length<=1)return s;const c=[...s.chords];c.pop();return{...s,chords:c}}); setSections(upd); saveState(project,upd) }

  // ── AI ───────────────────────────────────────────────────────────
  const handleAgentInteraction = async (agentType, e) => {
    e.preventDefault(); if(!chatInput.trim()||isLoadingAi) return
    if(agentType === 'producer' && producerProvider === 'gemini' && !isGeminiConfigured()){alert('Configura tu Gemini API Key en Ajustes primero.');return}
    
    const userMsg={id:`u-${Date.now()}`,sender:'user',message:chatInput.trim()}
    
    const currentHistory = agentType === 'producer' ? producerHistory : mascotHistory;
    const setHistory = agentType === 'producer' ? setProducerHistory : setMascotHistory;
    const hist=[...currentHistory,userMsg]; 
    setHistory(hist); 
    setChatInput(''); 
    setIsLoadingAi(true);

    try {
      const context = {
        masterJson,
        uiFocus: { ...uiFocusContext, currentBeat: Math.floor(Tone.Transport.seconds * 2) },
        opposingHistory: agentType === 'producer' ? mascotHistory.slice(-5) : producerHistory.slice(-5)
      };

      const ai = await sendMessageToAI({
        agentType,
        provider: agentType === 'producer' ? producerProvider : mascotProvider,
        prompt: userMsg.message,
        context
      });

      const aMsg={id:`a-${Date.now()}`,sender:'assistant',message:ai.message||'Sin respuesta.'}
      let uProj={...project},uSecs=[...sections]; const ch=ai.changes
      if(ch&&Object.keys(ch).length>0){
        if(ch.tempo_bpm){uProj={...uProj,tempo_bpm:ch.tempo_bpm};}
        if(ch.key_signature)uProj={...uProj,key_signature:ch.key_signature}
        if(typeof ch.capo_position==='number')uProj={...uProj,capo_position:ch.capo_position}
        if(ch.mood)uProj={...uProj,mood:ch.mood}
        if(ch.instruments){
          Object.keys(ch.instruments).forEach(k => {
            if(instruments[k]){
              setInstruments(p=>({...p,[k]:{...p[k],...ch.instruments[k]}}))
            }
          })
        }
        if(ch.sections?.length){
          const aiTracks = ch.tracks || null;
          uSecs=ch.sections.map((s,i)=>({
            id:sections[i]?.id||`sec-ai-${Date.now()}-${i}`,
            name:s.name,
            order_index:s.order_index??i,
            chords:s.chords||[],
            melody:s.melody||sections[i]?.melody||[],
            accompaniment:sections[i]?.accompaniment||{guitar:'strum',piano:'arpeggio',bass:'roots',drums:'basic',strings:'pad',violin:'melody',vibraphone:'chords'},
            tracks: aiTracks || sections[i]?.tracks || null
          }))
        } else if (ch.tracks?.length) {
          uSecs = sections.map(s => {
            if (s.id === activeSectionId) return { ...s, tracks: ch.tracks };
            return s;
          });
        }
        setProject(uProj); setSections(uSecs)
        if(uSecs.length>0&&!uSecs.find(s=>s.id===activeSectionId)) setActiveSectionId(uSecs[0].id)
        const logParts=[ch.tempo_bpm&&`${ch.tempo_bpm} BPM`,ch.key_signature&&`Tono: ${ch.key_signature}`,ch.sections&&`${ch.sections.length} secciones`,ch.tracks&&`${ch.tracks.length} tracks orquestados`].filter(Boolean).join(' · ')
        const log={id:`l-${Date.now()}`,sender:'system',message:`Cambios aplicados — ${logParts}`}
        const final=[...hist,aMsg,log]; setHistory(final); if(agentType === 'producer') saveState(uProj,uSecs,final)
      } else {
        const final=[...hist,aMsg]; setHistory(final); if(agentType === 'producer') saveState(project, sections, final)
      }
    } catch(err){ setHistory(p=>[...p,{id:`e-${Date.now()}`,sender:'assistant',message:`Error: ${err.message}`}]) }
    finally{setIsLoadingAi(false)}
  }

  const handleRunAnalysis = async () => {
    if(!isGeminiConfigured()){alert('Configura tu Gemini API Key primero.');return}
    setAnalysisResult('Analizando tu composición…'); setIsAnalysisOpen(true)
    try {
      const result=await runDeepCompositionAnalysis({name:project.name,key_signature:project.key_signature,tempo_bpm:project.tempo_bpm,capo_position:project.capo_position,mood:project.mood,instruments,sections:sections.map(s=>({name:s.name,chords:s.chords}))})
      setAnalysisResult(result)
    } catch(e){setAnalysisResult(`❌ ${e.message}`)}
  }

  const handleGenerateCover = async () => {
    if(!isGeminiConfigured()){alert('Configura tu Gemini API Key primero.');return}
    const desc=prompt('Describe el sentimiento visual de tu canción:',project.mood||'melancholic guitar')
    if(!desc) return
    setIsGeneratingArt(true)
    try {
      // generateSongArt now returns a data URL directly (canvas-based)
      const dataUrl=await generateSongArt(project.name, desc)
      const updated={...project, cover_art: dataUrl}
      setProject(updated); saveState(updated, sections)
    } catch(e){alert(`Error: ${e.message}`)}
    finally{setIsGeneratingArt(false)}
  }

  const handleSaveSettings = (e) => {
    e.preventDefault()
    if(geminiKey.trim()) localStorage.setItem('gemini_api_key', geminiKey.trim())
    if(supabaseUrl.trim()&&supabaseKey.trim()) saveSupabaseCredentials(supabaseUrl.trim(), supabaseKey.trim())
    else window.location.reload()
  }

  const testGeminiConnection = async () => {
    if(!geminiKey?.trim()){setGeminiTestResult('⚠️ Ingresa una clave primero.');return}
    setIsTestingGemini(true); setGeminiTestResult('Verificando…')
    try {
      const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey.trim()}`)
      const data=await res.json()
      if(!res.ok) throw new Error(data.error?.message||`HTTP ${res.status}`)
      const names=(data.models||[]).filter(m=>m.name.includes('gemini')).slice(0,4).map(m=>m.name.replace('models/','')).join(', ')
      setGeminiTestResult(`✅ Clave válida. Modelos: ${names}…`)
    } catch(err){setGeminiTestResult(`❌ ${err.message}`)}
    finally{setIsTestingGemini(false)}
  }

  // ── Timeline helpers ─────────────────────────────────────────────
  const activeSection = sections.find(s => s.id === activeSectionId)
  const getChordAt = (bi) => { if(!activeSection)return''; let sum=0; for(const c of activeSection.chords){if(bi>=sum&&bi<sum+c.beats)return c.chordLabel||c.chord||'';sum+=c.beats}; return'' }
  const isChordStart = (bi) => { if(!activeSection)return false; let sum=0; for(const c of activeSection.chords){if(bi===sum)return true;sum+=c.beats}; return false }
  const progress = totalBeats > 0 ? (currentBeat / totalBeats) * 100 : 0

  // ════════════════════════════════════════════════════════════════
  //  LAYOUT SINFONIA PRO (V7)
  // ════════════════════════════════════════════════════════════════
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: 'var(--c-bg)' }}>
      <ControlBar 
        project={project} 
        isPlaying={isPlaying} 
        onPlayToggle={handlePlayToggle} 
        onStop={handleStop} 
        activeTab={uiFocusContext.activeTab} 
        onTabChange={(tab) => updateUIFocus({ activeTab: tab })} 
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <AIManagerPanel uiFocusContext={uiFocusContext} mascotAlert={mascotAlert} />
        <WorkspaceContainer activeTab={uiFocusContext.activeTab} />
      </div>
    </div>
  );
}
