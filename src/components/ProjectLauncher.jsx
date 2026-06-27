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
    <div style={{
      display: 'flex',
      width: '100vw',
      height: '100vh',
      backgroundColor: 'var(--c-bg)',
      color: 'var(--c-text-1)',
      fontFamily: 'var(--font-ui)',
      overflow: 'hidden'
    }}>
      {/* Left Column: CORE_PROJECTS_ENGINE */}
      <div style={{
        flex: 1,
        borderRight: '1px solid var(--c-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '32px',
        gap: '24px'
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--c-text-2)', letterSpacing: '0.05em' }}>
          [CORE_PROJECTS_ENGINE]
        </div>

        {/* New Project */}
        <div>
          <button 
            onClick={handleInitializeProject}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: 'var(--c-surface)',
              border: '1px solid var(--c-border)',
              color: 'var(--c-text-1)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              cursor: 'pointer',
              textAlign: 'center',
              letterSpacing: '0.05em'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--c-elevated)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--c-surface)'}
          >
            INITIALIZE_EMPTY_PROJECT
          </button>
        </div>

        {/* Recent Projects */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--c-text-3)', marginBottom: '4px' }}>
            RECENT_PROJECTS
          </div>
          {projectsList.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--c-text-3)', border: '1px dashed var(--c-border)' }}>
              NO_PROJECTS_FOUND
            </div>
          ) : (
            projectsList.map(p => (
              <div key={p.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                backgroundColor: 'var(--c-base)',
                border: '1px solid var(--c-border)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>{p.name}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--c-text-2)', display: 'flex', gap: '12px' }}>
                    <span>KEY:{p.key_signature}</span>
                    <span>BPM:{p.tempo_bpm}</span>
                  </div>
                </div>
                <button
                  onClick={() => selectProject(p)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'var(--c-surface)',
                    border: '1px solid var(--c-border)',
                    color: 'var(--c-text-1)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--c-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--c-surface)'}
                >
                  OPEN_WORKSPACE
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Column: SYSTEM_CONFIGURATION & CREDENTIALS */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '32px',
        gap: '24px',
        backgroundColor: 'var(--c-base)'
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--c-text-2)', letterSpacing: '0.05em' }}>
          [SYSTEM_CONFIGURATION & CREDENTIALS]
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--c-text-2)' }}>GEMINI_API_KEY</label>
            <input 
              type="password" 
              value={geminiKey} 
              onChange={handleGeminiChange} 
              placeholder="AIzaSy..." 
              style={{
                backgroundColor: 'var(--c-input)',
                border: '1px solid var(--c-border)',
                color: 'var(--c-text-1)',
                padding: '10px 12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                outline: 'none'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectLauncher;
