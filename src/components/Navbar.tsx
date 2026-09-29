import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const ok = await api.checkHealth();
      if (mounted) setIsConnected(ok);
    };
    check();
    const interval = setInterval(check, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const isQueue = location.pathname === '/' || location.pathname === '/queue';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#F7F6F2]/90 backdrop-blur-md border-b border-border-hairline">
      <div className="h-16 max-w-6xl mx-auto px-6 md:px-10 flex items-center justify-between">
        <div className="flex items-center gap-8 md:gap-12">
          <Link to="/" className="flex items-center gap-3 text-primary no-underline group">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center transition-transform group-hover:scale-105">
              <div className="w-2 h-2 rounded-full bg-background"></div>
            </div>
            <span className="font-medium text-[15px] tracking-tight text-primary">Incident Response</span>
          </Link>

          {/* Subtle Navigation Pills */}
          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all ${
                isQueue
                  ? 'bg-primary text-on-primary'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Incidents
            </Link>
            <span
              className="px-3.5 py-1 rounded-full text-xs font-medium text-secondary/70 cursor-default"
              title="Institutional Memory Bank"
            >
              Memory
            </span>
          </nav>
        </div>

        {/* Right Calm Status Dot */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? 'bg-status-resolved' : 'bg-status-open'
              }`}
            ></span>
            <span className="font-mono text-xs text-secondary">
              {isConnected ? 'Connected' : 'Offline'}
            </span>
          </div>
          <div className="w-7 h-7 rounded-full bg-surface-card border border-border-hairline flex items-center justify-center text-primary text-[11px] font-mono">
            JR
          </div>
        </div>
      </div>
    </header>
  );
};
