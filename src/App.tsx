import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { IncidentQueuePage } from './pages/IncidentQueuePage';
import { IncidentInvestigationPage } from './pages/IncidentInvestigationPage';
import { EngineerConfirmationPage } from './pages/EngineerConfirmationPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="bg-background font-sans text-on-surface antialiased min-h-screen flex flex-col justify-between selection:bg-[#E2DFC9] selection:text-[#111111]">
        <Navbar />
        <main className="w-full flex-grow flex flex-col">
          <Routes>
            <Route path="/" element={<IncidentQueuePage />} />
            <Route path="/queue" element={<IncidentQueuePage />} />
            <Route path="/incidents/:id" element={<IncidentInvestigationPage />} />
            <Route path="/investigate/:id" element={<IncidentInvestigationPage />} />
            <Route path="/incidents/:id/confirm" element={<EngineerConfirmationPage />} />
            <Route path="/confirm/:id" element={<EngineerConfirmationPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
