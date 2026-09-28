import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface LogViewerProps {
  logs: string;
  title?: string;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  logs,
  title = 'STDOUT / STDERR',
}) => {
  const [copied, setCopied] = useState(false);
  const lines = logs.trim().split('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="rounded-[5px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-hidden font-jetbrains text-[13px] shadow-2xs">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-subtle)] border-b border-[var(--border-hairline)] text-[12px] text-[var(--text-muted)]">
        <span className="font-semibold uppercase tracking-wider truncate mr-2 text-[11px] text-[var(--text-dim)]">
          {title}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors shrink-0 text-[12px] font-medium"
          title="Copy logs"
        >
          {copied ? <Check size={13} className="text-[var(--sem-green)]" /> : <Copy size={13} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      <div className="overflow-x-auto p-2.5 max-h-[300px] overflow-y-auto">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((rawLine, idx) => {
              let line = rawLine;
              let customLineNum = idx + 1;
              const match = rawLine.match(/^(\d+)\s+(.*)$/);
              if (match) {
                customLineNum = parseInt(match[1], 10);
                line = match[2];
              }

              const isError =
                line.includes('ERROR') ||
                line.includes('FATAL') ||
                line.includes('CRITICAL') ||
                line.includes('OOMKilled') ||
                line.includes('504') ||
                line.includes('CKR_');
              const isWarn = line.includes('WARN');

              let rowClass = 'hover:bg-[var(--bg-subtle)] text-[var(--text-primary)]';
              let lineNumClass = 'text-[var(--text-dim)]';

              if (isError) {
                rowClass = 'bg-[var(--sem-red-bg)] text-[var(--sem-red)] font-medium';
                lineNumClass = 'text-[var(--sem-red)] font-bold';
              } else if (isWarn) {
                rowClass = 'bg-[var(--sem-amber-bg)] text-[var(--sem-amber)]';
                lineNumClass = 'text-[var(--sem-amber)]';
              }

              return (
                <tr key={idx} className={`${rowClass} transition-colors leading-[22px]`}>
                  <td
                    className={`select-none pr-3 pl-1 text-right whitespace-nowrap text-[12px] tabular-nums ${lineNumClass} w-8`}
                  >
                    {customLineNum}
                  </td>
                  <td className="whitespace-pre font-jetbrains select-text break-all text-[12px]">
                    {line}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
