import React, { useState, useEffect, useRef } from 'react';
import { useAIAgents } from '../hooks/useAIAgents';
import { useUIStore } from '../store/useUIStore';
import { Send, Terminal, AlertTriangle, Cpu, CheckCircle2 } from 'lucide-react';

const AIManagerPanel = React.memo(() => {
  const [chatInput, setChatInput] = useState('');
  const { producerHistory, mascotHistory, isLoadingAi, handleAgentInteraction, requestMascotHelp } = useAIAgents();
  const { mascotAlert, activeNoteEdit } = useUIStore();
  
  const producerEndRef = useRef(null);
  const mascotEndRef = useRef(null);

  useEffect(() => {
    producerEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [producerHistory]);

  useEffect(() => {
    mascotEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mascotHistory]);

  // El Orbe reacciona tanto a mascotAlert como a activeNoteEdit si quisieramos añadir lógicas intermedias
  const isOrbAlerting = !!mascotAlert;

  return (
    <aside className="w-1/4 max-w-sm bg-zinc-950 flex flex-col overflow-hidden flex-shrink-0 z-20 shadow-2xl shadow-black/80 border-r border-zinc-800">
      
      {/* HEADER GLOBAl & EL ORBE */}
      <div className="p-4 bg-zinc-900 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="text-indigo-400" size={16} />
          <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            SISTEMA DUAL DE AGENTES
          </h2>
        </div>
        
        {/* EL ORBE (Micro Mascota) */}
        <div className="flex items-center justify-center relative w-6 h-6" title={isOrbAlerting ? "Anomalía Detectada" : "Escucha Activa - Modo Pacífico"}>
          {isOrbAlerting ? (
            <>
              <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping duration-75" />
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse" />
            </>
          ) : (
            <div className={`w-3 h-3 rounded-full bg-white/80 animate-pulse duration-1000 shadow-[0_0_15px_rgba(255,255,255,0.1)] ${activeNoteEdit ? 'bg-indigo-300 shadow-[0_0_15px_rgba(165,180,252,0.4)] scale-110 transition-transform' : ''}`} />
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col p-4 gap-6 overflow-hidden">
        
        {/* 1. MACRO PRODUCER (Chat Generativo) */}
        <div className="flex-1 flex flex-col bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-hidden shadow-lg relative">
          
          {/* Header */}
          <div className="px-3 py-2 bg-zinc-900/50 border-b border-zinc-800/50 flex items-center gap-2">
            <Terminal className="text-emerald-400" size={14} />
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest font-bold">
              Macro_Productor_CLI
            </span>
          </div>

          {/* Historial Log de Sistema */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 font-mono text-[11px] scrollbar-thin scrollbar-thumb-zinc-800">
            {producerHistory && producerHistory.length > 0 ? producerHistory.map((msg, i) => {
              const isUser = msg.sender === 'user';
              const isSystem = msg.sender === 'system';
              return (
                <div key={i} className={`flex flex-col ${isSystem ? 'text-indigo-400' : (isUser ? 'text-zinc-300' : 'text-emerald-400')}`}>
                  <span className="text-zinc-600 mb-0.5 text-[9px] uppercase tracking-wider">
                    {msg.sender === 'assistant' ? 'Cerebro_IA' : msg.sender}
                  </span>
                  <div className={`p-2 rounded-md ${isUser ? 'bg-zinc-900 border border-zinc-800' : (isSystem ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-emerald-500/5 border border-emerald-500/20')}`}>
                    {msg.message}
                  </div>
                </div>
              );
            }) : (
              <div className="text-zinc-600 opacity-50 flex items-center h-full justify-center">
                // STANDBY: INGRESE COMANDO DE PRODUCCIÓN
              </div>
            )}
            <div ref={producerEndRef} />
            {isLoadingAi && (
              <div className="text-zinc-500 animate-pulse mt-2">
                &gt; Procesando inyección generativa...
              </div>
            )}
          </div>

          {/* Consola Input */}
          <div className="p-2 border-t border-zinc-800/80 bg-zinc-900/30 flex gap-2 items-end">
            <textarea 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if(e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAgentInteraction('producer', chatInput);
                  setChatInput('');
                }
              }}
              placeholder="Ej. 'Crea un verso nostálgico a 80BPM...'"
              rows={2}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 p-2 font-mono text-[11px] outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 resize-none scrollbar-thin transition-all placeholder:text-zinc-700"
            />
            <button 
              onClick={() => {
                handleAgentInteraction('producer', chatInput);
                setChatInput('');
              }}
              disabled={isLoadingAi || !chatInput.trim()}
              className="h-10 w-10 flex flex-shrink-0 items-center justify-center bg-zinc-800 hover:bg-emerald-600 hover:text-white text-emerald-400 border border-zinc-700 hover:border-emerald-500 rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} className="ml-1" />
            </button>
          </div>
        </div>

        {/* 2. MICRO MASCOT (Analizador Armónico Contextual) */}
        <div className="h-1/3 flex flex-col bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-hidden shadow-lg relative">
          
          <div className="px-3 py-3 bg-zinc-900/50 border-b border-zinc-800/50 flex items-center gap-2">
             <AlertTriangle className={mascotAlert ? "text-amber-500" : "text-zinc-500"} size={14} />
            <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest font-bold">
              Analizador_Armónico
            </span>
          </div>

          <div className="p-3 border-b border-zinc-800/30 bg-zinc-900/20">
            {mascotAlert ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-red-400 font-mono text-[10px] font-bold animate-pulse">
                   <AlertTriangle size={12} /> ANOMALÍA DETECTADA
                </div>
                <div className="text-[11px] text-zinc-300 leading-relaxed">
                  {mascotAlert.message}
                </div>
                <button 
                  onClick={requestMascotHelp}
                  className="mt-2 py-1.5 w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 font-mono text-[10px] rounded transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Cpu size={12} />
                  INVOKE_AI_RESOLVER
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-500/70 font-mono text-[10px]">
                 <CheckCircle2 size={12} /> ESTADO NOMINAL (REPOSO)
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 font-mono text-[11px] scrollbar-thin scrollbar-thumb-zinc-800">
             {mascotHistory && mascotHistory.length > 0 ? mascotHistory.map((msg, i) => (
              <div key={i} className="flex flex-col">
                <span className="text-zinc-600 mb-0.5 text-[9px] uppercase tracking-wider">
                   {msg.sender === 'user' ? 'Trigger' : 'Orbe_IA'}
                </span>
                <div className={`p-2 rounded-md ${msg.sender === 'user' ? 'bg-zinc-900 border border-zinc-800 text-zinc-300' : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-300'}`}>
                  {msg.message}
                </div>
              </div>
            )) : (
              <div className="text-zinc-600 opacity-50 flex items-center h-full justify-center text-center">
                // MICRO_AGENT STANDBY
              </div>
            )}
            <div ref={mascotEndRef} />
          </div>
        </div>
        
      </div>
    </aside>
  );
});

AIManagerPanel.displayName = 'AIManagerPanel';

export default AIManagerPanel;
