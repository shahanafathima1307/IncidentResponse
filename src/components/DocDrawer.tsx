import React, { useEffect } from 'react';
import { X, Copy, Check, FileText } from 'lucide-react';
import { DocumentItem } from '../types';

interface DocDrawerProps {
  document: DocumentItem | null;
  onClose: () => void;
}

export const DocDrawer: React.FC<DocDrawerProps> = ({ document, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (document) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [document, onClose]);

  if (!document) return null;

  const handleCopyBody = () => {
    navigator.clipboard.writeText(document.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end font-jetbrains">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="relative w-full max-w-xl h-full bg-[var(--bg-surface)] border-l border-[var(--border-hairline)] flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-hairline)] flex items-start justify-between bg-[var(--bg-subtle)]">
          <div className="space-y-1 pr-4">
            <div className="flex items-center gap-2">
              <span className="font-jetbrains text-[13px] text-[var(--accent)] font-bold">{document.id}</span>
              <span className="text-[var(--text-dim)]">•</span>
              <span className="text-[12px] text-[var(--text-muted)] font-jetbrains">
                Used in {document.used_in_count} incidents
              </span>
            </div>
            <h2 className="text-[17px] font-bold text-[var(--text-primary)] leading-snug">
              {document.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            aria-label="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action bar */}
        <div className="px-4 py-2 bg-[var(--bg-surface)] border-b border-[var(--border-hairline)] flex items-center justify-between text-[13px] text-[var(--text-muted)]">
          <div className="flex items-center gap-1.5">
            <FileText size={15} className="text-[var(--accent)]" />
            <span className="font-medium">Standard Operating Procedure (SOP)</span>
          </div>
          <button
            onClick={handleCopyBody}
            className="flex items-center gap-1 px-2.5 py-1 rounded-[3px] border border-[var(--border-hairline)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] font-jetbrains text-[12px] transition-colors"
          >
            {copied ? <Check size={13} className="text-[var(--sem-green)]" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy runbook'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-[13px] font-jetbrains select-text">
          <div className="p-3 bg-[var(--bg-subtle)] rounded-[4px] border border-[var(--border-hairline)] text-[var(--text-muted)] text-[13px]">
            {document.excerpt}
          </div>

          <div className="whitespace-pre-wrap leading-relaxed bg-[var(--bg-subtle)] p-4 rounded-[5px] border border-[var(--border-hairline)] text-[var(--text-primary)] text-[13px]">
            {document.body}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)] flex items-center justify-between text-[12px] text-[var(--text-dim)]">
          <span className="font-jetbrains">Press Esc to dismiss</span>
          <button
            onClick={onClose}
            className="px-3 py-1 text-[12px] rounded-[3px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
