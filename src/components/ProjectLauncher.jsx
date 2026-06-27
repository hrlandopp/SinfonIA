import React, { useState, useEffect } from 'react';
import { useProjects } from '../hooks/useProjects';
import { useProjectStore } from '../store/useProjectStore';
import { Settings, FolderKanban, Plus, Play, Database, Sparkles, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { saveSupabaseCredentials } from '../utils/supabaseClient';
import { saveGeminiKey, saveGeminiModel, getSelectedGeminiModel, AVAILABLE_MODELS, getAiClient } from '../utils/geminiClient';

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
      <div className="w-1/4 max-w-sm border-r border-zinc-800/80 bg-zinc-950 flex flex-col flex-shrink-0">
        <div className="p-8 border-b border-zinc-800/50">
          <h1 className="text-2xl font-bold tracking-tight">SinfonIA</h1>
          <p className="text-zinc-500 text-[10px] font-mono mt-1 tracking-widest uppercase">Estudio Inteligente</p>
        </div>

        <nav className="flex-1 p-6 flex flex-col gap-2">
          <button
            onClick={() => setActiveTab('projects')}
            className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all duration-200 text-sm font-medium ${activeTab === 'projects' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}`}
          >
            <FolderKanban size={18} />
            Proyectos
          </button>
          
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all duration-200 text-sm font-medium ${activeTab === 'settings' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}`}
          >
            <Settings size={18} />
            Ajustes
          </button>
        </nav>

        <div className="p-6 border-t border-zinc-800/50">
           <div className="font-mono text-[10px] text-zinc-600 text-center uppercase tracking-wider">
             CORE_ENGINE v0.1.0
           </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 overflow-y-auto p-10 lg:p-14 bg-zinc-900">
        {activeTab === 'projects' && (
          <div className="max-w-6xl mx-auto flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">Tus Proyectos</h2>
                <p className="text-zinc-400 text-sm mt-1">Gestiona y abre tus sesiones de producción musical.</p>
              </div>
              <button 
                onClick={handleInitializeProject}
                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-100 text-zinc-950 hover:bg-white font-medium text-sm rounded-md transition-all duration-200 active:scale-[0.98] shadow-sm"
              >
                <Plus size={16} strokeWidth={2.5} />
                Nuevo Proyecto
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {projectsList.length === 0 ? (
                <div className="col-span-full p-16 text-center text-zinc-500 border border-dashed border-zinc-700/50 rounded-xl bg-zinc-900/20">
                  <FolderKanban size={40} className="mx-auto mb-4 opacity-30" />
                  <p className="font-medium text-zinc-300 text-lg">No tienes proyectos aún</p>
                  <p className="text-sm mt-1">Crea un proyecto para empezar a componer.</p>
                </div>
              ) : (
                projectsList.map(p => (
                  <div key={p.id} className="group flex flex-col p-6 bg-zinc-950/50 border border-zinc-800/80 rounded-xl transition-all duration-300 hover:border-zinc-600/50 hover:shadow-lg hover:shadow-zinc-900/50 hover:bg-zinc-950">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold truncate text-zinc-200 group-hover:text-white transition-colors">{p.name}</h3>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded bg-zinc-900 px-2.5 py-1 text-[11px] font-mono text-zinc-400 ring-1 ring-inset ring-zinc-800/80">
                          KEY: {p.key_signature}
                        </span>
                        <span className="inline-flex items-center rounded bg-zinc-900 px-2.5 py-1 text-[11px] font-mono text-zinc-400 ring-1 ring-inset ring-zinc-800/80">
                          BPM: {p.tempo_bpm}
                        </span>
                      </div>
                    </div>
                    <div className="mt-8">
                      <button
                        onClick={() => selectProject(p)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium text-sm rounded-lg transition-all duration-200 hover:bg-zinc-800 hover:text-zinc-100 hover:border-zinc-700 active:scale-[0.98]"
                      >
                        <Play size={14} className="opacity-70 group-hover:opacity-100" />
                        Abrir Sesión
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Ajustes del Sistema</h2>
              <p className="text-zinc-400 text-sm mt-1">Configura credenciales y preferencias globales para conectar los módulos principales.</p>
            </div>

            <div className="flex flex-col gap-6">
              
              {/* Módulo Supabase */}
              <div className="p-8 bg-zinc-950/50 border border-zinc-800/80 rounded-xl flex flex-col gap-6">
                <div className="flex items-center gap-3 mb-2">
                  <Database className="text-zinc-400" size={20} />
                  <h3 className="text-lg font-medium text-zinc-200">Supabase (Backend Cloud)</h3>
                </div>
                
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-zinc-400">Project URL</label>
                    <input 
                      type="text" 
                      value={supabaseUrl} 
                      onChange={e => setSupabaseUrl(e.target.value)} 
                      placeholder="https://abcdefgh.supabase.co" 
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 px-4 py-3 font-mono text-sm rounded-lg outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all duration-200 placeholder:text-zinc-700"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-zinc-400">Anon Key</label>
                    <input 
                      type="password" 
                      value={supabaseKey} 
                      onChange={e => setSupabaseKey(e.target.value)} 
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5c..." 
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 px-4 py-3 font-mono text-sm rounded-lg outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all duration-200 placeholder:text-zinc-700"
                    />
                  </div>
                  
                  <button 
                    onClick={handleSaveSupabase}
                    className="mt-2 w-fit px-6 py-2.5 bg-zinc-800 border border-zinc-700 text-zinc-200 font-medium text-sm rounded-lg transition-all duration-200 hover:bg-zinc-700 hover:text-zinc-100 active:scale-[0.98]"
                  >
                    Guardar y Aplicar
                  </button>
                </div>
              </div>

              {/* Módulo Inteligencia Artificial */}
              <div className="p-8 bg-zinc-950/50 border border-zinc-800/80 rounded-xl flex flex-col gap-6">
                <div className="flex items-center gap-3 mb-2">
                  <Sparkles className="text-amber-400/80" size={20} />
                  <h3 className="text-lg font-medium text-zinc-200">Cerebro Inteligente (Gemini AI)</h3>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-zinc-400">API Key de Google Gemini</label>
                    <div className="flex gap-3">
                      <input 
                        type="password" 
                        value={geminiKey} 
                        onChange={e => setGeminiKey(e.target.value)} 
                        placeholder="AIzaSy..." 
                        className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-100 px-4 py-3 font-mono text-sm rounded-lg outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all duration-200 placeholder:text-zinc-700"
                      />
                      <button 
                        onClick={handleValidateGemini}
                        disabled={isValidatingGemini || !geminiKey}
                        className="px-6 py-3 bg-zinc-100 text-zinc-950 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm rounded-lg transition-all duration-200 active:scale-[0.98] shadow-sm flex items-center gap-2"
                      >
                        {isValidatingGemini && <Loader2 size={16} className="animate-spin" />}
                        {isValidatingGemini ? 'Validando...' : 'Validar Conexión'}
                      </button>
                    </div>
                    {geminiStatus === 'error' && (
                      <div className="flex items-center gap-2 text-red-400 mt-2 text-sm bg-red-400/10 p-3 rounded border border-red-400/20">
                        <XCircle size={16} />
                        <span>Fallo de conexión: {geminiErrorMsg}</span>
                      </div>
                    )}
                    {geminiStatus === 'success' && (
                      <div className="flex items-center gap-2 text-emerald-400 mt-2 text-sm bg-emerald-400/10 p-3 rounded border border-emerald-400/20">
                        <CheckCircle2 size={16} />
                        <span>¡Conexión exitosa! Guardando...</span>
                      </div>
                    )}
                    <p className="text-xs text-zinc-500 leading-relaxed mt-1">
                      Requerido para habilitar el asistente de inteligencia artificial musical. Esta llave se almacena localmente en tu navegador.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 border-t border-zinc-800/50 pt-6 mt-1">
                    <label className="text-sm font-medium text-zinc-400">Modelo de Inferencia</label>
                    <select
                      value={geminiModel}
                      onChange={handleModelChange}
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 px-4 py-3 font-sans text-sm rounded-lg outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all duration-200"
                    >
                      {AVAILABLE_MODELS.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectLauncher;
