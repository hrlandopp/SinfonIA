import React, { useState, useEffect } from 'react';
import { useProjects } from '../../hooks/useProjects';
import { useProjectStore } from '../../store/useProjectStore';
import { Settings, FolderKanban, Plus, Play, Database, Sparkles, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { saveSupabaseCredentials } from '../../services/supabaseClient';
import { saveGeminiKey, saveGeminiModel, getSelectedGeminiModel, AVAILABLE_MODELS, getAiClient, generateSongArt } from '../../services/geminiClient';

const ProjectCard = ({ project, onSelect }) => {
  const [coverUrl, setCoverUrl] = useState('');

  useEffect(() => {
    let isMounted = true;
    generateSongArt(project.name, project.mood || 'neutral').then(url => {
      if (isMounted) setCoverUrl(url);
    });
    return () => { isMounted = false };
  }, [project.name, project.mood]);

  return (
    <div className="group flex flex-col bg-zinc-950/50 border border-zinc-800/80 rounded-xl transition-all duration-300 hover:border-zinc-600/50 hover:shadow-lg hover:shadow-zinc-900/50 hover:bg-zinc-950 overflow-hidden">
      {/* Portada del Proyecto */}
      <div className="h-40 w-full bg-zinc-900 relative overflow-hidden border-b border-zinc-800/50">
        {coverUrl ? (
          <img src={coverUrl} alt={`Cover for ${project.name}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 size={24} className="text-zinc-700 animate-spin" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 to-transparent opacity-100" />
      </div>

      <div className="flex-1 p-5 -mt-8 relative z-10 flex flex-col">
        <h3 className="text-xl font-bold truncate text-zinc-50 group-hover:text-white transition-colors drop-shadow-md">{project.name}</h3>
        
        {/* Barra Inferior de Metadatos */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-md bg-zinc-900/90 px-2.5 py-1 text-xs font-mono text-zinc-300 ring-1 ring-inset ring-zinc-700/50 backdrop-blur-sm">
            KEY: {project.key_signature || 'C'}
          </span>
          <span className="inline-flex items-center rounded-md bg-zinc-900/90 px-2.5 py-1 text-xs font-mono text-zinc-300 ring-1 ring-inset ring-zinc-700/50 backdrop-blur-sm">
            BPM: {project.tempo_bpm || '120'}
          </span>
        </div>

        <div className="mt-6 mt-auto">
          <button
            onClick={() => onSelect(project)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-100 text-zinc-950 font-semibold text-sm rounded-lg transition-all duration-200 hover:bg-white active:scale-[0.98] shadow-sm"
          >
            <Play size={16} className="fill-zinc-900" />
            OPEN WORKSPACE
          </button>
        </div>
      </div>
    </div>
  );
};

const ProjectLauncher = () => {
  const { projectsList } = useProjectStore();
  const { selectProject, createProject } = useProjects();
  
  const [activeTab, setActiveTab] = useState('projects');

  // Supabase State
  const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('supabase_url') || '');
  const [supabaseKey, setSupabaseKey] = useState(localStorage.getItem('supabase_anon_key') || '');
  
  // Gemini State
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [geminiModel, setGeminiModel] = useState('gemini-3.5-flash');
  const [isValidatingGemini, setIsValidatingGemini] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState(null); // 'success' | 'error' | null
  const [geminiErrorMsg, setGeminiErrorMsg] = useState('');

  useEffect(() => {
    setGeminiModel(getSelectedGeminiModel());
  }, []);

  const handleInitializeProject = () => {
    const name = prompt('Nombre del proyecto:', 'Mi Canción'); 
    if (name) createProject(name);
  };

  const handleSaveSupabase = () => {
    saveSupabaseCredentials(supabaseUrl, supabaseKey);
  };

  const handleValidateGemini = async () => {
    if (!geminiKey) return;
    setIsValidatingGemini(true);
    setGeminiStatus(null);
    try {
      const ai = getAiClient(geminiKey);
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: 'test',
      });
      if (response) {
        setGeminiStatus('success');
        saveGeminiKey(geminiKey);
      }
    } catch (e) {
      console.error(e);
      setGeminiStatus('error');
      setGeminiErrorMsg(e.message || 'Error de conexión');
    } finally {
      setIsValidatingGemini(false);
    }
  };

  const handleModelChange = (e) => {
    const val = e.target.value;
    setGeminiModel(val);
    saveGeminiModel(val);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-900 text-zinc-100 font-sans">
      
      {/* Sidebar */}
      <div className="w-1/4 max-w-sm border-r border-zinc-800/80 bg-zinc-950 flex flex-col flex-shrink-0 z-20">
        <div className="p-8 pb-6 flex-shrink-0">
          <h1 className="text-2xl font-bold tracking-tight">SinfonIA</h1>
          <p className="text-zinc-500 text-[10px] font-mono mt-1 tracking-widest uppercase">Estudio Inteligente</p>
        </div>

        <div className="px-6 pb-4 flex gap-2 border-b border-zinc-800/50 flex-shrink-0">
          <button
            onClick={() => setActiveTab('projects')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all duration-200 text-xs font-semibold ${activeTab === 'projects' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}`}
          >
            <FolderKanban size={14} />
            Proyectos
          </button>
          
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all duration-200 text-xs font-semibold ${activeTab === 'settings' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}`}
          >
            <Settings size={14} />
            Ajustes
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-800">
          {activeTab === 'projects' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-300">
              <p className="text-sm text-zinc-400 leading-relaxed">
                Selecciona un proyecto del panel principal o inicializa uno nuevo para comenzar tu sesión.
              </p>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="flex flex-col gap-8 animate-in fade-in duration-300">
              {/* Módulo Supabase */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Database className="text-zinc-400" size={16} />
                  <h3 className="text-sm font-semibold text-zinc-200">Supabase (Backend)</h3>
                </div>
                
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-zinc-400">Project URL</label>
                    <input 
                      type="text" 
                      value={supabaseUrl} 
                      onChange={e => setSupabaseUrl(e.target.value)} 
                      placeholder="https://abcdef.supabase.co" 
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 px-3 py-2 font-mono text-xs rounded-md outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all placeholder:text-zinc-700"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-zinc-400">Anon Key</label>
                    <input 
                      type="password" 
                      value={supabaseKey} 
                      onChange={e => setSupabaseKey(e.target.value)} 
                      placeholder="eyJhbGci..." 
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 px-3 py-2 font-mono text-xs rounded-md outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all placeholder:text-zinc-700"
                    />
                  </div>
                  <button 
                    onClick={handleSaveSupabase}
                    className="mt-1 w-full px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-200 font-medium text-xs rounded-md transition-all hover:bg-zinc-700 active:scale-[0.98]"
                  >
                    Guardar Configuración
                  </button>
                </div>
              </div>

              {/* Módulo Gemini AI */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-amber-400/80" size={16} />
                  <h3 className="text-sm font-semibold text-zinc-200">Gemini API (Cerebro IA)</h3>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-zinc-400">API Key</label>
                    <input 
                      type="password" 
                      value={geminiKey} 
                      onChange={e => setGeminiKey(e.target.value)} 
                      placeholder="AIzaSy..." 
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 px-3 py-2 font-mono text-xs rounded-md outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all placeholder:text-zinc-700"
                    />
                  </div>
                  <button 
                    onClick={handleValidateGemini}
                    disabled={isValidatingGemini || !geminiKey}
                    className="w-full px-4 py-2 bg-zinc-200 text-zinc-950 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed font-medium text-xs rounded-md transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
                  >
                    {isValidatingGemini && <Loader2 size={14} className="animate-spin" />}
                    {isValidatingGemini ? 'Validando...' : 'Validar Conexión'}
                  </button>

                  {geminiStatus === 'error' && (
                    <div className="flex items-center gap-1.5 text-red-400 text-xs bg-red-400/10 p-2 rounded border border-red-400/20">
                      <XCircle size={14} />
                      <span className="truncate">Fallo: {geminiErrorMsg}</span>
                    </div>
                  )}
                  {geminiStatus === 'success' && (
                    <div className="flex items-center gap-1.5 text-emerald-400 text-xs bg-emerald-400/10 p-2 rounded border border-emerald-400/20">
                      <CheckCircle2 size={14} />
                      <span>¡Conexión exitosa! Guardando...</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 border-t border-zinc-800/50 pt-4 mt-2">
                  <label className="text-xs font-medium text-zinc-400">Modelo de Inferencia</label>
                  <select
                    value={geminiModel}
                    onChange={handleModelChange}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 px-3 py-2 font-sans text-xs rounded-md outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
                  >
                    {AVAILABLE_MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 overflow-y-auto p-10 lg:p-14 bg-zinc-900 relative">
        <div className={`max-w-6xl mx-auto flex flex-col gap-10 transition-opacity duration-500 ${activeTab === 'settings' ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-zinc-950/30 p-8 rounded-2xl border border-zinc-800/50">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Tus Proyectos</h2>
              <p className="text-zinc-400 text-sm mt-2 max-w-md leading-relaxed">Gestiona tus sesiones de producción musical. Crea obras nuevas o retoma composiciones previas con Inteligencia Artificial.</p>
            </div>
            <button 
              onClick={handleInitializeProject}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-zinc-100 text-zinc-950 hover:bg-white font-bold text-sm rounded-xl transition-all duration-200 active:scale-[0.98] shadow-lg shadow-white/5"
            >
              <Plus size={20} strokeWidth={3} />
              INITIALIZE_EMPTY_PROJECT
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            {projectsList.length === 0 ? (
              <div className="col-span-full p-16 text-center text-zinc-500 border border-dashed border-zinc-700/50 rounded-2xl bg-zinc-900/20">
                <FolderKanban size={48} className="mx-auto mb-5 opacity-30" />
                <p className="font-medium text-zinc-300 text-xl">El lienzo está en blanco</p>
                <p className="text-zinc-500 mt-2">Inicializa un proyecto vacío para empezar a componer.</p>
              </div>
            ) : (
              projectsList.map(p => (
                <ProjectCard key={p.id} project={p} onSelect={selectProject} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectLauncher;
