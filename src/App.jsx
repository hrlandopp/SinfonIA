import React, { useState, useEffect, useRef } from 'react'
import { 
  Play, Pause, Square, Send, Settings, Plus, Trash2, 
  Music, Volume2, VolumeX, Sparkles, Sliders, Info
} from 'lucide-react'

import { supabase, isSupabaseConfigured, saveSupabaseCredentials } from './utils/supabaseClient'
import { sendMessageToProducerAI, isGeminiConfigured, saveGeminiKey } from './utils/geminiClient'
import { audioEngine } from './utils/AudioEngine'
import Fretboard from './components/Fretboard'

const DEFAULT_PROJECT = {
  id: 'local-project',
  name: 'Mi Primera Composición',
  tempo_bpm: 110,
  key_signature: 'Am',
  capo_position: 0,
  mood: 'Melancólico'
}

const DEFAULT_SECTIONS = [
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
  const [project, setProject] = useState(DEFAULT_PROJECT)
  const [sections, setSections] = useState(DEFAULT_SECTIONS)
  const [activeSectionId, setActiveSectionId] = useState('sec-intro')
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentBeat, setCurrentBeat] = useState(0)
  const [currentChordIndex, setCurrentChordIndex] = useState(0)
  const [currentChordName, setCurrentChordName] = useState('')
  
  const [chatHistory, setChatHistory] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      message: '¡Hola! Soy SinfonIA, tu productor musical inteligente. Toco la guitarra y entiendo de teoría musical. Cuéntame, ¿qué tipo de canción quieres crear hoy o qué sentimiento tienes en mente?'
    }
  ])
  const [chatInput, setChatInput] = useState('')
  const [isLoadingAi, setIsLoadingAi] = useState(false)
  
  const [instruments, setInstruments] = useState({
    piano: { active: true, volume: -8, type: 'arpeggio' },
    guitar: { active: false, volume: -12, type: 'strum' },
    bass: { active: true, volume: -10, type: 'roots' },
    drums: { active: true, volume: -12, type: 'basic' }
  })

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('supabase_url') || '')
  const [supabaseKey, setSupabaseKey] = useState(localStorage.getItem('supabase_anon_key') || '')
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('gemini_api_key') || '')
  const [dbStatus, setDbStatus] = useState('Modo Local')
  
  const chatEndRef = useRef(null)

  useEffect(() => {
    if (isSupabaseConfigured()) {
      setDbStatus('Conectado a Supabase ⚡')
      loadProjectFromSupabase()
    } else {
      setDbStatus('Modo Local')
      const localProj = localStorage.getItem('local_project')
      const localSecs = localStorage.getItem('local_sections')
      const localChat = localStorage.getItem('local_chat')
      if (localProj) setProject(JSON.parse(localProj))
      if (localSecs) setSections(JSON.parse(localSecs))
      if (localChat) setChatHistory(JSON.parse(localChat))
    }
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

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

  useEffect(() => {
    audioEngine.onBeatCallback = (beat, chordIdx, chordName) => {
      setCurrentBeat(beat)
      setCurrentChordIndex(chordIdx)
      setCurrentChordName(chordName || '')
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      localStorage.setItem('local_project', JSON.stringify(project))
      localStorage.setItem('local_sections', JSON.stringify(sections))
      localStorage.setItem('local_chat', JSON.stringify(chatHistory))
    }
  }, [project, sections, chatHistory])

  const loadProjectFromSupabase = async () => {
    try {
      if (!supabase) return
      const { data: projs, error: pErr } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)

      if (pErr) throw pErr

      if (projs && projs.length > 0) {
        const activeProj = projs[0]
        setProject(activeProj)
        audioEngine.setBpm(activeProj.tempo_bpm)

        const { data: secs, error: sErr } = await supabase
          .from('sections')
          .select('*')
          .eq('project_id', activeProj.id)
          .order('order_index', { ascending: true })

        if (sErr) throw sErr
        if (secs && secs.length > 0) {
          setSections(secs)
          setActiveSectionId(secs[0].id)
        }

        const { data: chat, error: cErr } = await supabase
          .from('chat_history')
          .select('*')
          .eq('project_id', activeProj.id)
          .order('created_at', { ascending: true })

        if (cErr) throw cErr
        if (chat && chat.length > 0) {
          setChatHistory(chat)
        }
      } else {
        await createNewProjectInSupabase('Mi Primera Canción con IA')
      }
    } catch (e) {
      console.error(e)
      setDbStatus('Error en Supabase')
    }
  }

  const createNewProjectInSupabase = async (name) => {
    if (!supabase) return
    const { data: newProj, error: pErr } = await supabase
      .from('projects')
      .insert([{ 
        name, 
        tempo_bpm: 120, 
        key_signature: 'C',
        capo_position: 0,
        mood: 'Neutral'
      }])
      .select()

    if (pErr) return

    const proj = newProj[0]
    setProject(proj)

    const initialSections = DEFAULT_SECTIONS.map((sec, idx) => ({
      project_id: proj.id,
      name: sec.name,
      order_index: idx,
      chords: sec.chords,
      accompaniment: sec.accompaniment
    }))

    const { data: newSecs, error: sErr } = await supabase
      .from('sections')
      .insert(initialSections)
      .select()

    if (sErr) return
    setSections(newSecs)
    setActiveSectionId(newSecs[0].id)
  }

  const saveProjectStateToSupabase = async (updatedProj, updatedSecs) => {
    if (!supabase || updatedProj.id === 'local-project') return
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
    saveProjectStateToSupabase(updated, sections)
  }

  const updateKeySignature = (newKey) => {
    const updated = { ...project, key_signature: newKey }
    setProject(updated)
    saveProjectStateToSupabase(updated, sections)
  }

  const updateCapoPosition = (newCapo) => {
    const val = Math.min(12, Math.max(0, parseInt(newCapo) || 0))
    const updated = { ...project, capo_position: val }
    setProject(updated)
    saveProjectStateToSupabase(updated, sections)
  }

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
    
    if (supabase && project.id !== 'local-project') {
      await supabase.from('chat_history').insert([{
        project_id: project.id,
        sender: 'user',
        message: userMsg
      }])
    }

    if (!isGeminiConfigured() && !geminiKey) {
      setChatHistory(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'assistant',
        message: '⚠️ Necesito tu Gemini API Key para responder. Configúrala en Ajustes (icono ⚙️ arriba a la derecha).'
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
          systemActions.push(`Tempo a ${changes.tempo_bpm} BPM`)
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
          systemActions.push(`Acordes actualizados`)
          changed = true
        }

        if (changed) {
          setProject(tempProject)
          setSections(tempSections)
          saveProjectStateToSupabase(tempProject, tempSections)
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

      if (supabase && project.id !== 'local-project') {
        await supabase.from('chat_history').insert([{
          project_id: project.id,
          sender: 'assistant',
          message: aiResponse.message
        }])
      }

    } catch (error) {
      console.error(error)
      setChatHistory(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'assistant',
        message: `⚠️ Error de conexión: ${error.message}`
      }])
    } finally {
      setIsLoadingAi(false)
    }
  }

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
    saveProjectStateToSupabase(project, updatedSecs)
  }

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
    saveProjectStateToSupabase(project, updated)
  }

  const deleteSection = (id, e) => {
    e.stopPropagation()
    if (sections.length <= 1) return
    const updated = sections.filter(s => s.id !== id).map((s, idx) => ({ ...s, order_index: idx }))
    setSections(updated)
    if (activeSectionId === id) {
      setActiveSectionId(updated[0].id)
    }
    saveProjectStateToSupabase(project, updated)
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
    saveProjectStateToSupabase(project, updated)
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
    saveProjectStateToSupabase(project, updated)
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
    setIsSettingsOpen(false)
  }

  return (
    <div className="app-container">
      
      {/* 1. CHAT DE IA */}
      <aside className="chat-sidebar">
        <header className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🎸</span>
            <div>
              <h1 className="logo-gradient">SinfonIA</h1>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Productor de Bolsillo v0.1</p>
            </div>
          </div>
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
            <div className="message-bubble message-assistant" style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              <span className="logo-gradient" style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Pensando</span>
              <div style={{ display: 'flex', gap: '0.15rem' }}>
                <span>.</span><span>.</span><span>.</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSendChatMessage} className="chat-input-area">
          <input 
            type="text" 
            placeholder="Pídele acordes a la IA..." 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="chat-input"
            disabled={isLoadingAi}
          />
          <button type="submit" className="btn-primary" disabled={isLoadingAi || !chatInput.trim()}>
            <Send size={16} />
          </button>
        </form>
      </aside>

      {/* 2. ÁREA CENTRAL */}
      <main className="studio-workspace">
        
        <header className="glass-panel workspace-header">
          <div>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--accent-cyan)' }}>Estudio</span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{project.name}</h1>
          </div>

          <div className="project-meta-controls">
            <div className="play-controls">
              <button 
                onClick={handlePlayToggle} 
                className={`btn-icon ${isPlaying ? 'active' : ''}`}
                title="Reproducir / Pausar"
                id="btn-play-toggle"
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <button onClick={handleStop} className="btn-icon" title="Detener" id="btn-stop">
                <Square size={18} />
              </button>
            </div>

            <div className="control-pill">
              <span>BPM:</span>
              <input 
                type="number" 
                value={project.tempo_bpm} 
                onChange={(e) => updateBpm(e.target.value)}
                style={{ width: '45px', background: 'transparent', border: 'none', color: 'white', fontWeight: 'bold', outline: 'none' }}
              />
            </div>

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

            <button className="btn-icon" onClick={() => setIsSettingsOpen(true)} title="Ajustes de API / Nube">
              <Settings size={18} />
            </button>
          </div>
        </header>

        {/* Secuenciador */}
        <section className="glass-panel sequencer-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem' }}>Estructura de la Canción</h2>
            </div>
            <button className="btn-primary" onClick={addNewSection} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
              <Plus size={14} /> Añadir Sección
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
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                      <Trash2 size={12} />
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
          <section className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem' }}>Detalle de Sección: {activeSection.name}</h2>
              </div>
              <button onClick={removeLastChordFromActive} className="btn-primary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem', background: '#3f3f46' }}>
                Remover Acorde
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', padding: '0.5rem 0' }}>
              {activeSection.chords.map((c, cIdx) => {
                const isCurrent = isPlaying && currentChordIndex === cIdx
                return (
                  <div 
                    key={cIdx} 
                    style={{
                      flex: '1',
                      minWidth: '100px',
                      padding: '1.25rem 0.75rem',
                      textAlign: 'center',
                      borderRadius: 'var(--radius-md)',
                      background: isCurrent ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-secondary)',
                      border: isCurrent ? '2px solid var(--accent-indigo)' : '1px solid var(--border-color)',
                      transition: 'all 0.15s ease',
                      position: 'relative'
                    }}
                  >
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: isCurrent ? 'white' : 'var(--text-primary)', display: 'block' }}>
                      {c.chord}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{c.beats} pulsos</span>
                    
                    {isCurrent && (
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '0.5rem' }}>
                        {[0, 1, 2, 3].map((b) => (
                          <span 
                            key={b} 
                            style={{ 
                              width: '6px', 
                              height: '6px', 
                              borderRadius: '50%', 
                              background: currentBeat === b ? 'var(--accent-cyan)' : 'var(--text-muted)'
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>Añadir acorde rápido:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {['C', 'G', 'D', 'A', 'E', 'F', 'Am', 'Em', 'Dm', 'Bm', 'F#m', 'Cmaj7', 'Am7', 'G7', 'D7', 'E7'].map((ch) => (
                  <button 
                    key={ch} 
                    onClick={() => addChordToActiveSection(ch)}
                    className="chord-badge badge-interactive"
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}
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
      </main>

      {/* 3. PANEL DERECHO: MIXER */}
      <aside className="right-sidebar">
        <h2 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sliders size={18} /> Mixer & Acompañamiento
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
            <input 
              type="range" min="-40" max="0" value={instruments.piano.volume}
              onChange={(e) => handleVolumeChange('piano', e.target.value)}
              className="custom-range" disabled={!instruments.piano.active}
            />
          </div>
          <div className="slider-control">
            <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
              <button 
                onClick={() => handlePatternChange('piano', 'arpeggio')} 
                style={{ flex: 1, fontSize: '0.7rem', padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: instruments.piano.type === 'arpeggio' ? 'var(--accent-indigo)' : 'transparent', color: 'white' }}
                disabled={!instruments.piano.active}
              >Arpegio</button>
              <button 
                onClick={() => handlePatternChange('piano', 'chord')} 
                style={{ flex: 1, fontSize: '0.7rem', padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: instruments.piano.type === 'chord' ? 'var(--accent-indigo)' : 'transparent', color: 'white' }}
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
            <input 
              type="range" min="-40" max="0" value={instruments.bass.volume}
              onChange={(e) => handleVolumeChange('bass', e.target.value)}
              className="custom-range" disabled={!instruments.bass.active}
            />
          </div>
          <div className="slider-control">
            <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
              <button 
                onClick={() => handlePatternChange('bass', 'roots')} 
                style={{ flex: 1, fontSize: '0.7rem', padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: instruments.bass.type === 'roots' ? 'var(--accent-indigo)' : 'transparent', color: 'white' }}
                disabled={!instruments.bass.active}
              >Tónicas</button>
              <button 
                onClick={() => handlePatternChange('bass', 'walking')} 
                style={{ flex: 1, fontSize: '0.7rem', padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: instruments.bass.type === 'walking' ? 'var(--accent-indigo)' : 'transparent', color: 'white' }}
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
            <input 
              type="range" min="-40" max="0" value={instruments.drums.volume}
              onChange={(e) => handleVolumeChange('drums', e.target.value)}
              className="custom-range" disabled={!instruments.drums.active}
            />
          </div>
          <div className="slider-control">
            <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
              <button 
                onClick={() => handlePatternChange('drums', 'basic')} 
                style={{ flex: 1, fontSize: '0.7rem', padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: instruments.drums.type === 'basic' ? 'var(--accent-indigo)' : 'transparent', color: 'white' }}
                disabled={!instruments.drums.active}
              >Base</button>
              <button 
                onClick={() => handlePatternChange('drums', 'metronome')} 
                style={{ flex: 1, fontSize: '0.7rem', padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: instruments.drums.type === 'metronome' ? 'var(--accent-indigo)' : 'transparent', color: 'white' }}
                disabled={!instruments.drums.active}
              >Click</button>
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
          <span>BD: {dbStatus}</span>
        </div>
      </aside>

      {/* MODAL CONFIGURACIÓN */}
      {isSettingsOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Ajustes</h2>
              <button onClick={() => setIsSettingsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
            </div>
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="gemini-key-input">Gemini API Key</label>
                <input id="gemini-key-input" type="password" value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} className="chat-input" style={{ width: '100%' }} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="supabase-url-input">Supabase Project URL</label>
                <input id="supabase-url-input" type="text" value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} className="chat-input" style={{ width: '100%' }} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="supabase-key-input">Supabase Anon Key</label>
                <input id="supabase-key-input" type="password" value={supabaseKey} onChange={(e) => setSupabaseKey(e.target.value)} className="chat-input" style={{ width: '100%' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setIsSettingsOpen(false)} className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'white', boxShadow: 'none' }}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar y Recargar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
