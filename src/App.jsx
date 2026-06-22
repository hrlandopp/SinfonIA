import React, { useState, useEffect, useRef } from 'react'
import { 
  Play, Pause, Square, Send, Settings, Plus, Trash2, 
  Music, Volume2, Sparkles, Sliders, Info, ChevronLeft, 
  FolderOpen, BookOpen, HardDrive, Image as ImageIcon, HelpCircle, AlertCircle
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
  const [currentView, setCurrentView] = useState('dashboard') // 'dashboard' o 'editor'
  const [activeTab, setActiveTab] = useState('projects') // 'projects', 'settings', 'help'
  
  // --- Estados de Proyectos ---
  const [projectsList, setProjectsList] = useState([])
  const [project, setProject] = useState(null)
  const [sections, setSections] = useState([])
  const [activeSectionId, setActiveSectionId] = useState('')
  
  // --- Estados del Reproductor ---
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentBeat, setCurrentBeat] = useState(0)
  const [totalBeats, setTotalBeats] = useState(16)
  const [currentChordIndex, setCurrentChordIndex] = useState(0)
  const [currentChordName, setCurrentChordName] = useState('')
  
  // --- Estados del Chat ---
  const [chatHistory, setChatHistory] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [isLoadingAi, setIsLoadingAi] = useState(false)
  
  // --- Razonamiento Pro e Imagen ---
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState('')
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false)
  const [isGeneratingArt, setIsGeneratingArt] = useState(false)

  // --- Mixer / Instrumentos ---
  const [instruments, setInstruments] = useState({
    guitar: { active: true, volume: -6, type: 'strum' },
    piano: { active: true, volume: -12, type: 'arpeggio' },
    bass: { active: true, volume: -10, type: 'roots' },
    drums: { active: true, volume: -12, type: 'basic' }
  })

  // --- Ajustes / Credenciales ---
  const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('supabase_url') || '')
  const [supabaseKey, setSupabaseKey] = useState(localStorage.getItem('supabase_anon_key') || '')
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('gemini_api_key') || '')
  const [dbStatus, setDbStatus] = useState('Modo Local')
  const [geminiTestResult, setGeminiTestResult] = useState('')
  const [isTestingGemini, setIsTestingGemini] = useState(false)
  
  const chatEndRef = useRef(null)

  const [useLocalMode, setUseLocalMode] = useState(() => {
    return localStorage.getItem('use_local_mode') === 'true'
  })
  const isCloudActive = isSupabaseConfigured() && !useLocalMode

  // Cargar proyectos al iniciar
  useEffect(() => {
    if (isCloudActive) {
      setDbStatus('Conectado a Supabase ⚡')
      loadProjectsFromSupabase()
    } else {
      setDbStatus(isSupabaseConfigured() ? 'Modo Local (Supabase Desactivado)' : 'Modo Local')
      const localProjs = localStorage.getItem('local_projects_list')
      if (localProjs) {
        try {
          setProjectsList(JSON.parse(localProjs))
        } catch (e) {
          console.error('Error parsing local projects, resetting list:', e)
          setProjectsList(INITIAL_PROJECTS)
          localStorage.setItem('local_projects_list', JSON.stringify(INITIAL_PROJECTS))
        }
      } else {
        setProjectsList(INITIAL_PROJECTS)
        localStorage.setItem('local_projects_list', JSON.stringify(INITIAL_PROJECTS))
      }
    }
  }, [useLocalMode])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  // Sincronizar acordes
  useEffect(() => {
    const activeSection = sections.find(s => s.id === activeSectionId)
    if (activeSection) {
      audioEngine.setChords(activeSection.chords || [])
      // Calcular beats totales de la sección
      const beatsCount = activeSection.chords.reduce((acc, c) => acc + (c.beats || 4), 0)
      setTotalBeats(beatsCount)
      
      if (activeSection.accompaniment) {
        Object.keys(activeSection.accompaniment).forEach(inst => {
          audioEngine.setPatternType(inst, activeSection.accompaniment[inst])
        })
      }
    }
  }, [sections, activeSectionId])

  // Callback del pulso del metrónomo
  useEffect(() => {
    audioEngine.onBeatCallback = (beat, chordIdx, chordName, beatsCount) => {
      setCurrentBeat(beat)
      setCurrentChordIndex(chordIdx)
      setCurrentChordName(chordName || '')
      setTotalBeats(beatsCount || 16)
    }
  }, [])

  const saveLocalProjectsToStorage = (list) => {
    setProjectsList(list)
    localStorage.setItem('local_projects_list', JSON.stringify(list))
  }

  // Probar Gemini
  const testGeminiConnection = async () => {
    if (!geminiKey || !geminiKey.trim()) {
      setGeminiTestResult('⚠️ Por favor ingresa una clave antes de probar.')
      return
    }

    setIsTestingGemini(true)
    setGeminiTestResult('Probando conexión con Google Generative AI API...')

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey.trim()}`
      )
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      if (data.models && Array.isArray(data.models)) {
        const geminiModels = data.models.filter(m => m.name.includes('gemini'))
        if (geminiModels.length > 0) {
          const modelNames = geminiModels.map(m => m.name.replace('models/', '')).slice(0, 4).join(', ')
          setGeminiTestResult(`✅ Conexión exitosa. Tu API key es válida. Modelos disponibles: ${modelNames}...`)
        } else {
          setGeminiTestResult('✅ Conexión exitosa, pero no se listaron modelos de Gemini para esta clave.')
        }
      } else {
        setGeminiTestResult('✅ Conexión exitosa, pero la respuesta no contiene la estructura de modelos esperada.')
      }
    } catch (err) {
      console.error(err)
      setGeminiTestResult(`❌ Error de conexión: ${err.message}`)
    } finally {
      setIsTestingGemini(false)
    }
  }

  // --- Supabase load ---
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

  // Seleccionar proyecto
  const handleSelectProject = async (selectedProj) => {
    setProject(selectedProj)
    audioEngine.setBpm(selectedProj.tempo_bpm)
    handleStop()
    
    if (isCloudActive && selectedProj.id !== 'local-project') {
      try {
        const { data: secs, error: sErr } = await supabase
          .from('sections')
          .select('*')
          .eq('project_id', selectedProj.id)
          .order('order_index', { ascending: true })

        if (sErr) throw sErr
        
        let finalSecs = secs || []
        if (finalSecs.length === 0) {
          const initialSections = DEFAULT_SECTIONS_FOR_NEW.map((sec, idx) => ({
            project_id: selectedProj.id,
            name: sec.name,
            order_index: idx,
            chords: sec.chords,
            accompaniment: sec.accompaniment
          }))

          const { data: insertedSecs, error: insErr } = await supabase
            .from('sections')
            .insert(initialSections)
            .select()

          if (!insErr && insertedSecs) {
            finalSecs = insertedSecs
          }
        }

        setSections(finalSecs)
        if (finalSecs.length > 0) {
          setActiveSectionId(finalSecs[0].id)
        }

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
        console.error('Error de Supabase, usando almacenamiento local de respaldo:', e)
        alert(`Aviso: Hubo un problema al conectar con tu base de datos de Supabase (${e.message || e}). Se usarán datos locales temporales para este proyecto.`)
        
        // Fallback a almacenamiento local para evitar pantalla rota
        const localSecs = localStorage.getItem(`local_secs_${selectedProj.id}`)
        const localChat = localStorage.getItem(`local_chat_${selectedProj.id}`)
        
        if (localSecs) {
          try {
            const parsedSecs = JSON.parse(localSecs)
            setSections(parsedSecs)
            setActiveSectionId(parsedSecs[0]?.id || '')
          } catch (err) {
            console.error('Error parsing local sections fallback:', err)
            const initialSecs = DEFAULT_SECTIONS_FOR_NEW.map(s => ({ ...s, id: `${s.id}-${Date.now()}` }))
            setSections(initialSecs)
            setActiveSectionId(initialSecs[0].id)
          }
        } else {
          const initialSecs = DEFAULT_SECTIONS_FOR_NEW.map(s => ({ ...s, id: `${s.id}-${Date.now()}` }))
          setSections(initialSecs)
          setActiveSectionId(initialSecs[0].id)
        }

        if (localChat) {
          try {
            setChatHistory(JSON.parse(localChat))
          } catch (err) {
            console.error('Error parsing local chat fallback:', err)
            setChatHistory([
              {
                id: 'welcome',
                sender: 'assistant',
                message: 'Modo Local Activado temporalmente debido a un problema con el backend de Supabase.'
              }
            ])
          }
        } else {
          setChatHistory([
            {
              id: 'welcome',
              sender: 'assistant',
              message: 'Modo Local Activado temporalmente debido a un problema con el backend de Supabase.'
            }
          ])
        }
      }
    } else {
      const localSecs = localStorage.getItem(`local_secs_${selectedProj.id}`)
      const localChat = localStorage.getItem(`local_chat_${selectedProj.id}`)
      
      if (localSecs) {
        try {
          const parsedSecs = JSON.parse(localSecs)
          setSections(parsedSecs)
          setActiveSectionId(parsedSecs[0]?.id || '')
        } catch (err) {
          console.error('Error parsing local sections:', err)
          const initialSecs = DEFAULT_SECTIONS_FOR_NEW.map(s => ({ ...s, id: `${s.id}-${Date.now()}` }))
          setSections(initialSecs)
          setActiveSectionId(initialSecs[0].id)
        }
      } else {
        const initialSecs = DEFAULT_SECTIONS_FOR_NEW.map(s => ({ ...s, id: `${s.id}-${Date.now()}` }))
        setSections(initialSecs)
        setActiveSectionId(initialSecs[0].id)
        localStorage.setItem(`local_secs_${selectedProj.id}`, JSON.stringify(initialSecs))
      }

      if (localChat) {
        try {
          setChatHistory(JSON.parse(localChat))
        } catch (err) {
          console.error('Error parsing local chat:', err)
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

  // Crear proyecto
  const handleCreateProject = async () => {
    const projName = prompt('Nombre del nuevo proyecto:', 'Mi Canción')
    if (!projName || !projName.trim()) return

    const newProjData = {
      name: projName.trim(),
      tempo_bpm: 120,
      key_signature: 'C',
      capo_position: 0,
      mood: 'Neutral',
      cover_art: '',
      updated_at: new Date().toISOString()
    }

    if (isCloudActive) {
      try {
        const { data: newProj, error: pErr } = await supabase
          .from('projects')
          .insert([newProjData])
          .select()

        if (pErr) throw pErr
        
        if (!newProj || newProj.length === 0) {
          throw new Error('Supabase no devolvió los datos. RLS podría estar activo.')
        }
        
        const createdProj = newProj[0]

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
        alert(`No se pudo crear en Supabase: ${e.message}`)
      }
    } else {
      const newLocalId = `local-proj-${Date.now()}`
      const createdProj = { ...newProjData, id: newLocalId }
      
      const updatedList = [createdProj, ...projectsList]
      saveLocalProjectsToStorage(updatedList)
      handleSelectProject(createdProj)
    }
  }

  // Borrar proyecto
  const handleDeleteProject = async (id, e) => {
    e.stopPropagation()
    if (!confirm('¿Deseas borrar este proyecto?')) return

    if (isCloudActive) {
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
      localStorage.removeItem(`local_secs_${id}`)
      localStorage.removeItem(`local_chat_${id}`)
    }
  }

  // Guardar en caliente
  const saveCurrentState = (updatedProj, updatedSecs) => {
    if (isCloudActive && updatedProj.id !== 'local-project') {
      saveProjectStateToSupabase(updatedProj, updatedSecs)
    } else {
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
          cover_art: updatedProj.cover_art,
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

  // --- Iniciar Análisis Profundo (gemini-3.1-pro) ---
  const handleRunAnalysis = async () => {
    if (!isGeminiConfigured()) {
      alert('Configura tu clave de Gemini API primero.')
      return
    }

    setIsAnalyzing(true)
    setAnalysisResult('El productor analítico de SinfonIA está estudiando tu progresión. Espera un momento...')
    setIsAnalysisModalOpen(true)

    try {
      const pState = {
        name: project.name,
        key_signature: project.key_signature,
        tempo_bpm: project.tempo_bpm,
        capo_position: project.capo_position,
        mood: project.mood,
        sections: sections.map(s => ({
          name: s.name,
          chords: s.chords
        }))
      }
      
      const critique = await runDeepCompositionAnalysis(pState)
      setAnalysisResult(critique)
    } catch (e) {
      console.error(e)
      setAnalysisResult(`❌ Error en el análisis: ${e.message}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // --- Generar Portada (imagen-3.0-generate-002) ---
  const handleGenerateCover = async () => {
    if (!isGeminiConfigured()) {
      alert('Configura tu clave de Gemini API primero.')
      return
    }

    const description = prompt('Describe visualmente tu canción o el sentimiento (en inglés o español):', project.mood || 'A melancholic guitar vibe')
    if (!description) return

    setIsGeneratingArt(true)
    try {
      const base64Bytes = await generateSongArt(project.name, description)
      const dataUri = `data:image/png;base64,${base64Bytes}`
      
      const updatedProject = { ...project, cover_art: dataUri }
      setProject(updatedProject)
      saveCurrentState(updatedProject, sections)
      
      alert('🎨 Portada generada con éxito con Imagen 3!')
    } catch (e) {
      console.error(e)
      alert(`No se pudo generar el arte: ${e.message}`)
    } finally {
      setIsGeneratingArt(false)
    }
  }

  // --- Controles de Playback ---
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

  // --- Mixer ---
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
          accompaniment: { ...s.accompaniment, [instName]: type }
        }
      }
      return s
    })
    setSections(updatedSecs)
    saveCurrentState(project, updatedSecs)
  }

  // --- Secciones ---
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

  const activeSection = sections.find(s => s.id === activeSectionId)

  // --- RENDERIZADO VISTA 1: DASHBOARD ---
  if (currentView === 'dashboard') {
    return (
      <div className="app-container dashboard-layout">
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
              <button className={`menu-item ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>
                <FolderOpen size={16} /> Mis Proyectos
              </button>
              <button className={`menu-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
                <Settings size={16} /> Ajustes de API
              </button>
              <button className={`menu-item ${activeTab === 'help' ? 'active' : ''}`} onClick={() => setActiveTab('help')}>
                <BookOpen size={16} /> Ayuda y Guía
              </button>
            </nav>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0 0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
              <HardDrive size={12} />
              <span>{dbStatus}</span>
            </div>
            {isSupabaseConfigured() && (
              <button 
                className="btn-flat" 
                onClick={() => {
                  const nextMode = !useLocalMode;
                  setUseLocalMode(nextMode);
                  localStorage.setItem('use_local_mode', String(nextMode));
                }}
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem', width: '100%', textAlign: 'center', cursor: 'pointer' }}
              >
                {useLocalMode ? '🔌 Conectar a Supabase' : '📴 Forzar Modo Local'}
              </button>
            )}
          </div>
        </aside>

        <main className="dashboard-content">
          {activeTab === 'projects' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <div>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Proyectos de Composición</h1>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Selecciona un proyecto o crea uno nuevo para empezar a componer.</p>
                </div>
                <button className="btn-primary" onClick={handleCreateProject}>
                  <Plus size={16} /> Nuevo Proyecto
                </button>
              </div>

              {dbStatus.includes('Error') && (
                <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-red)', color: '#fca5a5', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                  <strong>⚠️ Error al conectar con Supabase:</strong>
                  <span>Es posible que no hayas creado las tablas. Ejecuta el archivo <code>supabase/schema.sql</code> en tu SQL Editor de Supabase y desactiva el RLS.</span>
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
                    <div key={p.id} className="project-card" onClick={() => handleSelectProject(p)} style={{ position: 'relative', overflow: 'hidden' }}>
                      
                      {/* Portada de fondo si existe */}
                      {p.cover_art && (
                        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '100px', backgroundImage: `url(${p.cover_art})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.35, borderLeft: '1px solid var(--border-color)' }} />
                      )}

                      <div className="project-card-header" style={{ zIndex: 2, position: 'relative', width: p.cover_art ? 'calc(100% - 100px)' : '100%' }}>
                        <div>
                          <h3 className="project-card-title">{p.name}</h3>
                          <div className="project-card-meta">
                            <span>{p.tempo_bpm} BPM</span>
                            <span>Tono: {p.key_signature}</span>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => handleDeleteProject(p.id, e)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                          className="hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="project-card-footer" style={{ zIndex: 2, position: 'relative' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Modificado: {new Date(p.updated_at).toLocaleDateString()}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: 'bold' }}>
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
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Configura tus llaves para habilitar el guardado automático y la inteligencia artificial.</p>
              </div>

              <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="gemini-key-dashboard">Google Gemini API Key (AI Studio)</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input id="gemini-key-dashboard" type="password" placeholder="AIzaSy..." value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} className="chat-input" />
                    <button type="button" onClick={testGeminiConnection} className="btn-flat" disabled={isTestingGemini} style={{ padding: '0.5rem 0.8rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {isTestingGemini ? 'Probando...' : 'Probar Clave'}
                    </button>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    Requerido para conversar con tu productor. Consigue una en <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)' }}>Google AI Studio</a>.
                  </span>
                  {geminiTestResult && (
                    <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', padding: '0.5rem', backgroundColor: geminiTestResult.includes('✅') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: geminiTestResult.includes('✅') ? '1px solid var(--accent-green)' : '1px solid var(--accent-red)', color: geminiTestResult.includes('✅') ? '#a7f3d0' : '#fca5a5', borderRadius: 'var(--radius-sm)' }}>
                      {geminiTestResult}
                    </div>
                  )}
                </div>

                <div style={{ borderBottom: '1px dashed var(--border-color)' }} />

                <div className="form-group">
                  <label className="form-label" htmlFor="supabase-url-dashboard">Supabase Project URL</label>
                  <input id="supabase-url-dashboard" type="text" placeholder="https://xyz.supabase.co" value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} className="chat-input" />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="supabase-key-dashboard">Supabase Anon Key</label>
                  <input id="supabase-key-dashboard" type="password" placeholder="eyJhbGciOi..." value={supabaseKey} onChange={(e) => setSupabaseKey(e.target.value)} className="chat-input" />
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

              <div className="daw-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h3 style={{ color: 'var(--accent-amber)' }}>🎙️ Conversar con el Productor</h3>
                <p style={{ fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                  SinfonIA utiliza **Gemini 3.5 Flash** para procesar tus mensajes conversacionales y realizar cambios en tu canción automáticamente en base a tus sentimientos.
                </p>
              </div>

              <div className="daw-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h3 style={{ color: 'var(--accent-blue)' }}>🧠 Razonamiento Pro (Gemini 3.1 Pro)</h3>
                <p style={{ fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                  Al presionar el botón de la varita mágica **"Análisis de Producción"** en el editor, el motor llamará a **Gemini 3.1 Pro** para que examine a fondo tu estructura, tono y métrica, y te devuelva consejos avanzados y teoría musical aplicada a tu guitarra.
                </p>
              </div>

              <div className="daw-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h3 style={{ color: 'var(--accent-green)' }}>🎨 Portadas con Imagen 3</h3>
                <p style={{ fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                  Puedes usar el botón **"Generar Portada"** en el mixer de la derecha para evocar un sentimiento visual. El motor llamará a **Imagen 3** para crear una carátula personalizada base64 para tu disco.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    )
  }

  // --- RENDERIZADO VISTA 2: ESPACIO DE EDICIÓN ---
  return (
    <div className="app-container editor-layout">
      
      {/* 1. CHAT DE IA */}
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
              return <div key={msg.id} className="message-system-log">{msg.message}</div>
            }
            return (
              <div key={msg.id} className={`message-bubble ${msg.sender === 'user' ? 'message-user' : 'message-assistant'}`}>
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
            type="text" placeholder="Pídele cambios a SinfonIA..." 
            value={chatInput} onChange={(e) => setChatInput(e.target.value)} 
            className="chat-input" disabled={isLoadingAi}
          />
          <button type="submit" className="btn-primary" disabled={isLoadingAi || !chatInput.trim()}>
            <Send size={14} />
          </button>
        </form>
      </aside>

      {/* 2. ÁREA CENTRAL: SECUENCIADOR MULTIPISTA */}
      <main className="studio-workspace">
        
        <header className="daw-panel workspace-header">
          <div>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Edición de Composición</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{project.name}</h2>
          </div>

          <div className="project-meta-controls">
            {/* Botón de Razonamiento Pro con Gemini 3.1 Pro */}
            <button className="btn-primary" onClick={handleRunAnalysis} style={{ background: '#d97706', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Sparkles size={14} /> Análisis de Producción
            </button>

            <div className="play-controls">
              <button onClick={handlePlayToggle} className={`btn-icon ${isPlaying ? 'active' : ''}`} title="Play/Pause">
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button onClick={handleStop} className="btn-icon" title="Detener">
                <Square size={16} />
              </button>
            </div>

            <div className="control-pill">
              <span>BPM:</span>
              <input 
                type="number" value={project.tempo_bpm} onChange={(e) => updateBpm(e.target.value)}
                style={{ width: '40px', background: 'transparent', border: 'none', color: 'white', fontWeight: 'bold', outline: 'none' }}
              />
            </div>

            <div className="control-pill badge-interactive">
              <span>Tono:</span>
              <select 
                value={project.key_signature} onChange={(e) => updateKeySignature(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', outline: 'none' }}
              >
                {['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'Dm', 'Gm', 'Cm', 'Fm'].map(k => (
                  <option key={k} value={k} style={{ background: 'var(--bg-secondary)', color: 'white' }}>{k}</option>
                ))}
              </select>
            </div>

            <div className="control-pill">
              <span>Capo:</span>
              <input 
                type="number" min="0" max="12" value={project.capo_position} onChange={(e) => updateCapoPosition(e.target.value)}
                style={{ width: '30px', background: 'transparent', border: 'none', color: 'white', fontWeight: 'bold', outline: 'none' }}
              />
            </div>
          </div>
        </header>

        {/* Sección de navegación de partes */}
        <section className="daw-panel" style={{ padding: '0.85rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Secciones:</span>
            <button className="btn-flat" onClick={addNewSection} style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}>
              + Añadir Sección
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {sections.map((sec) => (
              <button 
                key={sec.id} 
                className={`btn-flat ${activeSectionId === sec.id ? 'active' : ''}`}
                onClick={() => { setActiveSectionId(sec.id); handleStop(); }}
                style={{ 
                  backgroundColor: activeSectionId === sec.id ? 'var(--accent-blue)' : 'var(--bg-element)',
                  borderColor: activeSectionId === sec.id ? 'var(--accent-blue)' : 'var(--border-color)',
                  color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}
              >
                {sec.name}
                {sections.length > 1 && (
                  <span onClick={(e) => deleteSection(sec.id, e)} style={{ opacity: 0.5, cursor: 'pointer' }} className="hover:text-red-500">×</span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* LÍNEA DE TIEMPO MULTIPISTA (VISTA DAW COMPLETA) */}
        {activeSection && (
          <section className="daw-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Línea de Tiempo Multipista ({activeSection.name})</h3>
              <button onClick={removeLastChordFromActive} className="btn-flat" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}>
                Eliminar último acorde
              </button>
            </div>

            {/* Grid Multipista */}
            <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}>
              
              {/* Cabecera del Grid (Muestra los acordes y el playhead) */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel)' }}>
                <div style={{ width: '100px', padding: '0.5rem', borderRight: '1px solid var(--border-color)', fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                  COMPÁS / BEAT
                </div>
                <div style={{ flex: 1, display: 'flex', overflowX: 'auto' }}>
                  {/* Generar las celdas de pulso en horizontal */}
                  {Array.from({ length: totalBeats }).map((_, beatIdx) => {
                    // Encontrar qué acorde suena en este beat
                    let sum = 0
                    let chordName = ''
                    for (const c of activeSection.chords) {
                      if (beatIdx >= sum && beatIdx < sum + c.beats) {
                        chordName = c.chord
                        break
                      }
                      sum += c.beats
                    }
                    const isPlayhead = isPlaying && currentBeat === beatIdx

                    return (
                      <div 
                        key={beatIdx} 
                        style={{
                          flex: 1,
                          minWidth: '45px',
                          textAlign: 'center',
                          padding: '0.5rem 0',
                          borderRight: '1px solid rgba(255,255,255,0.03)',
                          backgroundColor: isPlayhead ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                          borderBottom: isPlayhead ? '2px solid var(--accent-green)' : 'none',
                          fontSize: '0.75rem',
                          fontFamily: 'var(--font-mono)'
                        }}
                      >
                        <span style={{ fontWeight: 'bold', color: 'white', display: 'block' }}>{chordName}</span>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{beatIdx + 1}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Renglon 1: GUITARRA (Prioridad acústica) */}
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ width: '100px', padding: '0.5rem', borderRight: '1px solid var(--border-color)', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                  🎸 Guitarra
                </div>
                <div style={{ flex: 1, display: 'flex' }}>
                  {Array.from({ length: totalBeats }).map((_, beatIdx) => {
                    const isPlayhead = isPlaying && currentBeat === beatIdx
                    const isPlayingInst = instruments.guitar.active && (instruments.guitar.type === 'strum' ? beatIdx % 4 === 0 : true)
                    
                    return (
                      <div 
                        key={beatIdx}
                        style={{
                          flex: 1,
                          minWidth: '45px',
                          backgroundColor: isPlayingInst 
                            ? (isPlayhead ? 'rgba(37, 99, 235, 0.4)' : 'rgba(37, 99, 235, 0.15)')
                            : 'transparent',
                          borderLeft: isPlayhead ? '1px solid var(--accent-green)' : 'none',
                          borderRight: isPlayhead ? '1px solid var(--accent-green)' : '1px solid rgba(255,255,255,0.03)',
                          height: '24px'
                        }}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Renglon 2: PIANO */}
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ width: '100px', padding: '0.5rem', borderRight: '1px solid var(--border-color)', fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>
                  🎹 Piano
                </div>
                <div style={{ flex: 1, display: 'flex' }}>
                  {Array.from({ length: totalBeats }).map((_, beatIdx) => {
                    const isPlayhead = isPlaying && currentBeat === beatIdx
                    const isPlayingInst = instruments.piano.active
                    
                    return (
                      <div 
                        key={beatIdx}
                        style={{
                          flex: 1,
                          minWidth: '45px',
                          backgroundColor: isPlayingInst 
                            ? (isPlayhead ? 'rgba(168, 85, 247, 0.4)' : 'rgba(168, 85, 247, 0.15)')
                            : 'transparent',
                          borderLeft: isPlayhead ? '1px solid var(--accent-green)' : 'none',
                          borderRight: isPlayhead ? '1px solid var(--accent-green)' : '1px solid rgba(255,255,255,0.03)',
                          height: '24px'
                        }}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Renglon 3: BAJO */}
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ width: '100px', padding: '0.5rem', borderRight: '1px solid var(--border-color)', fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>
                  🔊 Bajo
                </div>
                <div style={{ flex: 1, display: 'flex' }}>
                  {Array.from({ length: totalBeats }).map((_, beatIdx) => {
                    const isPlayhead = isPlaying && currentBeat === beatIdx
                    const isPlayingInst = instruments.bass.active && (instruments.bass.type === 'roots' ? beatIdx % 2 === 0 : true)
                    
                    return (
                      <div 
                        key={beatIdx}
                        style={{
                          flex: 1,
                          minWidth: '45px',
                          backgroundColor: isPlayingInst 
                            ? (isPlayhead ? 'rgba(217, 119, 6, 0.4)' : 'rgba(217, 119, 6, 0.12)')
                            : 'transparent',
                          borderLeft: isPlayhead ? '1px solid var(--accent-green)' : 'none',
                          borderRight: isPlayhead ? '1px solid var(--accent-green)' : '1px solid rgba(255,255,255,0.03)',
                          height: '24px'
                        }}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Renglon 4: BATERÍA */}
              <div style={{ display: 'flex' }}>
                <div style={{ width: '100px', padding: '0.5rem', borderRight: '1px solid var(--border-color)', fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>
                  🥁 Batería
                </div>
                <div style={{ flex: 1, display: 'flex' }}>
                  {Array.from({ length: totalBeats }).map((_, beatIdx) => {
                    const isPlayhead = isPlaying && currentBeat === beatIdx
                    const isPlayingInst = instruments.drums.active
                    
                    return (
                      <div 
                        key={beatIdx}
                        style={{
                          flex: 1,
                          minWidth: '45px',
                          backgroundColor: isPlayingInst 
                            ? (isPlayhead ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.15)')
                            : 'transparent',
                          borderLeft: isPlayhead ? '1px solid var(--accent-green)' : 'none',
                          borderRight: isPlayhead ? '1px solid var(--accent-green)' : '1px solid rgba(255,255,255,0.03)',
                          height: '24px'
                        }}
                      />
                    )
                  })}
                </div>
              </div>

            </div>

            {/* Constructor Rápido de Acordes */}
            <div style={{ marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Añadir acorde rápido a la sección:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {['C', 'G', 'D', 'A', 'E', 'F', 'Am', 'Em', 'Dm', 'Bm', 'F#m', 'Cmaj7', 'Am7', 'G7', 'D7', 'E7'].map((ch) => (
                  <button 
                    key={ch} onClick={() => addChordToActiveSection(ch)}
                    className="chord-badge badge-interactive" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                  >
                    + {ch}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Fretboard */}
        <Fretboard 
          keySignature={project.key_signature}
          activeChord={isPlaying ? currentChordName : (activeSection?.chords[0]?.chord || '')}
          capoPosition={project.capo_position}
          onPlayNote={playFretNote}
        />
      </main>

      {/* 3. PANEL DERECHO: MIXER & ALBUM ART */}
      <aside className="right-sidebar">
        <h2 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
          <Sliders size={16} /> Acompañamiento
        </h2>

        {/* Guitarra (Ajustes de Prioridad) */}
        <div className="instrument-strip" style={{ borderLeft: '2px solid var(--accent-blue)' }}>
          <div className="instrument-header">
            <span className="instrument-title" style={{ color: 'var(--accent-blue)' }}>🎸 Guitarra (Acústica)</span>
            <label className="toggle-switch">
              <input type="checkbox" checked={instruments.guitar.active} onChange={() => toggleInstrument('guitar')} />
              <span className="slider-round"></span>
            </label>
          </div>
          <div className="slider-control">
            <input 
              type="range" min="-40" max="0" value={instruments.guitar.volume}
              onChange={(e) => handleVolumeChange('guitar', e.target.value)}
              className="custom-range" disabled={!instruments.guitar.active}
            />
          </div>
          <div className="slider-control">
            <div style={{ display: 'flex', gap: '0.2rem', marginTop: '0.2rem' }}>
              <button 
                onClick={() => handlePatternChange('guitar', 'strum')} 
                style={{ flex: 1, fontSize: '0.65rem', padding: '0.2rem', borderRadius: '2px', border: '1px solid var(--border-color)', background: instruments.guitar.type === 'strum' ? 'var(--accent-blue)' : 'transparent', color: 'white', cursor: 'pointer' }}
                disabled={!instruments.guitar.active}
              >Rasgueo</button>
              <button 
                onClick={() => handlePatternChange('guitar', 'arpeggio')} 
                style={{ flex: 1, fontSize: '0.65rem', padding: '0.2rem', borderRadius: '2px', border: '1px solid var(--border-color)', background: instruments.guitar.type === 'arpeggio' ? 'var(--accent-blue)' : 'transparent', color: 'white', cursor: 'pointer' }}
                disabled={!instruments.guitar.active}
              >Arpegio</button>
            </div>
          </div>
        </div>

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
            <span className="instrument-title">🥁 Percisión</span>
            <label className="toggle-switch">
              <input type="checkbox" checked={instruments.drums.active} onChange={() => toggleInstrument('drums')} />
              <span className="slider-round"></span>
            </label>
          </div>
          <div className="slider-control">
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

        <div style={{ flex: 1 }} />

        {/* --- SECCIÓN ART DE PORTADA CON IMAGEN 3 --- */}
        <div className="instrument-strip" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem', alignItems: 'center', textAlign: 'center' }}>
          <span className="instrument-title" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <ImageIcon size={14} /> Arte de Portada
          </span>
          
          {project && project.cover_art ? (
            <img 
              src={project.cover_art} 
              alt="Portada del Álbum" 
              style={{ width: '100%', aspectRatio: '1:1', objectFit: 'cover', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }} 
            />
          ) : (
            <div style={{ width: '100%', aspectRatio: '1:1', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', gap: '0.25rem' }}>
              <ImageIcon size={24} style={{ opacity: 0.3 }} />
              <span>Sin Portada</span>
            </div>
          )}

          <button 
            onClick={handleGenerateCover} 
            className="btn-flat" 
            disabled={isGeneratingArt}
            style={{ width: '100%', padding: '0.4rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
          >
            <Sparkles size={12} />
            {isGeneratingArt ? 'Generando...' : 'Generar Portada'}
          </button>
        </div>
      </aside>

      {/* --- MODAL PARA EL ANÁLISIS DE GEMINI 3.1 PRO --- */}
      {isAnalysisModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAnalysisModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', maxHeight: '80%', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.15rem', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Sparkles size={16} /> Análisis de Producción Pro (Gemini 3.1 Pro)
              </h2>
              <button onClick={() => setIsAnalysisModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.25rem' }}>×</button>
            </div>
            
            <div style={{ padding: '0.5rem 0', fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
              {analysisResult}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
              <button onClick={() => setIsAnalysisModalOpen(false)} className="btn-primary">Entendido</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
