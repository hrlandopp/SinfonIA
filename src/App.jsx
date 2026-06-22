import React from 'react'

export default function App() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      width: '100vw',
      background: 'radial-gradient(circle at 50% -20%, #1e1b4b 0%, #09090b 70%)',
      color: '#fafafa',
      fontFamily: 'system-ui, sans-serif',
      textAlign: 'center',
      padding: '20px'
    }}>
      <span style={{ fontSize: '3rem' }}>🎸</span>
      <h1 style={{
        fontSize: '2.5rem',
        fontWeight: '800',
        background: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 50%, #a855f7 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        margin: '10px 0'
      }}>
        SinfonIA
      </h1>
      <p style={{ color: '#a1a1aa', maxWidth: '400px', fontSize: '1rem', lineHeight: '1.5' }}>
        Tu Productor Musical Inteligente y Co-Creador de Guitarra. El entorno se está configurando correctamente.
      </p>
      <div style={{
        marginTop: '20px',
        padding: '8px 16px',
        background: 'rgba(99, 102, 241, 0.1)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: '20px',
        fontSize: '0.85rem',
        color: '#6366f1'
      }}>
        🚀 Listo para desplegar en Vercel
      </div>
    </div>
  )
}
