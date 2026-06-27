import React, { useState } from 'react';
import { useProjects } from '../hooks/useProjects';
import { useProjectStore } from '../store/useProjectStore';

const ProjectLauncher = () => {
  const { projectsList } = useProjectStore();
  const { selectProject, createProject } = useProjects();
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('gemini_api_key') || '');

  const handleGeminiChange = (e) => {
    const val = e.target.value;
    setGeminiKey(val);
    localStorage.setItem('gemini_api_key', val);
  };

  const handleInitializeProject = () => {
    const name = prompt('Nombre del proyecto:', 'Mi Canción'); 
    if (name) createProject(name);
  };

  return (
    <div className="flex w-screen h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* Left Column: CORE_PROJECTS_ENGINE */}
      <div className="flex-1 border-r border-zinc-800/80 flex flex-col p-8 gap-6">
        <div className="font-mono text-xs text-zinc-400 tracking-wider">
          [CORE_PROJECTS_ENGINE]
        </div>

        {/* New Project */}
        <div>
          <button 
            onClick={handleInitializeProject}
            className="w-full p-4 bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono text-sm tracking-tight transition-all duration-200 hover:bg-zinc-800 active:scale-[0.98]"
          >
            INITIALIZE_EMPTY_PROJECT
          </button>
        </div>

        {/* Recent Projects */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-3">
          <div className="font-mono text-[11px] text-zinc-500 mb-1">
            RECENT_PROJECTS
          </div>
          {projectsList.length === 0 ? (
            <div className="p-6 text-center text-zinc-500 border border-dashed border-zinc-800">
              NO_PROJECTS_FOUND
            </div>
          ) : (
            projectsList.map(p => (
              <div key={p.id} className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800/50 rounded-lg transition-all duration-200 hover:border-zinc-700/50 hover:bg-zinc-800/30">
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-semibold">{p.name}</div>
                  <div className="font-mono text-[11px] text-zinc-400 flex gap-3">
                    <span>KEY:{p.key_signature}</span>
                    <span>BPM:{p.tempo_bpm}</span>
                  </div>
                </div>
                <button
                  onClick={() => selectProject(p)}
                  className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono text-xs rounded transition-all duration-200 hover:bg-zinc-700 active:scale-[0.98]"
                >
                  OPEN_WORKSPACE
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Column: SYSTEM_CONFIGURATION & CREDENTIALS */}
      <div className="flex-1 flex flex-col p-8 gap-6 bg-zinc-950">
        <div className="font-mono text-xs text-zinc-400 tracking-wider">
          [SYSTEM_CONFIGURATION & CREDENTIALS]
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="font-mono text-[11px] text-zinc-400">GEMINI_API_KEY</label>
            <input 
              type="password" 
              value={geminiKey} 
              onChange={handleGeminiChange} 
              placeholder="AIzaSy..." 
              className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 p-3 font-mono text-xs rounded outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all duration-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectLauncher;
