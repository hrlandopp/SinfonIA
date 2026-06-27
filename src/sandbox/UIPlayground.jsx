import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const SandboxLauncher = () => {
  const navigate = useNavigate();
  const [geminiKey, setGeminiKey] = useState('');

  const hasCredentials = geminiKey.trim() !== '';

  const recentProjects = [
    { id: 1, title: "CYBERPUNK_SCORE_ACT1", desc: "12 Tracks - 140 BPM" },
    { id: 2, title: "AMBIENT_DRONE_009", desc: "4 Tracks - 90 BPM" },
    { id: 3, title: "PODCAST_INTRO_MIX", desc: "8 Tracks - 120 BPM" },
    { id: 4, title: "DANCE_TRACK_REMIX_V2", desc: "24 Tracks - 128 BPM" },
    { id: 5, title: "VOICEOVER_CLEANUP", desc: "2 Tracks - No Tempo" },
  ];

  // Set html dark mode class
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 font-mono absolute top-0 left-0 w-full h-full">
      <div className="w-full max-w-5xl border border-border bg-card p-6 rounded-none shadow-2xl flex flex-col md:flex-row gap-8">
        
        <Tabs defaultValue="projects" className="w-full flex flex-col md:flex-row gap-8" orientation="vertical">
          {/* Menu Lateral Izquierdo */}
          <TabsList className="flex md:flex-col justify-start h-auto bg-transparent border-r-0 md:border-r border-border rounded-none p-0 w-full md:w-64 space-y-2">
            <div className="p-4 w-full">
              <h2 className="text-xs tracking-widest text-muted-foreground mb-4">PROJECT_LAUNCHER</h2>
              <Button 
                variant="outline" 
                className="w-full justify-start rounded-none border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                onClick={() => navigate('/studio')}
              >
                INITIALIZE_EMPTY_PROJECT
              </Button>
            </div>
            <TabsTrigger value="projects" className="w-full justify-start rounded-none data-[state=active]:bg-muted data-[state=active]:text-foreground text-xs px-4 py-3">
              RECENTS_&_TEMPLATES
            </TabsTrigger>
            <TabsTrigger value="config" className="w-full justify-start rounded-none data-[state=active]:bg-muted data-[state=active]:text-foreground text-xs px-4 py-3">
              CORE_SYSTEM_CONFIG
            </TabsTrigger>
          </TabsList>

          {/* Cuadricula Central (Proyectos) */}
          <div className="flex-1 w-full">
            <TabsContent value="projects" className="mt-0 h-full animate-in fade-in duration-500">
              <div className="flex flex-col h-full">
                <h3 className="text-sm tracking-widest text-muted-foreground mb-4 border-b border-border pb-2">ENGINE_PROJECTS</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-2" style={{ maxHeight: '400px' }}>
                  {recentProjects.map((proj) => (
                    <Card key={proj.id} className="rounded-none cursor-pointer hover:bg-muted transition-colors border-border bg-background">
                      <CardHeader>
                        <CardTitle className="text-sm text-primary">{proj.title}</CardTitle>
                        <CardDescription className="text-xs">{proj.desc}</CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Cuadricula Central (Config) */}
            <TabsContent value="config" className="mt-0 h-full animate-in fade-in duration-500">
              <div className="flex flex-col h-full max-w-md">
                <h3 className="text-sm tracking-widest text-muted-foreground mb-4 border-b border-border pb-2">API_CREDENTIALS</h3>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">GEMINI_API_KEY</label>
                    <Input 
                      type="password" 
                      placeholder="AIza..." 
                      className="rounded-none border-border bg-background focus-visible:ring-1 focus-visible:ring-primary"
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                    />
                  </div>

                  <div className="mt-8 p-4 border border-border bg-background flex items-center transition-all duration-300">
                    <div className={`w-2 h-2 mr-3 transition-colors ${hasCredentials ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                    <span className={`text-xs transition-colors ${hasCredentials ? 'text-emerald-500' : 'text-zinc-500'}`}>
                      {hasCredentials ? 'STATUS: CREDENTIALS_LOADED' : 'STATUS: AWAITING_AUTHENTICATION'}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

      </div>
    </div>
  );
};

const SandboxStudio = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 font-mono absolute top-0 left-0 w-full h-full">
      <div className="w-[80%] h-[80%] border border-border bg-card flex flex-col relative rounded-none shadow-2xl">
        <div className="absolute top-0 left-0 right-0 p-3 flex justify-end border-b border-border bg-muted/50">
          <Button 
            variant="destructive" 
            size="sm" 
            className="rounded-none text-xs"
            onClick={() => navigate('/')}
          >
            CLOSE_WORKSPACE
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <h2 className="text-lg tracking-[0.2em] text-primary animate-in fade-in zoom-in duration-500">
            STUDIO_WORKSPACE_LOADED
          </h2>
        </div>
      </div>
    </div>
  );
};

const UIPlayground = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SandboxLauncher />} />
        <Route path="/studio" element={<SandboxStudio />} />
      </Routes>
    </BrowserRouter>
  );
};

export default UIPlayground;