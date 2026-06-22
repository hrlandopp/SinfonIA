import React, { useState, useEffect, useRef } from 'react'
import { 
  Play, Pause, Square, Send, Settings, Plus, Trash2, 
  Music, Volume2, Sparkles, Sliders, Info, ChevronLeft, 
  FolderOpen, BookOpen, HelpCircle, HardDrive
} from 'lucide-react'

import { supabase, isSupabaseConfigured, saveSupabaseCredentials } from './utils/supabaseClient'
import { sendMessageToProducerAI, isGeminiConfigured, saveGeminiKey } from './utils/geminiClient'
import { audioEngine } from './utils/AudioEngine'
import Fretboard from './components/Fretboard'

const INITIAL_PROJECTS = [
  {
    id: 'local-proj-1',
    name: 'Balada de Otoño',
    tempo_bpm: 85,
    key_signature: 'Em',
    capo_position: 2,
    mood: 'Melancólico',
    updated_at: new Date().toISOString()
  },
  {
    id: 'local-proj-2',
    name: 'Ritmo del Desierto',
    tempo_bpm: 120,
    key_signature: 'Am',
    capo_position: 0,
    mood: 'Enérgico',
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
  const [currentView, setCurrentView] = useState('dashboard') // 'dashboard' o 'editor'
  const [activeTab, setActiveTab] = useState('projects') // 'projects', 'settings', 'help'
  
  // --- Estados de Proyectos ---
  const [projectsList, setProjectsList] = useState([])
  const [project, setProject] = useState(null) // Proyecto seleccionado actualmente
  const [sections, setSections] = useState([])
  const [activeSectionId, setActiveSectionId] = useState('')
  
  // --- Estados del Reproductor ---
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentBeat, setCurrentBeat] = useState(0)
  const [currentChordIndex, setCurrentChordIndex] = useState(0)
  const [currentChordName, setCurrentChordName] = useState('')
  
  // --- Estados del Chat ---
  const [chatHistory, setChatHistory] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [isLoadingAi, setIsLoadingAi] = useState(false)
  
  // --- Mixer / Instrumentos ---
  const [instruments, setInstruments] = useState({
    piano: { active: true, volume: -8, type: 'arpeggio' },
    guitar: { active: false, volume: -12, type: 'strum' },
    bass: { active: true, volume: -10, type: 'roots' },
    drums: { active: true, volume: -12, type: 'basic' }
  })

  // --- Ajustes / Credenciales ---
  const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('supabase_url') || '')
  const [supabaseKey, setSupabaseKey] = useState(localStorage.getItem('supabase_anon_key') || '')
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('gemini_api_key') || '')
  const [dbStatus, setDbStatus] = useState('Modo Local')
  
  const chatEndRef = useRef(null)

  // Cargar lista de proyectos al iniciar
  useEffect(() => {
    if (isSupabaseConfigured()) {
      setDbStatus('Conectado a Supabase ⚡')
      loadProjectsFromSupabase()
    } else {
      setDbStatus('Modo Local')
      const localProjs = localStorage.getItem('local_projects_list')
      if (localProjs) {
        setProjectsList(JSON.parse(localProjs))
      } else {
        setProjectsList(INITIAL_PROJECTS)
        localStorage.setItem('local_projects_list', JSON.stringify(INITIAL_PROJECTS))
      }
    }
  }, [])

  // Auto-scroll en el chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  // Sincronizar acordes del reproductor al cambiar de sección
  useEffect(() => {
    const activeSection = sections.find(s => s.id === activeSectionId)
    if (activeSection) {
      audioEngine.setChords(activeSection.chords || [])
      if (activeSection.accompaniment) {
        Object.keys(activeSection.accompaniment).forEach(inst => {
          audioEngine.setPatternType(inst, activeSection.accompaniment[inst])
        })
      }
    }
  }, [sections, activeSectionId])

  // Registrar el callback de ritmo del metrónomo
  useEffect(() => {
    audioEngine.onBeatCallback = (beat, chordIdx, chordName) => {
      setCurrentBeat(beat)
      setCurrentChordIndex(chordIdx)
      setCurrentChordName(chordName || '')
    }
  }, [])

  // Guardar datos locales en localStorage cuando cambian
  const saveLocalProjectsToStorage = (list) => {
    setProjectsList(list)
    localStorage.setItem('local_projects_list', JSON.stringify(list))
  }

  // --- Funciones de Supabase ---
  const loadProjectsFromSupabase = async () => {
    try {
      if (!supabase) return
      const { data: projs, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      setProjectsList(projs || [])
    } catch (e) {
      console.error(e)
      setDbStatus('Error en Supabase')
    }
  }

  // --- Selección de Proyecto ---
  const handleSelectProject = async (selectedProj) => {
    setProject(selectedProj)
    audioEngine.setBpm(selectedProj.tempo_bpm)
    handleStop() // Detener cualquier reproducción previa
    
    if (isSupabaseConfigured() && selectedProj.id !== 'local-project') {
      try {
        // Cargar secciones
        const { data: secs, error: sErr } = await supabase
          .from('sections')
          .select('*')
          .eq('project_id', selectedProj.id)
          .order('order_index', { ascending: true })

        if (sErr) throw sErr
        setSections(secs || [])
        if (secs && secs.length > 0) {
          setActiveSectionId(secs[0].id)
        }

        // Cargar chat
        const { data: chat, error: cErr } = await supabase
          .from('chat_history')
          .select('*')
          .eq('project_id', selectedProj.id)
          .order('created_at', { ascending: true })

        if (cErr) throw cErr
        setChatHistory(chat && chat.length > 0 ? chat : [
          {
            id: 'welcome',
            sender: 'assistant',
            message: `¡Hola! Bienvenido de nuevo a tu proyecto "${selectedProj.name}". ¿Qué cambios melódicos o estructurales te gustaría hacer hoy?`
          }
        ])
      } catch (e) {
        console.error(e)
      }
    } else {
      // Modo Local - Leer de localStorage
      const localSecs = localStorage.getItem(`local_secs_${selectedProj.id}`)
      const localChat = localStorage.getItem(`local_chat_${selectedProj.id}`)
      
      if (localSecs) {
        const parsedSecs = JSON.parse(localSecs)
        setSections(parsedSecs)
        setActiveSectionId(parsedSecs[0]?.id || '')
      } else {
        // Inicializar secciones por defecto en local
        const initialSecs = DEFAULT_SECTIONS_FOR_NEW.map(s => ({ ...s, id: `${s.id}-${Date.now()}` }))
        setSections(initialSecs)
        setActiveSectionId(initialSecs[0].id)
        localStorage.setItem(`local_secs_${selectedProj.id}`, JSON.stringify(initialSecs))
      }

      if (localChat) {
        setChatHistory(JSON.parse(localChat))
      } else {
        const welcomeMsg = [
          {
            id: 'welcome',
            sender: 'assistant',
            message: `¡Hola! Bienvenido a tu proyecto local "${selectedProj.name}". ¿Cómo te gustaría empezar a estructurar la guitarra y el acompañamiento?`
          }
        ]
        setChatHistory(welcomeMsg)
        localStorage.setItem(`local_chat_${selectedProj.id}`, JSON.stringify(welcomeMsg))
      }
    }

    setCurrentView('editor')
  }

  // --- Crear Nuevo Proyecto ---
  const handleCreateProject = async () => {
    const projName = prompt('Nombre del nuevo proyecto:', 'Mi Canción')
    if (!projName || !projName.trim()) return

    const newProjData = {
      name: projName.trim(),
      tempo_bpm: 120,
      key_signature: 'C',
      capo_position: 0,
      mood: 'Neutral',
      updated_at: new Date().toISOString()
    }

    if (isSupabaseConfigured()) {
      try {
        const { data: newProj, error: pErr } = await supabase
          .from('projects')
          .insert([newProjData])
          .select()

        if (pErr) throw pErr
        const createdProj = newProj[0]

        // Crear secciones
        const initialSections = DEFAULT_SECTIONS_FOR_NEW.map((sec, idx) => ({
          project_id: createdProj.id,
          name: sec.name,
          order_index: idx,
          chords: sec.chords,
          accompaniment: sec.accompaniment
        }))

        const { error: sErr } = await supabase
          .from('sections')
          .insert(initialSections)

        if (sErr) throw sErr

        await loadProjectsFromSupabase()
        handleSelectProject(createdProj)
      } catch (e) {
        console.error(e)
      }
    } else {
      // Guardar en Modo Local
      const newLocalId = `local-proj-${Date.now()}`
      const createdProj = { ...newProjData, id: newLocalId }
      
      const updatedList = [createdProj, ...projectsList]
      saveLocalProjectsToStorage(updatedList)
      handleSelectProject(createdProj)
    }
  }

  // --- Borrar Proyecto ---
  const handleDeleteProject = async (id, e) => {
    e.stopPropagation()
    if (!confirm('¿Estás seguro de que deseas borrar este proyecto permanentemente?')) return

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', id)

        if (error) throw error
        loadProjectsFromSupabase()
      } catch (err) {
        console.error(err)
      }
    } else {
      const updated = projectsList.filter(p => p.id !== id)
      saveLocalProjectsToStorage(updated)
      
      // Limpiar datos huérfanos de localStorage
      localStorage.removeItem(`local_secs_${id}`)
      localStorage.removeItem(`local_chat_${id}`)
    }
  }

  // --- Guardar Cambios en Caliente ---
  const saveCurrentState = (updatedProj, updatedSecs) => {
    if (isSupabaseConfigured() && updatedProj.id !== 'local-project') {
      saveProjectStateToSupabase(updatedProj, updatedSecs)
    } else {
      // Guardar local
      const updatedList = projectsList.map(p => p.id === updatedProj.id ? { ...updatedProj, updated_at: new Date().toISOString() } : p)
      saveLocalProjectsToStorage(updatedList)
      localStorage.setItem(`local_secs_${updatedProj.id}`, JSON.stringify(updatedSecs))
      localStorage.setItem(`local_chat_${updatedProj.id}`, JSON.stringify(chatHistory))
    }
  }

  const saveProjectStateToSupabase = async (updatedProj, updatedSecs) => {
    if (!supabase) return
    try {
      await supabase
        .from('projects')
        .update({
          name: updatedProj.name,
          tempo_bpm: updatedProj.tempo_bpm,
          key_signature: updatedProj.key_signature,
          capo_position: updatedProj.capo_position,
          mood: updatedProj.mood,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedProj.id)

      for (const sec of updatedSecs) {
        await supabase
          .from('sections')
          .update({
            name: sec.name,
            chords: sec.chords,
            accompaniment: sec.accompaniment,
            order_index: sec.order_index
          })
          .eq('id', sec.id)
      }
    } catch (e) {
      console.error(e)
    }
  }

  // --- Controles de Audio ---
  const handlePlayToggle = async () => {
    await audioEngine.startContext()
    if (isPlaying) {
      audioEngine.pause()
      setIsPlaying(false)
    } else {
      audioEngine.setBpm(project.tempo_bpm)
      audioEngine.play()
      setIsPlaying(true)
    }
  }

  const handleStop = () => {
    audioEngine.stop()
    setIsPlaying(false)
    setCurrentBeat(0)
    setCurrentChordIndex(0)
    const activeSec = sections.find(s => s.id === activeSectionId)
    setCurrentChordName(activeSec?.chords[0]?.chord || '')
  }

  const updateBpm = (newBpm) => {
    const val = Math.min(240, Math.max(40, parseInt(newBpm) || 120))
    const updated = { ...project, tempo_bpm: val }
    setProject(updated)
    audioEngine.setBpm(val)
    saveCurrentState(updated, sections)
  }

  const updateKeySignature = (newKey) => {
    const updated = { ...project, key_signature: newKey }
    setProject(updated)
    saveCurrentState(updated, sections)
  }

  const updateCapoPosition = (newCapo) => {
    const val = Math.min(12, Math.max(0, parseInt(newCapo) || 0))
    const updated = { ...project, capo_position: val }
    setProject(updated)
    saveCurrentState(updated, sections)
  }

  // --- Enviar Chat ---
  const handleSendChatMessage = async (e) => {
    e.preventDefault()
    if (!chatInput.trim() || isLoadingAi) return

    const userMsg = chatInput.trim()
    setChatInput('')

    const newUserMessage = {
      id: Date.now().toString(),
      sender: 'user',
      message: userMsg,
      created_at: new Date().toISOString()
    }
    
    const updatedHistory = [...chatHistory, newUserMessage]
    setChatHistory(updatedHistory)
    
    if (isSupabaseConfigured() && project.id !== 'local-project') {
      await supabase.from('chat_history').insert([{
        project_id: project.id,
        sender: 'user',
        message: userMsg
      }])
    } else {
      localStorage.setItem(`local_chat_${project.id}`, JSON.stringify(updatedHistory))
    }

    if (!isGeminiConfigured() && !geminiKey) {
      setChatHistory(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'assistant',
        message: '⚠️ La clave de API de Gemini no está configurada. Haz clic en "Volver" y configúrala en el menú de Ajustes.'
      }])
      return
    }

    setIsLoadingAi(true)

    try {
      const projectState = {
        name: project.name,
        tempo_bpm: project.tempo_bpm,
        key_signature: project.key_signature,
        capo_position: project.capo_position,
        mood: project.mood,
        sections: sections.map(s => ({
          name: s.name,
          chords: s.chords,
          order_index: s.order_index
        }))
      }

      const aiResponse = await sendMessageToProducerAI(userMsg, updatedHistory, projectState)
      
      let systemActions = []
      let tempProject = { ...project }
      let tempSections = [...sections]

      if (aiResponse.changes) {
        const changes = aiResponse.changes
        let changed = false

        if (changes.tempo_bpm !== undefined && changes.tempo_bpm !== project.tempo_bpm) {
          tempProject.tempo_bpm = changes.tempo_bpm
          audioEngine.setBpm(changes.tempo_bpm)
          systemActions.push(`BPM a ${changes.tempo_bpm}`)
          changed = true
        }

        if (changes.key_signature !== undefined && changes.key_signature !== project.key_signature) {
          tempProject.key_signature = changes.key_signature
          systemActions.push(`Tono a ${changes.key_signature}`)
          changed = true
        }

        if (changes.capo_position !== undefined && changes.capo_position !== project.capo_position) {
          tempProject.capo_position = changes.capo_position
          systemActions.push(`Capo en traste ${changes.capo_position}`)
          changed = true
        }

        if (changes.sections && Array.isArray(changes.sections)) {
          tempSections = changes.sections.map((sec, idx) => ({
            id: sections[idx]?.id || `sec-${Date.now()}-${idx}`,
            name: sec.name,
            order_index: sec.order_index ?? idx,
            chords: sec.chords || [],
            accompaniment: sections[idx]?.accompaniment || { piano: 'arpeggio', bass: 'roots', drums: 'basic' }
          }))
          systemActions.push(`Acordes editados por el productor`)
          changed = true
        }

        if (changed) {
          setProject(tempProject)
          setSections(tempSections)
          saveCurrentState(tempProject, tempSections)
        }
      }

      const newAiMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        message: aiResponse.message,
        created_at: new Date().toISOString()
      }

      const nextHistory = [...updatedHistory]
      
      if (systemActions.length > 0) {
        nextHistory.push({
          id: `log-${Date.now()}`,
          sender: 'system',
          message: `🛠️ Productor IA: [${systemActions.join(' | ')}]`
        })
      }
      
      nextHistory.push(newAiMessage)
      setChatHistory(nextHistory)

      if (isSupabaseConfigured() && project.id !== 'local-project') {
        await supabase.from('chat_history').insert([{
          project_id: project.id,
          sender: 'assistant',
          message: aiResponse.message
        }])
      } else {
        localStorage.setItem(`local_chat_${project.id}`, JSON.stringify(nextHistory))
      }

    } catch (error) {
      console.error(error)
      setChatHistory(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'assistant',
        message: `⚠️ Hubo un error de conexión: ${error.message}`
      }])
    } finally {
      setIsLoadingAi(false)
    }
  }

  // --- Ajustes del Mixer ---
  const toggleInstrument = (instName) => {
    const updatedActive = !instruments[instName].active
    setInstruments(prev => ({
      ...prev,
      [instName]: { ...prev[instName], active: updatedActive }
    }))
    audioEngine.setInstrumentActive(instName, updatedActive)
  }

  const handleVolumeChange = (instName, value) => {
    const vol = parseFloat(value)
    setInstruments(prev => ({
      ...prev,
      [instName]: { ...prev[instName], volume: vol }
    }))
    audioEngine.setVolume(instName, vol)
  }

  const handlePatternChange = (instName, type) => {
    setInstruments(prev => ({
      ...prev,
      [instName]: { ...prev[instName], type }
    }))
    audioEngine.setPatternType(instName, type)
    
    const updatedSecs = sections.map(s => {
      if (s.id === activeSectionId) {
        return {
          ...s,
          accompaniment: {
            ...s.accompaniment,
            [instName]: type
          }
        }
      }
      return s
    })
    setSections(updatedSecs)
    saveCurrentState(project, updatedSecs)
  }

  // --- Control de Secciones ---
  const addNewSection = () => {
    const newIdx = sections.length
    const names = ['Verso', 'Coro', 'Puente', 'Outro']
    const nextName = names[newIdx % names.length] || 'Sección'
    
    const newSec = {
      id: `sec-${Date.now()}`,
      name: `${nextName} ${Math.floor(newIdx / 4) + 1}`,
      order_index: newIdx,
      chords: [
        { chord: 'C', beats: 4 },
        { chord: 'G', beats: 4 },
        { chord: 'Am', beats: 4 },
        { chord: 'F', beats: 4 }
      ],
      accompaniment: { piano: 'arpeggio', bass: 'roots', drums: 'basic' }
    }
    const updated = [...sections, newSec]
    setSections(updated)
    saveCurrentState(project, updated)
  }

  const deleteSection = (id, e) => {
    e.stopPropagation()
    if (sections.length <= 1) return
    const updated = sections.filter(s => s.id !== id).map((s, idx) => ({ ...s, order_index: idx }))
    setSections(updated)
    if (activeSectionId === id) {
      setActiveSectionId(updated[0].id)
    }
    saveCurrentState(project, updated)
  }

  const addChordToActiveSection = (chordName) => {
    const updated = sections.map(s => {
      if (s.id === activeSectionId) {
        return {
          ...s,
          chords: [...s.chords, { chord: chordName, beats: 4 }]
        }
      }
      return s
    })
    setSections(updated)
    saveCurrentState(project, updated)
  }

  const removeLastChordFromActive = () => {
    const updated = sections.map(s => {
      if (s.id === activeSectionId) {
        if (s.chords.length <= 1) return s
        const nextChords = [...s.chords]
        nextChords.pop()
        return { ...s, chords: nextChords }
      }
      return s
    })
    setSections(updated)
    saveCurrentState(project, updated)
  }

  const playFretNote = async (noteName, midiVal) => {
    await audioEngine.startContext()
    audioEngine.piano.triggerAttackRelease(noteName + '4', '8n')
  }

  const activeSection = sections.find(s => s.id === activeSectionId)
  
  const handleSaveSettings = (e) => {
    e.preventDefault()
    if (supabaseUrl && supabaseKey) {
      saveSupabaseCredentials(supabaseUrl, supabaseKey)
    }
    if (geminiKey) {
      saveGeminiKey(geminiKey)
    }
  }

  // --- RENDERIZADO VISTA 1: MENÚ PRINCIPAL ---
  if (currentView === 'dashboard') {
    return (
      <div className="app-container dashboard-layout">
        
        {/* Barra Lateral del Menú */}
        <aside className="dashboard-sidebar">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.5rem' }}>
              <span style={{ fontSize: '1.75rem' }}>🎸</span>
              <div>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>SinfonIA</h1>
                <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>ESTUDIO DE COMPOSICIÓN</p>
              </div>
            </div>

            <nav className="dashboard-menu">
              <button 
                className={`menu-item ${activeTab === 'projects' ? 'active' : ''}`}
                onClick={() => setActiveTab('projects')}
              >
                <FolderOpen size={16} />
                Mis Proyectos
              </button>
              <button 
                className={`menu-item ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                <Settings size={16} />
                Ajustes de API
              </button>
              <button 
                className={`menu-item ${activeTab === 'help' ? 'active' : ''}`}
                onClick={() => setActiveTab('help')}
              >
                <BookOpen size={16} />
                Ayuda y Guía
              </button>
            </nav>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.65rem', color: 'var(--text-secondary)', padding: '0 0.5rem' }}>
            <HardDrive size={12} />
            <span>{dbStatus}</span>
          </div>
        </aside>

        {/* Contenido Principal según Pestaña */}
        <main className="dashboard-content">
          
          {activeTab === 'projects' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <div>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Proyectos de Composición</h1>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Selecciona un proyecto existente o crea uno nuevo para empezar a componer.</p>
                </div>
                <button className="btn-primary" onClick={handleCreateProject}>
                  <Plus size={16} /> Nuevo Proyecto
                </button>
              </div>

              {dbStatus.includes('Error') && (
                <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-red)', color: '#fca5a5', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                  <strong>⚠️ Error al conectar con Supabase:</strong>
                  <span>Es posible que no hayas creado las tablas en tu base de datos de Supabase. Copia el archivo <code>supabase/schema.sql</code> de tu proyecto y ejecútalo en la pestaña "SQL Editor" en el panel web de Supabase. Asegúrate de desactivar el sistema RLS (Row Level Security) para evitar bloqueos de permisos.</span>
                </div>
              )}

              {projectsList.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
                  <Music size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                  <p>No tienes proyectos guardados.</p>
                  <button className="btn-primary" onClick={handleCreateProject} style={{ margin: '1rem auto 0' }}>Crear uno ahora</button>
                </div>
              ) : (
                <div className="projects-grid">
                  {projectsList.map((p) => (
                    <div 
                      key={p.id} 
                      className="project-card"
                      onClick={() => handleSelectProject(p)}
                    >
                      <div className="project-card-header">
                        <div>
                          <h3 className="project-card-title">{p.name}</h3>
                          <div className="project-card-meta">
                            <span>{p.tempo_bpm} BPM</span>
                            <span>Tono: {p.key_signature}</span>
                            {p.capo_position > 0 && <span>Capo: {p.capo_position}</span>}
                          </div>
                        </div>
                        <button 
                          onClick={(e) => handleDeleteProject(p.id, e)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                          title="Eliminar proyecto"
                          className="hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="project-card-footer">
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Modificado: {new Date(p.updated_at).toLocaleDateString()}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          Abrir Estudio →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'settings' && (
            <div style={{ maxWidth: '600px' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Configuración de API & Backend</h1>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Configura tus llaves para habilitar el guardado automático en la nube y la inteligencia artificial.</p>
              </div>

              <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="gemini-key-dashboard">Google Gemini API Key (AI Studio)</label>
                  <input 
                    id="gemini-key-dashboard"
                    type="password" 
                    placeholder="AIzaSy..." 
                    value={geminiKey} 
                    onChange={(e) => setGeminiKey(e.target.value)}
                    className="chat-input"
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    Requerido para conversar con tu productor musical de IA. Consigue una gratis en <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)' }}>Google AI Studio</a>.
                  </span>
                </div>

                <div style={{ borderBottom: '1px dashed var(--border-color)' }} />

                <div className="form-group">
                  <label className="form-label" htmlFor="supabase-url-dashboard">Supabase Project URL</label>
                  <input 
                    id="supabase-url-dashboard"
                    type="text" 
                    placeholder="https://xyz.supabase.co" 
                    value={supabaseUrl} 
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    className="chat-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="supabase-key-dashboard">Supabase Anon Key</label>
                  <input 
                    id="supabase-key-dashboard"
                    type="password" 
                    placeholder="eyJhbGciOi..." 
                    value={supabaseKey} 
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    className="chat-input"
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    Conecta Supabase para guardar tus proyectos en la nube automáticamente y acceder a ellos desde cualquier dispositivo. Si lo dejas en blanco, se guardarán en tu navegador (localmente).
                  </span>
                </div>

                <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start' }}>
                  Guardar y Recargar Entorno
                </button>
              </form>
            </div>
          )}

          {activeTab === 'help' && (
            <div style={{ maxWidth: '750px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Guía de Uso de SinfonIA</h1>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Conceptos básicos para sacarle el máximo partido a tu estudio inteligente.</p>
              </div>

              <div className="daw-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ color: 'var(--accent-amber)' }}>🎙️ Conversar con el Productor</h3>
                <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                  El chat de IA no es solo para texto. Cuando hablas con SinfonIA sobre tus sentimientos o ideas (ej: *"Quiero que el intro suene más triste y despacio"* o *"Agrega un acorde de Re mayor al final del coro"*), el productor modificará **directamente** los parámetros de tu proyecto (BPM, tonalidad o la lista de acordes). Verás reflejados los cambios de inmediato en tu pantalla.
                </p>
              </div>

              <div className="daw-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ color: 'var(--accent-blue)' }}>🎸 El Capotraste y el Mástil</h3>
                <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                  Si usas un capotraste en tu guitarra física, indícalo en el control **Capo** del menú superior. El diapasón visual de la pantalla se bloqueará detrás de ese traste y transpondrá todas las notas en tiempo real para que coincidan con la posición física donde debes colocar tus dedos. Las notas rojas representan la raíz (tónica) de la escala, las azules las notas del acorde actual y las transparentes/grises el resto de la escala.
                </p>
              </div>

              <div className="daw-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ color: 'var(--accent-green)' }}>🎹 Mezclador de Acompañamiento</h3>
                <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                  A la derecha tienes el mixer. Activa el piano y configúralo en **Arpegio** para escuchar melodías fluidas sobre tus acordes. Modifica el estilo del bajo a **Caminante** para darle un toque dinámico o enciende la percusión para marcar el ritmo. Puedes reproducir cada nota del mástil de la guitarra de forma individual haciendo clic sobre ellas.
                </p>
              </div>
            </div>
          )}

        </main>
      </div>
    )
  }

  // --- RENDERIZADO VISTA 2: ESPACIO DE EDICIÓN (DAW WORKSPACE) ---
  return (
    <div className="app-container editor-layout">
      
      {/* PANEL IZQUIERDO: CHAT DE IA */}
      <aside className="chat-sidebar">
        <header className="chat-header">
          <button className="btn-flat" onClick={() => setCurrentView('dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.6rem' }}>
            <ChevronLeft size={14} /> Volver
          </button>
          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent-blue)', textTransform: 'uppercase' }}>Productor IA</span>
        </header>

        <div className="chat-messages">
          {chatHistory.map((msg) => {
            if (msg.sender === 'system') {
              return (
                <div key={msg.id} className="message-system-log">
                  {msg.message}
                </div>
              )
            }
            return (
              <div 
                key={msg.id} 
                className={`message-bubble ${msg.sender === 'user' ? 'message-user' : 'message-assistant'}`}
              >
                {msg.message}
              </div>
            )
          })}
          {isLoadingAi && (
            <div className="message-bubble message-assistant" style={{ opacity: 0.6 }}>
              <span style={{ fontStyle: 'italic' }}>El productor está ajustando los acordes...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSendChatMessage} className="chat-input-area">
          <input 
            type="text" 
            placeholder="Pídele cambios a SinfonIA..." 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="chat-input"
            disabled={isLoadingAi}
          />
          <button type="submit" className="btn-primary" disabled={isLoadingAi || !chatInput.trim()}>
            <Send size={14} />
          </button>
        </form>
      </aside>

      {/* ÁREA CENTRAL: SECUENCIADOR Y GUITARRA */}
      <main className="studio-workspace">
        
        <header className="daw-panel workspace-header">
          <div>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Edición de Composición</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{project.name}</h2>
          </div>

          <div className="project-meta-controls">
            <div className="play-controls">
              <button 
                onClick={handlePlayToggle} 
                className={`btn-icon ${isPlaying ? 'active' : ''}`}
                title={isPlaying ? 'Pausar' : 'Reproducir'}
                id="btn-play-toggle"
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button onClick={handleStop} className="btn-icon" title="Detener" id="btn-stop">
                <Square size={16} />
              </button>
            </div>

            {/* Tempo (BPM) */}
            <div className="control-pill">
              <span>BPM:</span>
              <input 
                type="number" 
                value={project.tempo_bpm} 
                onChange={(e) => updateBpm(e.target.value)}
                style={{ width: '40px', background: 'transparent', border: 'none', color: 'white', fontWeight: 'bold', outline: 'none' }}
              />
            </div>

            {/* Tonalidad */}
            <div className="control-pill badge-interactive">
              <span>Tono:</span>
              <select 
                value={project.key_signature}
                onChange={(e) => updateKeySignature(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', outline: 'none' }}
              >
                {['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'Dm', 'Gm', 'Cm', 'Fm'].map(k => (
                  <option key={k} value={k} style={{ background: 'var(--bg-secondary)', color: 'white' }}>{k}</option>
                ))}
              </select>
            </div>

            {/* Capo */}
            <div className="control-pill">
              <span>Capo:</span>
              <input 
                type="number" 
                min="0" 
                max="12"
                value={project.capo_position} 
                onChange={(e) => updateCapoPosition(e.target.value)}
                style={{ width: '30px', background: 'transparent', border: 'none', color: 'white', fontWeight: 'bold', outline: 'none' }}
              />
            </div>
          </div>
        </header>

        {/* Secuenciador */}
        <section className="daw-panel sequencer-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: '700' }}>Secciones de la Canción</h2>
            </div>
            <button className="btn-flat" onClick={addNewSection} style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <Plus size={12} /> Añadir Sección
            </button>
          </div>

          <div className="sequencer-grid">
            {sections.map((sec) => (
              <div 
                key={sec.id} 
                className={`section-card ${activeSectionId === sec.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveSectionId(sec.id)
                  handleStop()
                }}
              >
                <div className="section-title">
                  <span>{sec.name}</span>
                  {sections.length > 1 && (
                    <button 
                      onClick={(e) => deleteSection(sec.id, e)} 
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      <Trash2 size={12} className="hover:text-red-500" />
                    </button>
                  )}
                </div>
                
                <div className="section-chords-list">
                  {sec.chords.map((c, cIdx) => (
                    <span 
                      key={cIdx} 
                      className={`chord-badge ${isPlaying && activeSectionId === sec.id && currentChordIndex === cIdx ? 'active-chord' : ''}`}
                    >
                      {c.chord}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Detalle sección */}
        {activeSection && (
          <section className="daw-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Sección enfocada: {activeSection.name}</h3>
              </div>
              <button onClick={removeLastChordFromActive} className="btn-flat" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                Remover Último Acorde
              </button>
            </div>

            {/* Progresión gigante */}
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0.25rem 0' }}>
              {activeSection.chords.map((c, cIdx) => {
                const isCurrent = isPlaying && currentChordIndex === cIdx
                return (
                  <div 
                    key={cIdx} 
                    style={{
                      flex: '1',
                      minWidth: '90px',
                      padding: '1rem 0.5rem',
                      textAlign: 'center',
                      borderRadius: 'var(--radius-sm)',
                      background: isCurrent ? 'rgba(37, 99, 235, 0.15)' : 'var(--bg-app)',
                      border: isCurrent ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                      position: 'relative'
                    }}
                  >
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: isCurrent ? 'white' : 'var(--text-primary)', display: 'block', fontFamily: 'var(--font-mono)' }}>
                      {c.chord}
                    </span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{c.beats} pulsos</span>
                    
                    {isCurrent && (
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', marginTop: '0.4rem' }}>
                        {[0, 1, 2, 3].map((b) => (
                          <span 
                            key={b} 
                            style={{ 
                              width: '5px', 
                              height: '5px', 
                              borderRadius: '50%', 
                              background: currentBeat === b ? 'var(--accent-green)' : 'var(--text-muted)'
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Añadir acordes manual */}
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Añadir acorde rápido:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {['C', 'G', 'D', 'A', 'E', 'F', 'Am', 'Em', 'Dm', 'Bm', 'F#m', 'Cmaj7', 'Am7', 'G7', 'D7', 'E7'].map((ch) => (
                  <button 
                    key={ch} 
                    onClick={() => addChordToActiveSection(ch)}
                    className="chord-badge badge-interactive"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                  >
                    + {ch}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        <Fretboard 
          keySignature={project.key_signature}
          activeChord={isPlaying ? currentChordName : (activeSection?.chords[0]?.chord || '')}
          capoPosition={project.capo_position}
          onPlayNote={playFretNote}
        />
        
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
          <Info size={12} />
          <span>Tip: Explícale al chat cómo te sientes y SinfonIA actualizará las progresiones automáticamente.</span>
        </div>
      </main>

      {/* PANEL DERECHO: MIXER DE INSTRUMENTOS */}
      <aside className="right-sidebar">
        <h2 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
          <Sliders size={16} /> Acompañamiento
        </h2>

        {/* Piano */}
        <div className="instrument-strip">
          <div className="instrument-header">
            <span className="instrument-title">🎹 Piano</span>
            <label className="toggle-switch">
              <input type="checkbox" checked={instruments.piano.active} onChange={() => toggleInstrument('piano')} />
              <span className="slider-round"></span>
            </label>
          </div>
          <div className="slider-control">
            <div className="slider-label">
              <span>Volumen</span>
              <span>{instruments.piano.volume} dB</span>
            </div>
            <input 
              type="range" min="-40" max="0" value={instruments.piano.volume}
              onChange={(e) => handleVolumeChange('piano', e.target.value)}
              className="custom-range" disabled={!instruments.piano.active}
            />
          </div>
          <div className="slider-control">
            <div style={{ display: 'flex', gap: '0.2rem', marginTop: '0.2rem' }}>
              <button 
                onClick={() => handlePatternChange('piano', 'arpeggio')} 
                style={{ flex: 1, fontSize: '0.65rem', padding: '0.2rem', borderRadius: '2px', border: '1px solid var(--border-color)', background: instruments.piano.type === 'arpeggio' ? 'var(--accent-blue)' : 'transparent', color: 'white', cursor: 'pointer' }}
                disabled={!instruments.piano.active}
              >Arpegio</button>
              <button 
                onClick={() => handlePatternChange('piano', 'chord')} 
                style={{ flex: 1, fontSize: '0.65rem', padding: '0.2rem', borderRadius: '2px', border: '1px solid var(--border-color)', background: instruments.piano.type === 'chord' ? 'var(--accent-blue)' : 'transparent', color: 'white', cursor: 'pointer' }}
                disabled={!instruments.piano.active}
              >Bloque</button>
            </div>
          </div>
        </div>

        {/* Guía Acústica */}
        <div className="instrument-strip">
          <div className="instrument-header">
            <span className="instrument-title">🎸 Guía Acústica</span>
            <label className="toggle-switch">
              <input type="checkbox" checked={instruments.guitar.active} onChange={() => toggleInstrument('guitar')} />
              <span className="slider-round"></span>
            </label>
          </div>
          <div className="slider-control">
            <div className="slider-label">
              <span>Volumen</span>
              <span>{instruments.guitar.volume} dB</span>
            </div>
            <input 
              type="range" min="-40" max="0" value={instruments.guitar.volume}
              onChange={(e) => handleVolumeChange('guitar', e.target.value)}
              className="custom-range" disabled={!instruments.guitar.active}
            />
          </div>
        </div>

        {/* Bajo */}
        <div className="instrument-strip">
          <div className="instrument-header">
            <span className="instrument-title">🔊 Bajo</span>
            <label className="toggle-switch">
              <input type="checkbox" checked={instruments.bass.active} onChange={() => toggleInstrument('bass')} />
              <span className="slider-round"></span>
            </label>
          </div>
          <div className="slider-control">
            <div className="slider-label">
              <span>Volumen</span>
              <span>{instruments.bass.volume} dB</span>
            </div>
            <input 
              type="range" min="-40" max="0" value={instruments.bass.volume}
              onChange={(e) => handleVolumeChange('bass', e.target.value)}
              className="custom-range" disabled={!instruments.bass.active}
            />
          </div>
          <div className="slider-control">
            <div style={{ display: 'flex', gap: '0.2rem', marginTop: '0.2rem' }}>
              <button 
                onClick={() => handlePatternChange('bass', 'roots')} 
                style={{ flex: 1, fontSize: '0.65rem', padding: '0.2rem', borderRadius: '2px', border: '1px solid var(--border-color)', background: instruments.bass.type === 'roots' ? 'var(--accent-blue)' : 'transparent', color: 'white', cursor: 'pointer' }}
                disabled={!instruments.bass.active}
              >Tónicas</button>
              <button 
                onClick={() => handlePatternChange('bass', 'walking')} 
                style={{ flex: 1, fontSize: '0.65rem', padding: '0.2rem', borderRadius: '2px', border: '1px solid var(--border-color)', background: instruments.bass.type === 'walking' ? 'var(--accent-blue)' : 'transparent', color: 'white', cursor: 'pointer' }}
                disabled={!instruments.bass.active}
              >Caminante</button>
            </div>
          </div>
        </div>

        {/* Batería */}
        <div className="instrument-strip">
          <div className="instrument-header">
            <span className="instrument-title">🥁 Percusión</span>
            <label className="toggle-switch">
              <input type="checkbox" checked={instruments.drums.active} onChange={() => toggleInstrument('drums')} />
              <span className="slider-round"></span>
            </label>
          </div>
          <div className="slider-control">
            <div className="slider-label">
              <span>Volumen</span>
              <span>{instruments.drums.volume} dB</span>
            </div>
            <input 
              type="range" min="-40" max="0" value={instruments.drums.volume}
              onChange={(e) => handleVolumeChange('drums', e.target.value)}
              className="custom-range" disabled={!instruments.drums.active}
            />
          </div>
          <div className="slider-control">
            <div style={{ display: 'flex', gap: '0.2rem', marginTop: '0.2rem' }}>
              <button 
                onClick={() => handlePatternChange('drums', 'basic')} 
                style={{ flex: 1, fontSize: '0.65rem', padding: '0.2rem', borderRadius: '2px', border: '1px solid var(--border-color)', background: instruments.drums.type === 'basic' ? 'var(--accent-blue)' : 'transparent', color: 'white', cursor: 'pointer' }}
                disabled={!instruments.drums.active}
              >Base</button>
              <button 
                onClick={() => handlePatternChange('drums', 'metronome')} 
                style={{ flex: 1, fontSize: '0.65rem', padding: '0.2rem', borderRadius: '2px', border: '1px solid var(--border-color)', background: instruments.drums.type === 'metronome' ? 'var(--accent-blue)' : 'transparent', color: 'white', cursor: 'pointer' }}
                disabled={!instruments.drums.active}
              >Click</button>
            </div>
          </div>
        </div>
      </aside>

    </div>
  )
}
