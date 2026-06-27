import React, { useState, useEffect, useRef } from 'react';
import { useUIStore } from '../../store/useUIStore';

const FloatingMascot = () => {
  const { mascotAlert } = useUIStore();
  const [position, setPosition] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [isFleeing, setIsFleeing] = useState(false);
  const [flipX, setFlipX] = useState(false); // To face the direction of movement
  
  const mousePos = useRef({ x: 0, y: 0 });
  const targetPos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const currentPos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    
    const pickNewTarget = () => {
      const padding = 100;
      targetPos.current = {
        x: Math.random() * (window.innerWidth - padding * 2) + padding,
        y: Math.random() * (window.innerHeight - padding * 2) + padding
      };
    };

    // Pick a new target location every 4 seconds to wander around
    const interval = setInterval(pickNewTarget, 4000);

    let animationFrameId;
    
    const updatePosition = () => {
      const dxMouse = mousePos.current.x - currentPos.current.x;
      const dyMouse = mousePos.current.y - currentPos.current.y;
      const distanceToMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
      
      let speed = 0.5; // Velocidad de caminata normal
      let fleeing = false;

      // Si el mouse se acerca a menos de 150px, escapar
      if (distanceToMouse < 150) {
        fleeing = true;
        speed = 4; // Velocidad de escape
        
        // Calcular ángulo opuesto al mouse
        const angle = Math.atan2(dyMouse, dxMouse);
        
        // Empujar el target en la dirección opuesta al mouse
        targetPos.current.x = currentPos.current.x - Math.cos(angle) * 300;
        targetPos.current.y = currentPos.current.y - Math.sin(angle) * 300;
        
        // Limitar dentro de la pantalla (con margen)
        targetPos.current.x = Math.max(50, Math.min(window.innerWidth - 50, targetPos.current.x));
        targetPos.current.y = Math.max(50, Math.min(window.innerHeight - 50, targetPos.current.y));
      }

      setIsFleeing(fleeing);

      // Calcular dirección de movimiento para voltear el emoji
      const dxTarget = targetPos.current.x - currentPos.current.x;
      if (Math.abs(dxTarget) > 1) { // Solo actualizar si realmente se mueve
        setFlipX(dxTarget < 0);
      }

      // Lerp (Interpolación Lineal) suave hacia el target
      currentPos.current.x += (targetPos.current.x - currentPos.current.x) * (speed * 0.015);
      currentPos.current.y += (targetPos.current.y - currentPos.current.y) * (speed * 0.015);

      setPosition({ x: currentPos.current.x, y: currentPos.current.y });

      animationFrameId = requestAnimationFrame(updatePosition);
    };

    updatePosition();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(interval);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Determinar el emoji según el estado
  const currentEmoji = mascotAlert ? '🙀' : '🐱';

  return (
    <div 
      className="fixed z-50 pointer-events-none select-none text-3xl"
      style={{ 
        left: position.x, 
        top: position.y,
        transform: `translate(-50%, -50%) scaleX(${flipX ? -1 : 1})`,
        opacity: mascotAlert ? 1 : 0.8,
        filter: isFleeing 
          ? 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.6))' 
          : mascotAlert 
            ? 'drop-shadow(0 0 15px rgba(239, 68, 68, 0.8))' // Alerta en rojo
            : 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.2))',
        transition: 'filter 0.3s ease-out, opacity 0.3s ease-out'
      }}
      title="Mascota Asistente"
    >
      <div className={mascotAlert ? 'animate-ping duration-300' : isFleeing ? 'animate-bounce' : 'animate-pulse'}>
        {currentEmoji}
      </div>
    </div>
  );
};

export default FloatingMascot;
