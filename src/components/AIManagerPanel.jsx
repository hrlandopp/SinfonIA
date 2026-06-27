import React, { useState, useEffect, useRef } from 'react';
import { useAIAgents } from '../hooks/useAIAgents';
import { useUIStore } from '../store/useUIStore';

const AIManagerPanel = React.memo(() => {
  const [chatInput, setChatInput] = useState('');
  const { producerHistory, mascotHistory, isLoadingAi, handleAgentInteraction, requestMascotHelp } = useAIAgents();
  const { mascotAlert } = useUIStore();
  
  const producerEndRef = useRef(null);
  const mascotEndRef = useRef(null);

  useEffect(() => {
    producerEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [producerHistory]);

  useEffect(() => {
    mascotEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mascotHistory]);

  return (
    <aside style={{
      width: '280px',
      backgroundColor: 'var(--c-base)',
      borderRight: '1px solid var(--c-border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '16px',
        fontSize: '11px',
        fontWeight: '600',
        color: 'var(--c-text-2)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        borderBottom: '1px solid var(--c-border)'
      }}>
        AI_MANAGEMENT_CONSOLE
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', gap: '16px', overflowY: 'hidden' }}>
        
        {/* MACRO PRODUCER */}
        <div style={{
          flex: 1,
          backgroundColor: 'var(--c-surface)',
          border: '1px solid var(--c-border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '8px', fontSize: '10px', color: 'var(--c-text-3)', fontFamily: 'var(--font-mono)', borderBottom: '1px solid var(--c-border)' }}>
            [MACRO_PRODUCER_INTERFACE]
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#121214' }}>
            {producerHistory && producerHistory.length > 0 ? producerHistory.map((msg, i) => (
              <div key={i} style={{ 
                backgroundColor: '#222226', 
                padding: '8px', 
                fontFamily: 'var(--font-mono)', 
                fontSize: '10px', 
                color: msg.sender === 'user' ? 'var(--c-text-1)' : 'var(--c-text-2)' 
              }}>
                <span style={{ color: 'var(--c-text-3)' }}>[{msg.sender.toUpperCase()}]: </span>
                {msg.message}
              </div>
            )) : (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--c-text-3)' }}>{"// NO_HISTORY"}</div>
            )}
            <div ref={producerEndRef} />
          </div>
          <div style={{ padding: '8px', borderTop: '1px solid var(--c-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if(e.key === 'Enter') {
                  handleAgentInteraction('producer', chatInput);
                  setChatInput('');
                }
              }}
              placeholder="ENTER_COMMAND..."
              style={{
                width: '100%',
                backgroundColor: '#121214',
                border: '1px solid var(--c-border)',
                color: 'var(--c-text-1)',
                padding: '6px 8px',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                outline: 'none'
              }}
            />
            <button 
              onClick={() => {
                handleAgentInteraction('producer', chatInput);
                setChatInput('');
              }}
              disabled={isLoadingAi}
              style={{
                width: '100%',
                padding: '6px',
                backgroundColor: 'var(--c-elevated)',
                border: '1px solid var(--c-border)',
                color: 'var(--c-text-1)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                cursor: isLoadingAi ? 'wait' : 'pointer'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--c-surface)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--c-elevated)'}
            >
              SEND_COMMAND
            </button>
          </div>
        </div>

        {/* MICRO MASCOT */}
        <div style={{
          flex: 1,
          backgroundColor: 'var(--c-surface)',
          border: '1px solid var(--c-border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '8px', fontSize: '10px', color: 'var(--c-text-3)', fontFamily: 'var(--font-mono)', borderBottom: '1px solid var(--c-border)' }}>
            [CONTEXTUAL_HARMONIC_ANALYZER]
          </div>
          <div style={{ padding: '8px', borderBottom: '1px solid var(--c-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {mascotAlert ? (
              <>
                <div style={{ fontSize: '10px', color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
                  SYSTEM_STATUS: CRITICAL_ANOMALY_DETECTED
                </div>
                <div style={{ fontSize: '10px', color: 'var(--c-text-2)', fontFamily: 'var(--font-mono)' }}>
                  {mascotAlert.message}
                </div>
                <div style={{ fontSize: '9px', color: 'var(--c-text-3)', fontFamily: 'var(--font-mono)' }}>
                  [DELTA]: {JSON.stringify(mascotAlert.delta)}
                </div>
                <button 
                  onClick={requestMascotHelp}
                  style={{
                    marginTop: '8px',
                    width: '100%',
                    padding: '8px',
                    backgroundColor: '#3b82f6',
                    border: 'none',
                    color: '#fff',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    cursor: 'pointer'
                  }}
                >
                  INVOKE_AI_RESOLVER
                </button>
              </>
            ) : (
              <div style={{ fontSize: '10px', color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                {"SYSTEM_STATUS: NOMINAL // NO_ANOMALIES_DETECTED"}
              </div>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#121214' }}>
             {mascotHistory && mascotHistory.length > 0 ? mascotHistory.map((msg, i) => (
              <div key={i} style={{ 
                backgroundColor: '#222226', 
                padding: '8px', 
                fontFamily: 'var(--font-mono)', 
                fontSize: '10px', 
                color: msg.sender === 'user' ? 'var(--c-text-1)' : 'var(--c-text-2)' 
              }}>
                <span style={{ color: 'var(--c-text-3)' }}>[{msg.sender.toUpperCase()}]: </span>
                {msg.message}
              </div>
            )) : (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--c-text-3)' }}>{"// MICRO_AGENT_STANDBY"}</div>
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
