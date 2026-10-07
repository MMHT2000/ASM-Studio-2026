import { useRef, useEffect } from 'react';
import { Terminal, Trash2 } from 'lucide-react';
import { useEmulatorStore } from '../../store/emulatorStore';

export default function ConsoleOutput() {
  const cpu    = useEmulatorStore(s => s.cpuSnapshot);
  const status = useEmulatorStore(s => s.status);
  const endRef = useRef<HTMLDivElement>(null);

  const output  = cpu?.output ?? [];
  const exitMsg = status === 'halted'
    ? `\n[Program halted — exit code ${cpu?.exitCode ?? 0}]`
    : '';

  // Auto-scroll to bottom on new output
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output.length]);

  return (
    <div className="flex flex-col h-full bg-editor-panel border-t border-editor-border">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-editor-border">
        <div className="flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-editor-subtext" />
          <span className="text-editor-subtext text-xs font-semibold uppercase tracking-widest">
            Console Output
          </span>
        </div>
        <span className="text-editor-subtext text-[10px]">
          {output.filter(Boolean).length > 0
            ? `${output.filter(Boolean).length} line(s)`
            : ''}
        </span>
      </div>

      {/* Output area */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-sm">
        {output.length === 0 && status !== 'halted' ? (
          <div className="text-editor-subtext text-xs">
            Program output will appear here when you run it…
          </div>
        ) : (
          <>
            {output.map((line, i) => (
              <div key={i} className="text-editor-green leading-relaxed whitespace-pre-wrap">
                {line || '\u00A0'}
              </div>
            ))}
            {exitMsg && (
              <div className="text-editor-subtext text-xs mt-2 border-t border-editor-border pt-2">
                {exitMsg}
              </div>
            )}
          </>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

