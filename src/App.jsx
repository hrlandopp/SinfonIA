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
import { audioEngine } from './utils/AudioEngine'
import Fretboard from './components/Fretboard'

const INITIAL_PROJECTS = [
  { id: 'local-proj-1', name: 'Balada de Otoño',    tempo_bpm: 85,  key_signature: 'Em', capo_position: 2, mood: 'Melancólico', cover_art: '', updated_at: new Date().toISOString() },
  { id: 'local-proj-2', name: 'Ritmo del Desierto', tempo_bpm: 120, key_signature: 'Am', capo_position: 0, mood: 'Enérgico',    cover_art: '', updated_at: new Date().toISOString() },
]

const DEFAULT_SECTIONS = [
  { id: 'sec-intro', name: 'Intro', order_index: 0, chords: [{ chord: 'Am', beats: 4 }, { chord: 'F', beats: 4 }, { chord: 'C', beats: 4 }, { chord: 'G', beats: 4 }], accompaniment: { piano: 'arpeggio', bass: 'roots', drums: 'basic' } },
  { id: 'sec-verso', name: 'Verso', order_index: 1, chords: [{ chord: 'Am', beats: 4 }, { chord: 'Dm', beats: 4 }, { chord: 'G',  beats: 4 }, { chord: 'C', beats: 4 }], accompaniment: { piano: 'arpeggio', bass: 'roots', drums: 'basic' } },
]

export default function App() {
  const [currentView,    setCurrentView]    = useState('dashboard')
  const [activeTab,      setActiveTab]      = useState('projects')
  const [projectsList,   setProjectsList]   = useState([])
  const [project,        setProject]        = useState(null)
  const [sections,       setSections]       = useState([])
  const [activeSectionId,setActiveSectionId]= useState('')
  const [isPlaying,      setIsPlaying]      = useState(false)
  const [currentBeat,    setCurrentBeat]    = useState(0)
  const [totalBeats,     setTotalBeats]     = useState(16)
  const [currentChordIdx,setCurrentChordIdx]= useState(0)
  const [currentChord,   setCurrentChord]   = useState('')
  const [chatHistory,    setChatHistory]    = useState([])
  const [chatInput,      setChatInput]      = useState('')
  const [isLoadingAi,    setIsLoadingAi]    = useState(false)
  const [analysisResult, setAnalysisResult] = useState('')
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false)
  const [isGeneratingArt,setIsGeneratingArt]= useState(false)
  const [instruments,    setInstruments]    = useState({
    guitar: { active: true, volume: -6,  type: 'strum' },
    piano:  { active: true, volume: -12, type: 'arpeggio' },
    bass:   { active: true, volume: -10, type: 'roots' },
    drums:  { active: true, volume: -12, type: 'basic' },
  })
  const [supabaseUrl,    setSupabaseUrl]    = useState(localStorage.getItem('supabase_url') || '')
  const [supabaseKey,    setSupabaseKey]    = useState(localStorage.getItem('supabase_anon_key') || '')
  const [geminiKey,      setGeminiKey]      = useState(localStorage.getItem('gemini_api_key') || '')
  const [dbStatus,       setDbStatus]       = useState('Modo Local')
  const [geminiTestResult, setGeminiTestResult] = useState('')
  const [isTestingGemini,  setIsTestingGemini]  = useState(false)
  const [useLocalMode,   setUseLocalMode]   = useState(() => localStorage.getItem('use_local_mode') === 'true')
  const chatEndRef = useRef(null)

  const isCloudActive = isSupabaseConfigured() && !useLocalMode

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

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatHistory])

  useEffect(() => {
    const sec = sections.find(s => s.id === activeSectionId)
    if (!sec) return
    audioEngine.setChords(sec.chords || [])
    setTotalBeats(sec.chords.reduce((a, c) => a + (c.beats || 4), 0))
    if (sec.accompaniment) Object.keys(sec.accompaniment).forEach(k => audioEngine.setPatternType(k, sec.accompaniment[k]))
  }, [sections, activeSectionId])

  useEffect(() => {
    audioEngine.onBeatCallback = (beat, chordIdx, chordName, beats) => {
      setCurrentBeat(beat); setCurrentChordIdx(chordIdx); setCurrentChord(chordName || ''); setTotalBeats(beats || 16)
    }
  }, [])

  // ── Storage ──────────────────────────────────────────────────────
  const saveLocal = (list) => { setProjectsList(list); localStorage.setItem('local_projects_list', JSON.stringify(list)) }

  const saveState = (proj, secs) => {
    if (isCloudActive && proj.id !== 'local-project') { saveToSupabase(proj, secs) }
    else {
      saveLocal(projectsList.map(p => p.id === proj.id ? { ...proj, updated_at: new Date().toISOString() } : p))
      localStorage.setItem(`local_secs_${proj.id}`, JSON.stringify(secs))
      localStorage.setItem(`local_chat_${proj.id}`, JSON.stringify(chatHistory))
    }
  }

  // ── Supabase ─────────────────────────────────────────────────────
  const loadFromSupabase = async () => {
    try { const { data, error } = await supabase.from('projects').select('*').order('updated_at', { ascending: false }); if (error) throw error; setProjectsList(data || []) }
    catch (e) { console.error(e); setDbStatus('Error en Supabase') }
  }

  const saveToSupabase = async (proj, secs) => {
    if (!supabase) return
    try {
      await supabase.from('projects').update({ name: proj.name, tempo_bpm: proj.tempo_bpm, key_signature: proj.key_signature, capo_position: proj.capo_position, mood: proj.mood, cover_art: proj.cover_art, updated_at: new Date().toISOString() }).eq('id', proj.id)
      for (const s of secs) await supabase.from('sections').update({ name: s.name, chords: s.chords, accompaniment: s.accompaniment, order_index: s.order_index }).eq('id', s.id)
    } catch (e) { console.error(e) }
  }

  // ── Select project ───────────────────────────────────────────────
  const handleSelectProject = async (sel) => {
    setProject(sel); audioEngine.setBpm(sel.tempo_bpm); handleStop()
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
        setChatHistory(chat?.length ? chat : fallbackChat(sel.name))
      } catch (e) {
        console.error(e)
        const ls = localStorage.getItem(`local_secs_${sel.id}`); const lc = localStorage.getItem(`local_chat_${sel.id}`)
        const secs = ls ? (()=>{try{return JSON.parse(ls)}catch{return fallbackSecs()}})() : fallbackSecs()
        setSections(secs); setActiveSectionId(secs[0]?.id || '')
        setChatHistory(lc ? (()=>{try{return JSON.parse(lc)}catch{return fallbackChat(sel.name)}})() : fallbackChat(sel.name))
      }
    } else {
      const ls = localStorage.getItem(`local_secs_${sel.id}`); const lc = localStorage.getItem(`local_chat_${sel.id}`)
      const secs = ls ? (()=>{try{return JSON.parse(ls)}catch{return null}})() : null
      const finalSecs = secs || fallbackSecs()
      setSections(finalSecs); setActiveSectionId(finalSecs[0]?.id || '')
      if (!secs) localStorage.setItem(`local_secs_${sel.id}`, JSON.stringify(finalSecs))
      const chat = lc ? (()=>{try{return JSON.parse(lc)}catch{return null}})() : null
      const finalChat = chat || fallbackChat(sel.name)
      setChatHistory(finalChat)
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
  const handleStop = () => { audioEngine.stop(); setIsPlaying(false); setCurrentBeat(0); setCurrentChordIdx(0); setCurrentChord('') }
  const handlePlayToggle = async () => {
    if (isPlaying) { audioEngine.stop(); setIsPlaying(false) }
    else { try { await audioEngine.startContext(); audioEngine.play(); setIsPlaying(true) } catch (e) { alert('Haz clic en la página primero para activar el audio.') } }
  }
  const playFretNote = async (note) => { 
    try { 
      await audioEngine.startContext()
      // Si hay un acorde activo, toca el acorde completo; si no, toca solo la nota
      if (currentChord) {
        audioEngine.playChord(currentChord, 0.6)
      } else {
        audioEngine.playNote(note, 0.5)
      }
    } catch (e) { console.error(e) } 
  }

  const updateBpm = (v) => { const val = Math.min(240, Math.max(40, parseInt(v)||120)); const u={...project, tempo_bpm: val}; setProject(u); audioEngine.setBpm(val); saveState(u, sections) }
  const updateKey = (k) => { const u={...project, key_signature: k}; setProject(u); saveState(u, sections) }
  const updateCapo = (v) => { const val=Math.min(12,Math.max(0,parseInt(v)||0)); const u={...project, capo_position: val}; setProject(u); saveState(u, sections) }

  // ── Mixer ────────────────────────────────────────────────────────
  const toggleInstrument = (n) => { const a=!instruments[n].active; setInstruments(p=>({...p,[n]:{...p[n],active:a}})); audioEngine.setInstrumentActive(n, a) }
  const handleVolume     = (n, v) => { const vol=parseFloat(v); setInstruments(p=>({...p,[n]:{...p[n],volume:vol}})); audioEngine.setVolume(n, vol) }
  const handlePattern    = (n, t) => {
    setInstruments(p=>({...p,[n]:{...p[n],type:t}})); audioEngine.setPatternType(n, t)
    const upd=sections.map(s=>s.id===activeSectionId?{...s,accompaniment:{...s.accompaniment,[n]:t}}:s); setSections(upd); saveState(project,upd)
  }

  // ── Sections ─────────────────────────────────────────────────────
  const addSection = () => {
    const NAMES=['Verso','Coro','Puente','Outro']; const idx=sections.length
    const sec={id:`sec-${Date.now()}`,name:`${NAMES[idx%4]||'Sección'} ${Math.floor(idx/4)+1}`,order_index:idx,chords:[{chord:'C',beats:4},{chord:'G',beats:4},{chord:'Am',beats:4},{chord:'F',beats:4}],accompaniment:{piano:'arpeggio',bass:'roots',drums:'basic'}}
    const upd=[...sections,sec]; setSections(upd); saveState(project,upd)
  }
  const deleteSection = (id, e) => {
    e.stopPropagation(); if(sections.length<=1)return
    const upd=sections.filter(s=>s.id!==id).map((s,i)=>({...s,order_index:i})); setSections(upd)
    if(activeSectionId===id) setActiveSectionId(upd[0].id); saveState(project,upd)
  }
  const addChord = (ch) => { const upd=sections.map(s=>s.id===activeSectionId?{...s,chords:[...s.chords,{chord:ch,beats:4}]}:s); setSections(upd); saveState(project,upd) }
  const removeLastChord = () => { const upd=sections.map(s=>{if(s.id!==activeSectionId||s.chords.length<=1)return s;const c=[...s.chords];c.pop();return{...s,chords:c}}); setSections(upd); saveState(project,upd) }

  // ── AI ───────────────────────────────────────────────────────────
  const handleSendChat = async (e) => {
    e.preventDefault(); if(!chatInput.trim()||isLoadingAi) return
    if(!isGeminiConfigured()){alert('Configura tu Gemini API Key en Ajustes primero.');return}
    const userMsg={id:`u-${Date.now()}`,sender:'user',message:chatInput.trim()}
    const hist=[...chatHistory,userMsg]; setChatHistory(hist); setChatInput(''); setIsLoadingAi(true)
    try {
      const ps={name:project.name,key_signature:project.key_signature,tempo_bpm:project.tempo_bpm,capo_position:project.capo_position,mood:project.mood,sections:sections.map(s=>({name:s.name,chords:s.chords}))}
      const ai=await sendMessageToProducerAI(userMsg.message,hist,ps)
      const aMsg={id:`a-${Date.now()}`,sender:'assistant',message:ai.message||'Sin respuesta.'}
      let uProj={...project},uSecs=[...sections]; const ch=ai.changes
      if(ch&&Object.keys(ch).length>0){
        if(ch.tempo_bpm){uProj={...uProj,tempo_bpm:ch.tempo_bpm};audioEngine.setBpm(ch.tempo_bpm)}
        if(ch.key_signature)uProj={...uProj,key_signature:ch.key_signature}
        if(typeof ch.capo_position==='number')uProj={...uProj,capo_position:ch.capo_position}
        if(ch.sections?.length){uSecs=ch.sections.map((s,i)=>({id:sections[i]?.id||`sec-ai-${Date.now()}-${i}`,name:s.name,order_index:s.order_index??i,chords:s.chords||[],accompaniment:sections[i]?.accompaniment||{piano:'arpeggio',bass:'roots',drums:'basic'}}))}
        setProject(uProj); setSections(uSecs)
        if(uSecs.length>0&&!uSecs.find(s=>s.id===activeSectionId)) setActiveSectionId(uSecs[0].id)
        const logParts=[ch.tempo_bpm&&`${ch.tempo_bpm} BPM`,ch.key_signature&&`Tono: ${ch.key_signature}`,ch.sections&&`${ch.sections.length} secciones`].filter(Boolean).join(' · ')
        const log={id:`l-${Date.now()}`,sender:'system',message:`Cambios aplicados — ${logParts}`}
        const final=[...hist,aMsg,log]; setChatHistory(final); saveState(uProj,uSecs)
        if(!isCloudActive) localStorage.setItem(`local_chat_${project.id}`,JSON.stringify(final))
      } else {
        const final=[...hist,aMsg]; setChatHistory(final)
        if(!isCloudActive) localStorage.setItem(`local_chat_${project.id}`,JSON.stringify(final))
      }
    } catch(err){ setChatHistory(p=>[...p,{id:`e-${Date.now()}`,sender:'assistant',message:`Error: ${err.message}`}]) }
    finally{setIsLoadingAi(false)}
  }

  const handleRunAnalysis = async () => {
    if(!isGeminiConfigured()){alert('Configura tu Gemini API Key primero.');return}
    setAnalysisResult('Analizando tu composición…'); setIsAnalysisOpen(true)
    try {
      const result=await runDeepCompositionAnalysis({name:project.name,key_signature:project.key_signature,tempo_bpm:project.tempo_bpm,capo_position:project.capo_position,mood:project.mood,sections:sections.map(s=>({name:s.name,chords:s.chords}))})
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
  const getChordAt = (bi) => { if(!activeSection)return''; let sum=0; for(const c of activeSection.chords){if(bi>=sum&&bi<sum+c.beats)return c.chord;sum+=c.beats}; return'' }
  const isChordStart = (bi) => { if(!activeSection)return false; let sum=0; for(const c of activeSection.chords){if(bi===sum)return true;sum+=c.beats}; return false }
  const progress = totalBeats > 0 ? (currentBeat / totalBeats) * 100 : 0

  // ════════════════════════════════════════════════════════════════
  //  DASHBOARD
  // ════════════════════════════════════════════════════════════════
  if (currentView === 'dashboard') return (
    <div className="app-container dashboard-layout">
      <aside className="dashboard-sidebar">
        <div>
          <div className="logo-wrap">
            <div className="logo-icon">🎸</div>
            <div>
              <div className="logo-text">SinfonIA</div>
              <div className="logo-sub">Music Studio</div>
            </div>
          </div>
          <nav className="dashboard-menu">
            <button className={`menu-item ${activeTab==='projects'?'active':''}`} onClick={()=>setActiveTab('projects')}><FolderOpen size={14}/> Proyectos</button>
            <button className={`menu-item ${activeTab==='settings'?'active':''}`} onClick={()=>setActiveTab('settings')}><Settings size={14}/> API Keys</button>
            <button className={`menu-item ${activeTab==='help'?'active':''}`}     onClick={()=>setActiveTab('help')}><BookOpen size={14}/> Guía</button>
          </nav>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:6,padding:'0 4px'}}>
          <div style={{display:'flex',gap:6,alignItems:'center',fontSize:11,color:'var(--c-text-3)'}}>
            <HardDrive size={11}/><span>{dbStatus}</span>
          </div>
          {isSupabaseConfigured() && (
            <button className="btn-ghost" onClick={()=>{const n=!useLocalMode;setUseLocalMode(n);localStorage.setItem('use_local_mode',String(n))}}>
              {useLocalMode?'🔌 Conectar Supabase':'📴 Modo Local'}
            </button>
          )}
        </div>
      </aside>

      <main className="dashboard-content">
        {/* PROJECTS */}
        {activeTab==='projects' && <>
          <div className="page-header">
            <div>
              <h1 className="page-title">Mis Proyectos</h1>
              <p className="page-subtitle">Selecciona un proyecto para abrir el estudio</p>
            </div>
            <button className="btn-primary" onClick={handleCreateProject}><Plus size={13}/> Nuevo</button>
          </div>

          {dbStatus.includes('Error') && (
            <div style={{padding:'10px 14px',background:'rgba(232,93,117,0.07)',border:'1px solid rgba(232,93,117,0.2)',color:'#f28c9d',fontSize:12,borderRadius:'var(--r-sm)'}}>
              ⚠️ Error en Supabase — ejecuta <code>supabase/schema.sql</code> y desactiva el RLS.
            </div>
          )}

          {projectsList.length===0 ? (
            <div style={{padding:'48px 24px',textAlign:'center',border:'1px dashed var(--c-border)',borderRadius:'var(--r-lg)',color:'var(--c-text-2)'}}>
              <Music size={36} style={{margin:'0 auto 12px',opacity:.25}}/>
              <p style={{marginBottom:14,fontSize:13}}>No tienes proyectos aún.</p>
              <button className="btn-primary" onClick={handleCreateProject} style={{margin:'0 auto'}}>Crear mi primer proyecto</button>
            </div>
          ) : (
            <div className="projects-grid">
              {projectsList.map(p=>(
                <div key={p.id} className="project-card" onClick={()=>handleSelectProject(p)}>
                  {p.cover_art&&<div style={{position:'absolute',inset:0,backgroundImage:`url(${p.cover_art})`,backgroundSize:'cover',backgroundPosition:'center',opacity:.08,borderRadius:'var(--r-md)'}}/>}
                  <div className="project-card-header" style={{position:'relative',zIndex:2}}>
                    <div>
                      <div className="project-card-title">{p.name}</div>
                      <div className="project-card-meta"><span>{p.tempo_bpm} BPM</span><span>·</span><span>{p.key_signature}</span>{p.mood&&<><span>·</span><span>{p.mood}</span></>}</div>
                    </div>
                  </div>
                  <div className="project-card-footer" style={{position:'relative',zIndex:2}}>
                    <span style={{fontSize:10,color:'var(--c-text-3)'}}>{new Date(p.updated_at).toLocaleDateString()}</span>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:11,color:'var(--teal)',fontWeight:700}}>Abrir →</span>
                      <button onClick={e=>handleDeleteProject(p.id,e)} style={{background:'transparent',border:'none',color:'var(--c-text-3)',cursor:'pointer',padding:2,display:'flex'}}><Trash2 size={12}/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>}

        {/* SETTINGS */}
        {activeTab==='settings' && (
          <div style={{maxWidth:500}}>
            <div className="page-header" style={{flexDirection:'column',alignItems:'flex-start',gap:4}}>
              <h1 className="page-title">Configuración de API</h1>
              <p className="page-subtitle">Conecta tus servicios de IA para activar todas las funciones.</p>
            </div>
            <form onSubmit={handleSaveSettings} style={{display:'flex',flexDirection:'column',gap:16}}>
              <div className="form-group">
                <label className="form-label">Gemini API Key</label>
                <div style={{display:'flex',gap:6}}>
                  <input type="password" placeholder="AIzaSy…" value={geminiKey} onChange={e=>setGeminiKey(e.target.value)} className="chat-input"/>
                  <button type="button" onClick={testGeminiConnection} className="btn-secondary" disabled={isTestingGemini}>{isTestingGemini?'…':'Probar'}</button>
                </div>
                <span style={{fontSize:11,color:'var(--c-text-3)'}}>Obtén tu clave en <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" style={{color:'var(--teal)'}}>Google AI Studio</a></span>
                {geminiTestResult&&(
                  <div style={{fontSize:11.5,padding:'7px 10px',background:geminiTestResult.includes('✅')?'rgba(62,201,124,0.07)':'rgba(232,93,117,0.07)',border:`1px solid ${geminiTestResult.includes('✅')?'rgba(62,201,124,0.25)':'rgba(232,93,117,0.25)'}`,color:geminiTestResult.includes('✅')?'var(--c-ok)':'var(--c-danger)',borderRadius:'var(--r-sm)'}}>
                    {geminiTestResult}
                  </div>
                )}
              </div>
              <div style={{height:1,background:'var(--c-border)'}}/>
              <div className="form-group">
                <label className="form-label">Supabase URL <span style={{color:'var(--c-text-3)',textTransform:'none',fontSize:10,fontWeight:400}}>(opcional)</span></label>
                <input type="text" placeholder="https://xyz.supabase.co" value={supabaseUrl} onChange={e=>setSupabaseUrl(e.target.value)} className="chat-input"/>
              </div>
              <div className="form-group">
                <label className="form-label">Supabase Anon Key <span style={{color:'var(--c-text-3)',textTransform:'none',fontSize:10,fontWeight:400}}>(opcional)</span></label>
                <input type="password" placeholder="eyJhbGciOi…" value={supabaseKey} onChange={e=>setSupabaseKey(e.target.value)} className="chat-input"/>
              </div>
              <button type="submit" className="btn-primary" style={{alignSelf:'flex-start'}}>Guardar y Recargar</button>
            </form>
          </div>
        )}

        {/* HELP */}
        {activeTab==='help' && (
          <div style={{maxWidth:640,display:'flex',flexDirection:'column',gap:12}}>
            <div className="page-header" style={{flexDirection:'column',alignItems:'flex-start',gap:4,paddingBottom:16}}>
              <h1 className="page-title">Guía de SinfonIA</h1>
              <p className="page-subtitle">Aprende a usar todas las funciones del estudio.</p>
            </div>
            {[
              {icon:'🎙️',color:'var(--teal)',      title:'Productor IA — Gemini 2.5 Flash',text:'Describe el sentimiento de tu canción y el productor ajustará automáticamente los acordes, el tempo y la tonalidad.'},
              {icon:'🧠',color:'var(--c-warn)',     title:'Análisis Pro — Gemini 2.5 Flash',text:'Análisis profundo de la armonía, sugerencias de guitarra específicas y técnicas de arpegio para cada sección.'},
              {icon:'🎨',color:'var(--c-info)',     title:'Arte de Portada (Canvas)',       text:'Genera una portada personalizada basada en el nombre y el mood de tu canción. (Imagen 3 requiere plan de pago.)'},
              {icon:'🎸',color:'var(--c-ok)',       title:'Diapasón Interactivo',           text:'Visualiza acordes y escalas en el mástil. Haz clic en cualquier nota para escucharla en tiempo real.'},
            ].map(({icon,color,title,text})=>(
              <div key={title} className="info-panel">
                <h3 style={{color}}>{icon} {title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )

  // ════════════════════════════════════════════════════════════════
  //  EDITOR
  // ════════════════════════════════════════════════════════════════
  return (
    <div className="app-container editor-layout">

      {/* ── CHAT SIDEBAR ── */}
      <aside className="chat-sidebar">
        <header className="chat-header">
          <button className="btn-ghost" onClick={()=>setCurrentView('dashboard')} style={{fontSize:11}}>
            <ChevronLeft size={12}/> Proyectos
          </button>
          <div className="chat-producer-badge">
            {isPlaying
              ? <div className="playing-indicator"><span/><span/><span/><span/></div>
              : <div className="chat-producer-dot"/>}
            <span className="chat-producer-label">Productor IA</span>
          </div>
        </header>

        <div className="chat-messages">
          {chatHistory.map(msg=>
            msg.sender==='system'
              ? <div key={msg.id} className="message-system-log">{msg.message}</div>
              : <div key={msg.id} className={`message-bubble ${msg.sender==='user'?'message-user':'message-assistant'}`}>{msg.message}</div>
          )}
          {isLoadingAi&&<div className="message-bubble message-assistant" style={{opacity:.6,fontStyle:'italic'}}>Componiendo…</div>}
          <div ref={chatEndRef}/>
        </div>

        <form onSubmit={handleSendChat} className="chat-input-area">
          <input type="text" placeholder="Pídele cambios al productor…" value={chatInput} onChange={e=>setChatInput(e.target.value)} className="chat-input" disabled={isLoadingAi}/>
          <button type="submit" className="btn-primary" disabled={isLoadingAi||!chatInput.trim()} style={{padding:'7px 10px'}}><Send size={13}/></button>
        </form>
      </aside>

      {/* ── STUDIO WORKSPACE ── */}
      <main className="studio-workspace">

        {/* Topbar */}
        <header className="workspace-topbar">
          <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0}}>
            <span className="project-name-label">{project.name}</span>
          </div>

          <div style={{display:'flex',alignItems:'center',gap:8}}>
            {/* Analysis button */}
            <button className="btn-amber" onClick={handleRunAnalysis} style={{fontSize:11.5,padding:'5px 10px'}}>
              <Sparkles size={12}/> Análisis Pro
            </button>

            {/* Transport */}
            <div className="transport">
              <button onClick={handlePlayToggle} className={`btn-transport ${isPlaying?'play-active':''}`}>
                {isPlaying?<Pause size={14}/>:<Play size={14}/>}
              </button>
              <button onClick={handleStop} className="btn-transport"><Square size={13}/></button>
              <div className="transport-divider"/>
              <div className="transport-meta">
                <span style={{color:'var(--c-text-3)',fontWeight:400}}>BPM</span>
                <span>
                  <input type="number" value={project.tempo_bpm} onChange={e=>updateBpm(e.target.value)} style={{width:34}}/>
                </span>
              </div>
              <div className="transport-divider"/>
              <div className="transport-meta">
                <span style={{color:'var(--c-text-3)',fontWeight:400}}>Key</span>
                <select value={project.key_signature} onChange={e=>updateKey(e.target.value)}>
                  {['C','G','D','A','E','B','F#','F','Bb','Eb','Ab','Db','Am','Em','Bm','F#m','C#m','G#m','Dm','Gm','Cm','Fm'].map(k=><option key={k} value={k} style={{background:'#181b22'}}>{k}</option>)}
                </select>
              </div>
              <div className="transport-divider"/>
              <div className="transport-meta">
                <span style={{color:'var(--c-text-3)',fontWeight:400}}>Capo</span>
                <span>
                  <input type="number" min="0" max="12" value={project.capo_position} onChange={e=>updateCapo(e.target.value)} style={{width:22}}/>
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Section strip */}
        <div className="section-strip">
          <span className="section-strip-label">Secciones</span>
          {sections.map(sec=>(
            <button key={sec.id} className={`sec-tab ${activeSectionId===sec.id?'active':''}`} onClick={()=>{setActiveSectionId(sec.id);handleStop()}}>
              {sec.name}
              {sections.length>1&&<span className="sec-tab-del" onClick={e=>deleteSection(sec.id,e)}>×</span>}
            </button>
          ))}
          <button className="btn-ghost" onClick={addSection} style={{fontSize:11,flexShrink:0}}>+ Sección</button>
        </div>

        {/* ── DAW TIMELINE ── */}
        {activeSection && (
          <div className="daw-timeline">
            {/* Ruler */}
            <div className="daw-ruler">
              <div className="daw-track-head">Acordes</div>
              <div className="daw-beats-scroll">
                {Array.from({length:totalBeats}).map((_,bi)=>{
                  const chord=getChordAt(bi)
                  const active=isPlaying&&currentBeat===bi
                  const start=isChordStart(bi)
                  return (
                    <div key={bi} className={`daw-beat ${active?'beat-active':''} ${start?'chord-start':''} ${bi%4===0?'bar-start':''}`}>
                      {start&&<span className="daw-beat-chord">{chord}</span>}
                      <span className="daw-beat-num">{bi+1}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Tracks */}
            {[
              {key:'guitar',label:'Guitarra',cls:'trk-guitar',color:'var(--trk-guitar)',note:bi=>instruments.guitar.active&&(instruments.guitar.type==='strum'?bi%4===0:true)},
              {key:'piano', label:'Piano',   cls:'trk-piano', color:'var(--trk-piano)', note:()=>instruments.piano.active},
              {key:'bass',  label:'Bajo',    cls:'trk-bass',  color:'var(--trk-bass)',  note:bi=>instruments.bass.active&&(instruments.bass.type==='roots'?bi%2===0:true)},
              {key:'drums', label:'Batería', cls:'trk-drums', color:'var(--trk-drums)', note:()=>instruments.drums.active},
            ].map(({key,label,cls,color,note})=>(
              <div key={key} className={`daw-track ${cls}`}>
                <div className="daw-track-label">
                  <div className="track-color-dot" style={{background:color}}/>
                  {label}
                </div>
                <div className="daw-track-cells">
                  {Array.from({length:totalBeats}).map((_,bi)=>(
                    <div key={bi} className={`daw-cell ${note(bi)?'has-block':''} ${isPlaying&&currentBeat===bi?'beat-active':''}`}/>
                  ))}
                </div>
              </div>
            ))}

            {/* Progress */}
            <div className="daw-progress-track">
              <div className="daw-progress-fill" style={{width:`${progress}%`}}/>
            </div>
          </div>
        )}

        {/* ── Chord Palette ── */}
        {activeSection && (
          <div className="chord-palette">
            <div className="active-chord-box">
              <div className="active-chord-name">{isPlaying?(currentChord||'—'):(activeSection?.chords[0]?.chord||'—')}</div>
              <div className="active-chord-label">Activo</div>
            </div>
            <div className="chord-palette-divider"/>
            <div className="chord-seq">
              {activeSection.chords.map((c,i)=>(
                <div key={i} className={`chord-block ${isPlaying&&currentChordIdx===i?'chord-playing':''}`}>
                  {c.chord}<sup style={{fontSize:8,opacity:.5,marginLeft:1}}>{c.beats}</sup>
                </div>
              ))}
            </div>
            <div className="chord-palette-divider"/>
            <span className="chord-add-label">Añadir:</span>
            {['C','G','D','A','E','F','Am','Em','Dm','Bm','Cmaj7','Am7','G7','D7'].map(ch=>(
              <button key={ch} className="chord-badge" onClick={()=>addChord(ch)}>{ch}</button>
            ))}
            <button className="btn-ghost" onClick={removeLastChord} style={{marginLeft:'auto',flexShrink:0,fontSize:11}}>− Último</button>
          </div>
        )}

        {/* ── Fretboard ── */}
        <div className="fretboard-wrapper">
          <Fretboard
            keySignature={project.key_signature}
            activeChord={isPlaying?currentChord:(activeSection?.chords[0]?.chord||'')}
            capoPosition={project.capo_position}
            onPlayNote={playFretNote}
            currentBeat={currentBeat}
            isPlaying={isPlaying}
          />
        </div>
      </main>

      {/* ── MIXER SIDEBAR ── */}
      <aside className="right-sidebar">
        <div className="sidebar-section-title" style={{marginBottom:4}}>Mezcla</div>

        {[
          {key:'guitar',label:'Guitarra',cls:'mixer-ch-guitar',color:'var(--trk-guitar)',patterns:[['strum','Rasgueo'],['arpeggio','Arpegio']]},
          {key:'piano', label:'Piano',   cls:'mixer-ch-piano', color:'var(--trk-piano)', patterns:[['arpeggio','Arpegio'],['chord','Bloque']]},
          {key:'bass',  label:'Bajo',    cls:'mixer-ch-bass',  color:'var(--trk-bass)',  patterns:[['roots','Tónicas'],['walking','Walking']]},
          {key:'drums', label:'Batería', cls:'mixer-ch-drums', color:'var(--trk-drums)', patterns:[['basic','Base'],['metronome','Click']]},
        ].map(({key,label,cls,color,patterns})=>(
          <div key={key} className={`mixer-channel ${cls}`}>
            <div className="mixer-channel-header">
              <span className="mixer-channel-name" style={{color:instruments[key].active?color:'var(--c-text-3)'}}>
                {label}
              </span>
              <label className="toggle-switch">
                <input type="checkbox" checked={instruments[key].active} onChange={()=>toggleInstrument(key)}/>
                <span className="slider-round"/>
              </label>
            </div>
            <input type="range" min="-40" max="0" value={instruments[key].volume} onChange={e=>handleVolume(key,e.target.value)} className="custom-range" disabled={!instruments[key].active}/>
            <div className="pattern-btns">
              {patterns.map(([pat,lbl])=>(
                <button key={pat} className={`pat-btn ${instruments[key].type===pat?'pat-active':''}`} onClick={()=>handlePattern(key,pat)} disabled={!instruments[key].active}>{lbl}</button>
              ))}
            </div>
          </div>
        ))}

        <div style={{flex:1}}/>

        {/* Cover Art */}
        <div>
          <div className="sidebar-section-title" style={{marginBottom:6}}>Portada</div>
          <div className="cover-art-section">
            {project?.cover_art
              ? <img src={project.cover_art} alt="Portada" className="cover-art-img"/>
              : <div className="cover-art-placeholder"><ImageIcon size={20} style={{opacity:.2}}/><span>Sin portada</span></div>
            }
            <button onClick={handleGenerateCover} className="btn-secondary" disabled={isGeneratingArt} style={{justifyContent:'center',fontSize:11.5}}>
              <Sparkles size={11}/>{isGeneratingArt?'Generando…':'Generar Portada'}
            </button>
          </div>
        </div>
      </aside>

      {/* ── MODAL ANÁLISIS ── */}
      {isAnalysisOpen && (
        <div className="modal-overlay" onClick={()=>setIsAnalysisOpen(false)}>
          <div className="modal-content" onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingBottom:12,borderBottom:'1px solid var(--c-border)'}}>
              <h2 style={{fontSize:15,fontWeight:800,color:'var(--c-warn)',display:'flex',alignItems:'center',gap:6}}><Sparkles size={14}/> Análisis de Producción</h2>
              <button onClick={()=>setIsAnalysisOpen(false)} style={{background:'transparent',border:'none',color:'var(--c-text-2)',cursor:'pointer',fontSize:18,lineHeight:1}}>×</button>
            </div>
            <div style={{fontSize:12.5,lineHeight:1.75,color:'var(--c-text-1)',whiteSpace:'pre-wrap',maxHeight:'60vh',overflowY:'auto'}}>
              {analysisResult}
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',paddingTop:12,borderTop:'1px solid var(--c-border)'}}>
              <button onClick={()=>setIsAnalysisOpen(false)} className="btn-primary">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
