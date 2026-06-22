import React, { useState, useEffect, useRef } from 'react'
import {
  Play, Pause, Square, Send, Settings, Plus, Trash2,
  Music, Sparkles, ChevronLeft,
  FolderOpen, BookOpen, HardDrive, Image as ImageIcon
} from 'lucide-react'

import { supabase, isSupabaseConfigured, saveSupabaseCredentials } from './utils/supabaseClient'
import {
  sendMessageToProducerAI,
  runDeepCompositionAnalysis,
  generateSongArt,
  isGeminiConfigured,
  saveGeminiKey
} from './utils/geminiClient'
import { audioEngine, getGuitarVoicing } from './utils/AudioEngine'
import Fretboard from './components/Fretboard'

const INITIAL_PROJECTS = [
  {
    id: 'local-proj-1',
    name: 'Balada de Otoño',
    tempo_bpm: 85,
    key_signature: 'Em',
    capo_position: 2,
    mood: 'Melancólico',
    cover_art: '',
    updated_at: new Date().toISOString()
  },
  {
    id: 'local-proj-2',
    name: 'Ritmo del Desierto',
    tempo_bpm: 120,
    key_signature: 'Am',
    capo_position: 0,
    mood: 'Enérgico',
    cover_art: '',
    updated_at: new Date().toISOString()
  }
]

const DEFAULT_SECTIONS_FOR_NEW = [
  {
    id: 'sec-intro',
    name: 'Intro',
    order_index: 0,
    chords: [
      { chord: 'Am', beats: 4 },
      { chord: 'F', beats: 4 },
      { chord: 'C', beats: 4 },
      { chord: 'G', beats: 4 }
    ],
    accompaniment: { piano: 'arpeggio', bass: 'roots', drums: 'basic' }
  },
  {
    id: 'sec-verso',
    name: 'Verso',
    order_index: 1,
    chords: [
      { chord: 'Am', beats: 4 },
      { chord: 'Dm', beats: 4 },
      { chord: 'G', beats: 4 },
      { chord: 'C', beats: 4 }
    ],
    accompaniment: { piano: 'arpeggio', bass: 'roots', drums: 'basic' }
  }
]

export default function App() {
  // --- Navegación ---
  const [currentView, setCurrentView] = useState('dashboard')
  const [activeTab, setActiveTab] = useState('projects')

  // --- Proyectos ---
  const [projectsList, setProjectsList] = useState([])
  const [project, setProject] = useState(null)
  const [sections, setSections] = useState([])
  const [activeSectionId, setActiveSectionId] = useState('')

  // --- Reproductor ---
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentBeat, setCurrentBeat] = useState(0)
  const [totalBeats, setTotalBeats] = useState(16)
  const [currentChordIndex, setCurrentChordIndex] = useState(0)
  const [currentChordName, setCurrentChordName] = useState('')

  // --- Chat ---
  const [chatHistory, setChatHistory] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [isLoadingAi, setIsLoadingAi] = useState(false)

  // --- Análisis / Arte ---
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState('')
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false)
  const [isGeneratingArt, setIsGeneratingArt] = useState(false)

  // --- Mixer ---
  const [instruments, setInstruments] = useState({
    guitar: { active: true, volume: -6,  type: 'strum' },
    piano:  { active: true, volume: -12, type: 'arpeggio' },
    bass:   { active: true, volume: -10, type: 'roots' },
    drums:  { active: true, volume: -12, type: 'basic' }
  })

  // --- Credenciales ---
  const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('supabase_url') || '')
  const [supabaseKey, setSupabaseKey] = useState(localStorage.getItem('supabase_anon_key') || '')
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('gemini_api_key') || '')
  const [dbStatus, setDbStatus] = useState('Modo Local')
  const [geminiTestResult, setGeminiTestResult] = useState('')
  const [isTestingGemini, setIsTestingGemini] = useState(false)

  const chatEndRef = useRef(null)

  const [useLocalMode, setUseLocalMode] = useState(() =>
    localStorage.getItem('use_local_mode') === 'true'
  )
  const isCloudActive = isSupabaseConfigured() && !useLocalMode

  // ---------- Effects ----------
  useEffect(() => {
    if (isCloudActive) {
      setDbStatus('Conectado a Supabase ⚡')
      loadProjectsFromSupabase()
    } else {
      setDbStatus(isSupabaseConfigured() ? 'Modo Local (Supabase Desactivado)' : 'Modo Local')
      const localProjs = localStorage.getItem('local_projects_list')
      if (localProjs) {
        try { setProjectsList(JSON.parse(localProjs)) }
        catch { setProjectsList(INITIAL_PROJECTS); localStorage.setItem('local_projects_list', JSON.stringify(INITIAL_PROJECTS)) }
      } else {
        setProjectsList(INITIAL_PROJECTS)
        localStorage.setItem('local_projects_list', JSON.stringify(INITIAL_PROJECTS))
      }
    }
  }, [useLocalMode])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  useEffect(() => {
    const sec = sections.find(s => s.id === activeSectionId)
    if (sec) {
      audioEngine.setChords(sec.chords || [])
      setTotalBeats(sec.chords.reduce((a, c) => a + (c.beats || 4), 0))
      if (sec.accompaniment) {
        Object.keys(sec.accompaniment).forEach(inst => audioEngine.setPatternType(inst, sec.accompaniment[inst]))
      }
    }
  }, [sections, activeSectionId])

  useEffect(() => {
    audioEngine.onBeatCallback = (beat, chordIdx, chordName, beatsCount) => {
      setCurrentBeat(beat)
      setCurrentChordIndex(chordIdx)
      setCurrentChordName(chordName || '')
      setTotalBeats(beatsCount || 16)
    }
  }, [])

  // ---------- Helpers ----------
  const saveLocalProjectsToStorage = (list) => {
    setProjectsList(list)
    localStorage.setItem('local_projects_list', JSON.stringify(list))
  }

  // ---------- Gemini test ----------
  const testGeminiConnection = async () => {
    if (!geminiKey?.trim()) { setGeminiTestResult('⚠️ Ingresa una clave primero.'); return }
    setIsTestingGemini(true)
    setGeminiTestResult('Verificando clave...')
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey.trim()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`)
      const names = (data.models || []).filter(m => m.name.includes('gemini')).slice(0, 4).map(m => m.name.replace('models/', '')).join(', ')
      setGeminiTestResult(`✅ Clave válida. Modelos: ${names}...`)
    } catch (err) {
      setGeminiTestResult(`❌ ${err.message}`)
    } finally { setIsTestingGemini(false) }
  }

  // ---------- Supabase ----------
  const loadProjectsFromSupabase = async () => {
    try {
      if (!supabase) return
      const { data, error } = await supabase.from('projects').select('*').order('updated_at', { ascending: false })
      if (error) throw error
      setProjectsList(data || [])
    } catch (e) { console.error(e); setDbStatus('Error en Supabase') }
  }

  // ---------- Select Project ----------
  const handleSelectProject = async (sel) => {
    setProject(sel)
    audioEngine.setBpm(sel.tempo_bpm)
    handleStop()

    if (isCloudActive && sel.id !== 'local-project') {
      try {
        let { data: secs, error: sErr } = await supabase.from('sections').select('*').eq('project_id', sel.id).order('order_index', { ascending: true })
        if (sErr) throw sErr
        let finalSecs = secs || []
        if (finalSecs.length === 0) {
          const init = DEFAULT_SECTIONS_FOR_NEW.map((s, i) => ({ project_id: sel.id, name: s.name, order_index: i, chords: s.chords, accompaniment: s.accompaniment }))
          const { data: ins } = await supabase.from('sections').insert(init).select()
          if (ins) finalSecs = ins
        }
        setSections(finalSecs)
        if (finalSecs.length > 0) setActiveSectionId(finalSecs[0].id)

        const { data: chat } = await supabase.from('chat_history').select('*').eq('project_id', sel.id).order('created_at', { ascending: true })
        setChatHistory(chat?.length ? chat : [{ id: 'welcome', sender: 'assistant', message: `¡Bienvenido de nuevo a "${sel.name}"! ¿Qué cambios haremos hoy?` }])
      } catch (e) {
        console.error(e)
        const ls = localStorage.getItem(`local_secs_${sel.id}`)
        const lc = localStorage.getItem(`local_chat_${sel.id}`)
        const fallbackSecs = ls ? (() => { try { return JSON.parse(ls) } catch { return DEFAULT_SECTIONS_FOR_NEW.map(s => ({ ...s, id: `${s.id}-${Date.now()}` })) } })() : DEFAULT_SECTIONS_FOR_NEW.map(s => ({ ...s, id: `${s.id}-${Date.now()}` }))
        setSections(fallbackSecs)
        setActiveSectionId(fallbackSecs[0]?.id || '')
        setChatHistory(lc ? (() => { try { return JSON.parse(lc) } catch { return [{ id: 'w', sender: 'assistant', message: 'Modo local activado.' }] } })() : [{ id: 'w', sender: 'assistant', message: 'Modo local activado.' }])
      }
    } else {
      const ls = localStorage.getItem(`local_secs_${sel.id}`)
      const lc = localStorage.getItem(`local_chat_${sel.id}`)
      const localSecs = ls ? (() => { try { return JSON.parse(ls) } catch { return null } })() : null
      const secs = localSecs || DEFAULT_SECTIONS_FOR_NEW.map(s => ({ ...s, id: `${s.id}-${Date.now()}` }))
      setSections(secs)
      setActiveSectionId(secs[0]?.id || '')
      if (!localSecs) localStorage.setItem(`local_secs_${sel.id}`, JSON.stringify(secs))
      const localChat = lc ? (() => { try { return JSON.parse(lc) } catch { return null } })() : null
      const welcome = [{ id: 'welcome', sender: 'assistant', message: `¡Hola! Bienvenido a "${sel.name}". ¿Cómo quieres empezar?` }]
      setChatHistory(localChat || welcome)
      if (!localChat) localStorage.setItem(`local_chat_${sel.id}`, JSON.stringify(welcome))
    }
    setCurrentView('editor')
  }

  // ---------- Create / Delete ----------
  const handleCreateProject = async () => {
    const projName = prompt('Nombre del nuevo proyecto:', 'Mi Canción')
    if (!projName?.trim()) return
    const data = { name: projName.trim(), tempo_bpm: 120, key_signature: 'C', capo_position: 0, mood: 'Neutral', cover_art: '', updated_at: new Date().toISOString() }
    if (isCloudActive) {
      try {
        const { data: p, error } = await supabase.from('projects').insert([data]).select()
        if (error) throw error
        const proj = p[0]
        await supabase.from('sections').insert(DEFAULT_SECTIONS_FOR_NEW.map((s, i) => ({ project_id: proj.id, name: s.name, order_index: i, chords: s.chords, accompaniment: s.accompaniment })))
        await loadProjectsFromSupabase()
        handleSelectProject(proj)
      } catch (e) { alert(`No se pudo crear: ${e.message}`) }
    } else {
      const proj = { ...data, id: `local-proj-${Date.now()}` }
      saveLocalProjectsToStorage([proj, ...projectsList])
      handleSelectProject(proj)
    }
  }

  const handleDeleteProject = async (id, e) => {
    e.stopPropagation()
    if (!confirm('¿Borrar este proyecto?')) return
    if (isCloudActive) {
      try { await supabase.from('projects').delete().eq('id', id); loadProjectsFromSupabase() } catch (err) { console.error(err) }
    } else {
      saveLocalProjectsToStorage(projectsList.filter(p => p.id !== id))
      localStorage.removeItem(`local_secs_${id}`)
      localStorage.removeItem(`local_chat_${id}`)
    }
  }

  // ---------- Save ----------
  const saveCurrentState = (proj, secs) => {
    if (isCloudActive && proj.id !== 'local-project') {
      saveProjectStateToSupabase(proj, secs)
    } else {
      saveLocalProjectsToStorage(projectsList.map(p => p.id === proj.id ? { ...proj, updated_at: new Date().toISOString() } : p))
      localStorage.setItem(`local_secs_${proj.id}`, JSON.stringify(secs))
      localStorage.setItem(`local_chat_${proj.id}`, JSON.stringify(chatHistory))
    }
  }

  const saveProjectStateToSupabase = async (proj, secs) => {
    if (!supabase) return
    try {
      await supabase.from('projects').update({ name: proj.name, tempo_bpm: proj.tempo_bpm, key_signature: proj.key_signature, capo_position: proj.capo_position, mood: proj.mood, cover_art: proj.cover_art, updated_at: new Date().toISOString() }).eq('id', proj.id)
      for (const s of secs) {
        await supabase.from('sections').update({ name: s.name, chords: s.chords, accompaniment: s.accompaniment, order_index: s.order_index }).eq('id', s.id)
      }
    } catch (e) { console.error(e) }
  }

  // ---------- Analysis ----------
  const handleRunAnalysis = async () => {
    if (!isGeminiConfigured()) { alert('Configura tu Gemini API Key primero.'); return }
    setIsAnalyzing(true)
    setAnalysisResult('Analizando tu composición con Gemini 2.5 Pro...')
    setIsAnalysisModalOpen(true)
    try {
      const critique = await runDeepCompositionAnalysis({ name: project.name, key_signature: project.key_signature, tempo_bpm: project.tempo_bpm, capo_position: project.capo_position, mood: project.mood, sections: sections.map(s => ({ name: s.name, chords: s.chords })) })
      setAnalysisResult(critique)
    } catch (e) { setAnalysisResult(`❌ ${e.message}`) }
    finally { setIsAnalyzing(false) }
  }

  // ---------- Cover Art ----------
  const handleGenerateCover = async () => {
    if (!isGeminiConfigured()) { alert('Configura tu Gemini API Key primero.'); return }
    const desc = prompt('Describe visualmente tu canción:', project.mood || 'A melancholic guitar vibe')
    if (!desc) return
    setIsGeneratingArt(true)
    try {
      const bytes = await generateSongArt(project.name, desc)
      const uri = `data:image/png;base64,${bytes}`
      const updated = { ...project, cover_art: uri }
      setProject(updated)
      saveCurrentState(updated, sections)
    } catch (e) { alert(`Error: ${e.message}`) }
    finally { setIsGeneratingArt(false) }
  }

  // ---------- Transport ----------
  const updateBpm = (v) => { const val = Math.min(240, Math.max(40, parseInt(v) || 120)); const u = { ...project, tempo_bpm: val }; setProject(u); audioEngine.setBpm(val); saveCurrentState(u, sections) }
  const updateKeySignature = (k) => { const u = { ...project, key_signature: k }; setProject(u); saveCurrentState(u, sections) }
  const updateCapoPosition = (v) => { const val = Math.min(12, Math.max(0, parseInt(v) || 0)); const u = { ...project, capo_position: val }; setProject(u); saveCurrentState(u, sections) }

  const handleStop = () => { audioEngine.stop(); setIsPlaying(false); setCurrentBeat(0); setCurrentChordIndex(0); setCurrentChordName('') }
  const handlePlayToggle = async () => {
    if (isPlaying) { audioEngine.stop(); setIsPlaying(false) }
    else { try { await audioEngine.startContext(); audioEngine.play(); setIsPlaying(true) } catch (e) { alert('Clic en la página primero para activar el audio.') } }
  }
  const playFretNote = async (note) => {
    try { await audioEngine.startContext(); if (audioEngine.guitar) audioEngine.guitar.triggerAttackRelease(note, '4n') } catch (e) { console.error(e) }
  }

  // ---------- Mixer ----------
  const toggleInstrument = (n) => { const a = !instruments[n].active; setInstruments(p => ({ ...p, [n]: { ...p[n], active: a } })); audioEngine.setInstrumentActive(n, a) }
  const handleVolumeChange = (n, v) => { const vol = parseFloat(v); setInstruments(p => ({ ...p, [n]: { ...p[n], volume: vol } })); audioEngine.setVolume(n, vol) }
  const handlePatternChange = (n, t) => {
    setInstruments(p => ({ ...p, [n]: { ...p[n], type: t } }))
    audioEngine.setPatternType(n, t)
    const upd = sections.map(s => s.id === activeSectionId ? { ...s, accompaniment: { ...s.accompaniment, [n]: t } } : s)
    setSections(upd); saveCurrentState(project, upd)
  }

  // ---------- Sections ----------
  const addNewSection = () => {
    const names = ['Verso', 'Coro', 'Puente', 'Outro']
    const idx = sections.length
    const sec = { id: `sec-${Date.now()}`, name: `${names[idx % 4] || 'Sección'} ${Math.floor(idx / 4) + 1}`, order_index: idx, chords: [{ chord: 'C', beats: 4 }, { chord: 'G', beats: 4 }, { chord: 'Am', beats: 4 }, { chord: 'F', beats: 4 }], accompaniment: { piano: 'arpeggio', bass: 'roots', drums: 'basic' } }
    const upd = [...sections, sec]; setSections(upd); saveCurrentState(project, upd)
  }
  const deleteSection = (id, e) => {
    e.stopPropagation()
    if (sections.length <= 1) return
    const upd = sections.filter(s => s.id !== id).map((s, i) => ({ ...s, order_index: i }))
    setSections(upd)
    if (activeSectionId === id) setActiveSectionId(upd[0].id)
    saveCurrentState(project, upd)
  }
  const addChordToActiveSection = (ch) => {
    const upd = sections.map(s => s.id === activeSectionId ? { ...s, chords: [...s.chords, { chord: ch, beats: 4 }] } : s)
    setSections(upd); saveCurrentState(project, upd)
  }
  const removeLastChordFromActive = () => {
    const upd = sections.map(s => { if (s.id !== activeSectionId || s.chords.length <= 1) return s; const c = [...s.chords]; c.pop(); return { ...s, chords: c } })
    setSections(upd); saveCurrentState(project, upd)
  }

  // ---------- Chat ----------
  const handleSendChatMessage = async (e) => {
    e.preventDefault()
    if (!chatInput.trim() || isLoadingAi) return
    if (!isGeminiConfigured()) { alert('Configura tu Gemini API Key en Ajustes primero.'); return }
    const userMsg = { id: `msg-${Date.now()}`, sender: 'user', message: chatInput.trim() }
    const hist = [...chatHistory, userMsg]
    setChatHistory(hist); setChatInput(''); setIsLoadingAi(true)
    try {
      const ps = { name: project.name, key_signature: project.key_signature, tempo_bpm: project.tempo_bpm, capo_position: project.capo_position, mood: project.mood, sections: sections.map(s => ({ name: s.name, chords: s.chords })) }
      const ai = await sendMessageToProducerAI(userMsg.message, hist, ps)
      const aMsg = { id: `msg-${Date.now()}-ai`, sender: 'assistant', message: ai.message || 'Sin respuesta.' }
      let uProj = { ...project }, uSecs = [...sections]
      const ch = ai.changes
      if (ch && Object.keys(ch).length > 0) {
        if (ch.tempo_bpm) { uProj = { ...uProj, tempo_bpm: ch.tempo_bpm }; audioEngine.setBpm(ch.tempo_bpm) }
        if (ch.key_signature) uProj = { ...uProj, key_signature: ch.key_signature }
        if (typeof ch.capo_position === 'number') uProj = { ...uProj, capo_position: ch.capo_position }
        if (ch.sections?.length) {
          uSecs = ch.sections.map((s, i) => ({ id: sections[i]?.id || `sec-ai-${Date.now()}-${i}`, name: s.name, order_index: s.order_index ?? i, chords: s.chords || [], accompaniment: sections[i]?.accompaniment || { piano: 'arpeggio', bass: 'roots', drums: 'basic' } }))
        }
        setProject(uProj); setSections(uSecs)
        if (uSecs.length > 0 && !uSecs.find(s => s.id === activeSectionId)) setActiveSectionId(uSecs[0].id)
        const log = { id: `log-${Date.now()}`, sender: 'system', message: `[Cambios: ${[ch.tempo_bpm && `BPM→${ch.tempo_bpm}`, ch.key_signature && `Tono→${ch.key_signature}`, ch.sections && `${ch.sections.length} secciones`].filter(Boolean).join(', ')}]` }
        const final = [...hist, aMsg, log]; setChatHistory(final); saveCurrentState(uProj, uSecs)
        if (!isCloudActive) localStorage.setItem(`local_chat_${project.id}`, JSON.stringify(final))
      } else {
        const final = [...hist, aMsg]; setChatHistory(final)
        if (!isCloudActive) localStorage.setItem(`local_chat_${project.id}`, JSON.stringify(final))
      }
    } catch (err) {
      setChatHistory(p => [...p, { id: `err-${Date.now()}`, sender: 'assistant', message: `Error: ${err.message}` }])
    } finally { setIsLoadingAi(false) }
  }

  // ---------- Settings ----------
  const handleSaveSettings = (e) => {
    e.preventDefault()
    if (geminiKey.trim()) localStorage.setItem('gemini_api_key', geminiKey.trim())
    if (supabaseUrl.trim() && supabaseKey.trim()) saveSupabaseCredentials(supabaseUrl.trim(), supabaseKey.trim())
    else window.location.reload()
  }

  // ---------- Timeline helpers ----------
  const activeSection = sections.find(s => s.id === activeSectionId)
  const getChordAtBeat = (bi) => {
    if (!activeSection) return ''
    let sum = 0
    for (const c of activeSection.chords) { if (bi >= sum && bi < sum + c.beats) return c.chord; sum += c.beats }
    return ''
  }
  const isChordStart = (bi) => {
    if (!activeSection) return false
    let sum = 0
    for (const c of activeSection.chords) { if (bi === sum) return true; sum += c.beats }
    return false
  }
  const progressPercent = totalBeats > 0 ? (currentBeat / totalBeats) * 100 : 0

  // ============================================================
  //  DASHBOARD VIEW
  // ============================================================
  if (currentView === 'dashboard') {
    return (
      <div className="app-container dashboard-layout">
        {/* SIDEBAR */}
        <aside className="dashboard-sidebar">
          <div>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0 0.25rem', marginBottom: '0.5rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0, boxShadow: '0 0 14px rgba(99,102,241,0.4)' }}>🎸</div>
              <div>
                <h1 className="logo-glow" style={{ fontSize: '1.3rem', fontWeight: 900, lineHeight: 1 }}>SinfonIA</h1>
                <p style={{ fontSize: '0.55rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Estudio de Composición</p>
              </div>
            </div>

            <nav className="dashboard-menu">
              <button className={`menu-item ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}><FolderOpen size={15} /> Mis Proyectos</button>
              <button className={`menu-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}><Settings size={15} /> Ajustes de API</button>
              <button className={`menu-item ${activeTab === 'help' ? 'active' : ''}`} onClick={() => setActiveTab('help')}><BookOpen size={15} /> Guía</button>
            </nav>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0 0.25rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
              <HardDrive size={11} /><span>{dbStatus}</span>
            </div>
            {isSupabaseConfigured() && (
              <button className="btn-flat" onClick={() => { const n = !useLocalMode; setUseLocalMode(n); localStorage.setItem('use_local_mode', String(n)) }} style={{ fontSize: '0.65rem', padding: '0.3rem 0.5rem' }}>
                {useLocalMode ? '🔌 Conectar Supabase' : '📴 Modo Local'}
              </button>
            )}
          </div>
        </aside>

        {/* MAIN */}
        <main className="dashboard-content">

          {/* PROJECTS */}
          {activeTab === 'projects' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h1 style={{ fontSize: '2rem', fontWeight: 900, background: 'linear-gradient(135deg,#f1f0f8,#8b8aaa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Mis Proyectos</h1>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Selecciona un proyecto para abrir el estudio</p>
                </div>
                <button className="btn-primary" onClick={handleCreateProject}><Plus size={15} /> Nuevo Proyecto</button>
              </div>

              {dbStatus.includes('Error') && (
                <div style={{ padding: '0.85rem 1rem', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', color: '#fca5a5', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)' }}>
                  ⚠️ Error en Supabase — ejecuta <code>supabase/schema.sql</code> y desactiva el RLS.
                </div>
              )}

              {projectsList.length === 0 ? (
                <div style={{ padding: '4rem 2rem', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
                  <Music size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  <p style={{ marginBottom: '1.25rem' }}>No tienes proyectos guardados aún.</p>
                  <button className="btn-primary" onClick={handleCreateProject} style={{ margin: '0 auto' }}>Crear mi primer proyecto</button>
                </div>
              ) : (
                <div className="projects-grid">
                  {projectsList.map((p) => (
                    <div key={p.id} className="project-card" onClick={() => handleSelectProject(p)}>
                      {p.cover_art && <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${p.cover_art})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.1, borderRadius: 'var(--radius-md)' }} />}
                      <div style={{ position: 'absolute', top: '1rem', right: '1rem', width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#06b6d4)' }} />
                      <div className="project-card-header" style={{ position: 'relative', zIndex: 2 }}>
                        <div>
                          <h3 className="project-card-title">{p.name}</h3>
                          <div className="project-card-meta">
                            <span>{p.tempo_bpm} BPM</span>
                            <span>· {p.key_signature}</span>
                            {p.mood && <span>· {p.mood}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="project-card-footer" style={{ position: 'relative', zIndex: 2 }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{new Date(p.updated_at).toLocaleDateString()}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent-purple)', fontWeight: 700 }}>Abrir →</span>
                          <button onClick={(e) => handleDeleteProject(p.id, e)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}><Trash2 size={13} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* SETTINGS */}
          {activeTab === 'settings' && (
            <div style={{ maxWidth: 560 }}>
              <div style={{ marginBottom: '1.75rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 900 }}>Configuración de API</h1>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Conecta tu Gemini API Key para activar la inteligencia artificial.</p>
              </div>
              <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Gemini API Key</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="password" placeholder="AIzaSy..." value={geminiKey} onChange={e => setGeminiKey(e.target.value)} className="chat-input" />
                    <button type="button" onClick={testGeminiConnection} className="btn-flat" disabled={isTestingGemini} style={{ whiteSpace: 'nowrap' }}>{isTestingGemini ? '...' : '✓ Probar'}</button>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Obtén tu clave en <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-purple)' }}>Google AI Studio</a></span>
                  {geminiTestResult && (
                    <div style={{ fontSize: '0.75rem', padding: '0.5rem 0.75rem', background: geminiTestResult.includes('✅') ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)', border: `1px solid ${geminiTestResult.includes('✅') ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`, color: geminiTestResult.includes('✅') ? '#6ee7b7' : '#fca5a5', borderRadius: 'var(--radius-sm)' }}>
                      {geminiTestResult}
                    </div>
                  )}
                </div>
                <div style={{ borderBottom: '1px dashed var(--border-color)' }} />
                <div className="form-group">
                  <label className="form-label">Supabase URL <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', fontSize: '0.7rem' }}>(opcional)</span></label>
                  <input type="text" placeholder="https://xyz.supabase.co" value={supabaseUrl} onChange={e => setSupabaseUrl(e.target.value)} className="chat-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Supabase Anon Key <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', fontSize: '0.7rem' }}>(opcional)</span></label>
                  <input type="password" placeholder="eyJhbGciOi..." value={supabaseKey} onChange={e => setSupabaseKey(e.target.value)} className="chat-input" />
                </div>
                <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start' }}>Guardar y Recargar</button>
              </form>
            </div>
          )}

          {/* HELP */}
          {activeTab === 'help' && (
            <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 900 }}>Guía de SinfonIA</h1>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Aprende a sacarle el máximo partido.</p>
              </div>
              {[
                { icon: '🎙️', color: 'var(--accent-purple)', title: 'Productor IA (Gemini 2.5 Flash)', text: 'Describe el sentimiento de tu canción en el chat. SinfonIA ajustará automáticamente los acordes, el tempo y la tonalidad.' },
                { icon: '🧠', color: 'var(--accent-cyan)', title: 'Análisis Pro (Gemini 2.5 Pro)', text: 'El botón "Análisis Pro" activa un análisis profundo de tu composición con teoría musical, sugerencias de arreglo y técnicas de guitarra.' },
                { icon: '🎨', color: 'var(--accent-amber)', title: 'Arte de Portada (Imagen 3)', text: 'Genera una portada de álbum con Imagen 3 de Google. Describe el sentimiento visual y obtendrás una imagen única.' },
                { icon: '🎸', color: 'var(--accent-green)', title: 'Diapasón Interactivo', text: 'Visualiza acordes y escalas en el mástil. Clic en cualquier nota para escucharla en tiempo real.' },
              ].map(({ icon, color, title, text }) => (
                <div key={title} className="info-panel">
                  <h3 style={{ color }}>{icon} {title}</h3>
                  <p style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>{text}</p>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    )
  }

  // ============================================================
  //  EDITOR VIEW
  // ============================================================
  return (
    <div className="app-container editor-layout">

      {/* ===== CHAT SIDEBAR ===== */}
      <aside className="chat-sidebar">
        <header className="chat-header">
          <button className="btn-flat" onClick={() => setCurrentView('dashboard')} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
            <ChevronLeft size={13} /> Volver
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {isPlaying && <div className="playing-indicator" />}
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Productor IA</span>
          </div>
        </header>

        <div className="chat-messages">
          {chatHistory.map(msg =>
            msg.sender === 'system'
              ? <div key={msg.id} className="message-system-log">{msg.message}</div>
              : <div key={msg.id} className={`message-bubble ${msg.sender === 'user' ? 'message-user' : 'message-assistant'}`}>{msg.message}</div>
          )}
          {isLoadingAi && <div className="message-bubble message-assistant" style={{ opacity: 0.65, fontStyle: 'italic' }}>Componiendo...</div>}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSendChatMessage} className="chat-input-area">
          <input type="text" placeholder="Pídele cambios a SinfonIA..." value={chatInput} onChange={e => setChatInput(e.target.value)} className="chat-input" disabled={isLoadingAi} />
          <button type="submit" className="btn-primary" disabled={isLoadingAi || !chatInput.trim()} style={{ padding: '0.6rem 0.75rem' }}><Send size={14} /></button>
        </form>
      </aside>

      {/* ===== STUDIO WORKSPACE ===== */}
      <main className="studio-workspace">

        {/* ---- Header ---- */}
        <header className="workspace-header">
          <div>
            <span style={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Proyecto</span>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, lineHeight: 1.2 }}>{project.name}</h2>
          </div>

          <div className="project-meta-controls">
            <button className="btn-primary" onClick={handleRunAnalysis} style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow: '0 2px 8px rgba(245,158,11,0.3)', fontSize: '0.75rem', padding: '0.45rem 0.8rem' }}>
              <Sparkles size={13} /> Análisis Pro
            </button>

            <div className="transport-bar">
              <div className="play-controls">
                <button onClick={handlePlayToggle} className={`btn-icon ${isPlaying ? 'active' : ''}`}>{isPlaying ? <Pause size={15} /> : <Play size={15} />}</button>
                <button onClick={handleStop} className="btn-icon"><Square size={15} /></button>
              </div>
              <div style={{ width: 1, height: 18, background: 'var(--border-color)', margin: '0 0.2rem' }} />
              <div className="control-pill" style={{ border: 'none', background: 'transparent', padding: '0 0.3rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>BPM</span>
                <input type="number" value={project.tempo_bpm} onChange={e => updateBpm(e.target.value)} style={{ width: 36, background: 'transparent', border: 'none', color: 'white', fontWeight: 700, outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }} />
              </div>
              <div className="control-pill" style={{ border: 'none', background: 'transparent', padding: '0 0.3rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Tono</span>
                <select value={project.key_signature} onChange={e => updateKeySignature(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', outline: 'none', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
                  {['C','G','D','A','E','B','F#','F','Bb','Eb','Ab','Db','Am','Em','Bm','F#m','C#m','G#m','Dm','Gm','Cm','Fm'].map(k => <option key={k} value={k} style={{ background: '#1a1a24' }}>{k}</option>)}
                </select>
              </div>
              <div className="control-pill" style={{ border: 'none', background: 'transparent', padding: '0 0.3rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Capo</span>
                <input type="number" min="0" max="12" value={project.capo_position} onChange={e => updateCapoPosition(e.target.value)} style={{ width: 26, background: 'transparent', border: 'none', color: 'white', fontWeight: 700, outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }} />
              </div>
            </div>
          </div>
        </header>

        {/* ---- Section Tabs ---- */}
        <div className="sections-strip">
          <span style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', flexShrink: 0, marginRight: '0.25rem' }}>Secciones</span>
          {sections.map(sec => (
            <button key={sec.id} className={`section-tab ${activeSectionId === sec.id ? 'active' : ''}`} onClick={() => { setActiveSectionId(sec.id); handleStop() }}>
              {sec.name}
              {sections.length > 1 && <span className="section-tab-del" onClick={e => deleteSection(sec.id, e)}>×</span>}
            </button>
          ))}
          <button className="btn-flat" onClick={addNewSection} style={{ fontSize: '0.7rem', padding: '0.3rem 0.65rem', borderRadius: 20, flexShrink: 0 }}>+ Sección</button>
        </div>

        {/* ====================================================
            DAW TIMELINE — Multi-track with playhead
            ==================================================== */}
        {activeSection && (
          <div className="timeline-container">

            {/* Ruler */}
            <div className="timeline-header-row">
              <div className="timeline-label-col">Acordes</div>
              <div className="timeline-beats-area">
                {Array.from({ length: totalBeats }).map((_, bi) => {
                  const chord = getChordAtBeat(bi)
                  const active = isPlaying && currentBeat === bi
                  const start = isChordStart(bi)
                  return (
                    <div key={bi} className={`timeline-beat-cell ${active ? 'playhead-active' : ''} ${start ? 'chord-start' : ''} ${bi % 4 === 0 ? 'beat-downbeat' : ''}`}>
                      {start && <span className="timeline-beat-chord">{chord}</span>}
                      <span className="timeline-beat-num">{bi + 1}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Tracks */}
            {[
              { key: 'guitar', label: '🎸 Guitarra', cls: 'track-guitar', note: bi => instruments.guitar.active && (instruments.guitar.type === 'strum' ? bi % 4 === 0 : true) },
              { key: 'piano',  label: '🎹 Piano',    cls: 'track-piano',  note: () => instruments.piano.active },
              { key: 'bass',   label: '🎵 Bajo',     cls: 'track-bass',   note: bi => instruments.bass.active && (instruments.bass.type === 'roots' ? bi % 2 === 0 : true) },
              { key: 'drums',  label: '🥁 Batería',  cls: 'track-drums',  note: () => instruments.drums.active },
            ].map(({ key, label, cls, note }) => (
              <div key={key} className={`timeline-track-row ${cls}`}>
                <div className="timeline-track-label">{label}</div>
                <div className="timeline-track-cells">
                  {Array.from({ length: totalBeats }).map((_, bi) => (
                    <div key={bi} className={`timeline-track-cell ${note(bi) ? 'has-note' : ''} ${isPlaying && currentBeat === bi ? 'playhead-active' : ''}`} />
                  ))}
                </div>
              </div>
            ))}

            {/* Progress bar */}
            <div className="timeline-progress-bar-wrap">
              <div className="timeline-progress-bar-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}

        {/* ---- Chord Builder ---- */}
        {activeSection && (
          <div className="chord-builder-panel">
            <div className="current-chord-display">
              <div className="current-chord-name">{isPlaying ? (currentChordName || '—') : (activeSection?.chords[0]?.chord || '—')}</div>
              <div className="current-chord-label">Activo</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.67rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  {activeSection.name} · {activeSection.chords.length} acordes · {totalBeats} beats
                </span>
                <button onClick={removeLastChordFromActive} className="btn-flat" style={{ fontSize: '0.67rem', padding: '0.2rem 0.5rem' }}>− Último</button>
              </div>

              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {activeSection.chords.map((c, i) => (
                  <div key={i} style={{ padding: '0.2rem 0.5rem', background: isPlaying && currentChordIndex === i ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--bg-element)', border: `1px solid ${isPlaying && currentChordIndex === i ? 'var(--accent-purple)' : 'var(--border-color)'}`, borderRadius: 'var(--radius-xs)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'white', transition: 'all 0.1s' }}>
                    {c.chord}<span style={{ fontSize: '0.58rem', opacity: 0.55, marginLeft: 2 }}>{c.beats}</span>
                  </div>
                ))}
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', margin: '0 0.1rem' }}>+</span>
                {['C','G','D','A','E','F','Am','Em','Dm','Bm','Cmaj7','Am7','G7','D7'].map(ch => (
                  <button key={ch} className="chord-badge" onClick={() => addChordToActiveSection(ch)}>{ch}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---- Fretboard ---- */}
        <div className="fretboard-wrapper">
          <Fretboard
            keySignature={project.key_signature}
            activeChord={isPlaying ? currentChordName : (activeSection?.chords[0]?.chord || '')}
            capoPosition={project.capo_position}
            onPlayNote={playFretNote}
          />
        </div>
      </main>

      {/* ===== MIXER SIDEBAR ===== */}
      <aside className="right-sidebar">
        <div className="right-sidebar-title">🎛 Mezcla</div>

        {[
          { key: 'guitar', label: '🎸 Guitarra', color: '#3b82f6', patterns: [['strum','Rasgueo'],['arpeggio','Arpegio']] },
          { key: 'piano',  label: '🎹 Piano',    color: '#8b5cf6', patterns: [['arpeggio','Arpegio'],['chord','Bloque']] },
          { key: 'bass',   label: '🎵 Bajo',     color: '#f59e0b', patterns: [['roots','Tónicas'],['walking','Walking']] },
          { key: 'drums',  label: '🥁 Batería',  color: '#10b981', patterns: [['basic','Base'],['metronome','Click']] },
        ].map(({ key, label, color, patterns }) => (
          <div key={key} className={`instrument-strip ${instruments[key].active ? 'active-inst' : ''}`} style={{ borderLeft: `2px solid ${instruments[key].active ? color : 'var(--border-color)'}` }}>
            <div className="instrument-header">
              <span className="instrument-title" style={{ color: instruments[key].active ? color : 'var(--text-secondary)' }}>{label}</span>
              <label className="toggle-switch">
                <input type="checkbox" checked={instruments[key].active} onChange={() => toggleInstrument(key)} />
                <span className="slider-round" />
              </label>
            </div>
            <input type="range" min="-40" max="0" value={instruments[key].volume} onChange={e => handleVolumeChange(key, e.target.value)} className="custom-range" disabled={!instruments[key].active} />
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {patterns.map(([pat, lbl]) => (
                <button key={pat} className={`pattern-btn ${instruments[key].type === pat ? 'active' : ''}`} onClick={() => handlePatternChange(key, pat)} disabled={!instruments[key].active}>{lbl}</button>
              ))}
            </div>
          </div>
        ))}

        <div style={{ flex: 1 }} />

        {/* Cover Art */}
        <div className="instrument-strip" style={{ alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', alignSelf: 'flex-start' }}>
            <ImageIcon size={13} /><span className="instrument-title">Portada</span>
          </div>
          {project?.cover_art
            ? <img src={project.cover_art} alt="Portada" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }} />
            : <div style={{ width: '100%', aspectRatio: '1', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.72rem', gap: '0.3rem' }}>
                <ImageIcon size={20} style={{ opacity: 0.2 }} /><span>Sin portada</span>
              </div>
          }
          <button onClick={handleGenerateCover} className="btn-flat" disabled={isGeneratingArt} style={{ width: '100%', justifyContent: 'center', fontSize: '0.72rem', padding: '0.32rem' }}>
            <Sparkles size={11} /> {isGeneratingArt ? 'Generando...' : 'Generar Portada'}
          </button>
        </div>
      </aside>

      {/* ===== MODAL ANÁLISIS ===== */}
      {isAnalysisModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAnalysisModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1rem', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Sparkles size={15} /> Análisis de Producción Pro</h2>
              <button onClick={() => setIsAnalysisModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.3rem', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ fontSize: '0.85rem', lineHeight: '1.7', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', maxHeight: '60vh', overflowY: 'auto' }}>
              {analysisResult}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <button onClick={() => setIsAnalysisModalOpen(false)} className="btn-primary">Entendido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
