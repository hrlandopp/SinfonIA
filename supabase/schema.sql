-- Esquema para la Base de Datos de Supabase - SinfonIA

-- Tabla de Proyectos (Canciones)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    tempo_bpm INTEGER DEFAULT 120,
    key_signature TEXT DEFAULT 'C', -- Ej: 'C', 'Am', 'G', 'Em'
    time_signature TEXT DEFAULT '4/4',
    capo_position INTEGER DEFAULT 0, -- Posición del capotraste (0 = sin capo)
    mood TEXT DEFAULT 'Neutral',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Secciones de la Canción (Intro, Verso, Coro, etc.)
CREATE TABLE IF NOT EXISTS sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Ej: 'Intro', 'Verso 1', 'Coro'
    order_index INTEGER NOT NULL, -- Orden de las secciones
    chords JSONB DEFAULT '[]'::jsonb, -- Ej: [{"chord": "Am", "beats": 4}, {"chord": "F", "beats": 4}]
    melody JSONB DEFAULT '[]'::jsonb, -- Opcional: Arreglo de notas
    accompaniment JSONB DEFAULT '{"piano": "arpeggio", "bass": "roots", "drums": "basic"}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla del Historial del Chat con el Productor de IA
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'assistant')),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- --- IMPORTANTE PARA EVITAR BLOQUEOS DE PERMISOS (RLS) ---
-- Deshabilitamos el Row Level Security (RLS) para simplificar este prototipo personal
-- Esto permite que tu cliente web lea y escriba sin requerir sistemas de autenticación complejos.
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE sections DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history DISABLE ROW LEVEL SECURITY;
