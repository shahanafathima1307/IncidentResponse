import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-border-hairline py-6 bg-background mt-auto">
      <div className="max-w-6xl mx-auto px-6 md:px-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-secondary">
        <div className="flex items-center gap-2">
          <span className="text-primary font-medium">Incident Response</span>
          <span>—</span>
          <span>Calm, context-rich investigation</span>
        </div>
        <div className="flex items-center gap-4 font-mono text-[11px]">
          <span>All systems normal</span>
          <span className="w-1 h-1 rounded-full bg-border-hairline"></span>
          <span>Version 4.19</span>
        </div>
      </div>
    </footer>
  );
};
