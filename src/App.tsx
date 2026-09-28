import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { CommandPalette } from './components/CommandPalette';
import { QueuePage } from './pages/QueuePage';
import { WorkspacePage } from './pages/WorkspacePage';
import { api } from './api';

export default function App() {
  const [incidentsInMemory, setIncidentsInMemory] = useState<number>(38);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    api.getMemoryStats().then((stats) => {
      setIncidentsInMemory(stats.incidents_in_memory);
    }).catch(() => {});
  }, []);

  const handleMemoryUpdate = (newTotal: number) => {
    setIncidentsInMemory(newTotal);
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-row font-jetbrains text-[14px]">
        {/* Left Navigation Rail (Screenshots 1 & 2) */}
        <Sidebar incidentsCount={incidentsInMemory} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header
            incidentsInMemory={incidentsInMemory}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          />

          <main className="flex-1 overflow-x-hidden">
            <Routes>
              <Route path="/" element={<QueuePage />} />
              <Route
                path="/incidents/:id"
                element={<WorkspacePage onMemoryUpdate={handleMemoryUpdate} />}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>

        {/* Cmd+K Command Palette */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
        />
      </div>
    </BrowserRouter>
  );
}
