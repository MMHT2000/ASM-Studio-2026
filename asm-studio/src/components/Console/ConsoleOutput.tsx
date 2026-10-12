import { useRef, useEffect, useState } from 'react';
import { Terminal, Keyboard } from 'lucide-react';
import { useEmulatorStore } from '../../store/emulatorStore';

export default function ConsoleOutput() {
  const cpu          = useEmulatorStore(s => s.cpuSnapshot);
  const status       = useEmulatorStore(s => s.status);
  const inputMode    = useEmulatorStore(s => s.inputMode);
  const provideInput = useEmulatorStore(s => s.provideInput);
  const endRef   = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [lineText, setLineText] = useState('');

  const output  = cpu?.output ?? [];
  const waiting = status === 'input' && inputMode !== null;
  const exitMsg = status === 'halted'
    ? `\n[Program halted — exit code ${cpu?.exitCode ?? 0}]`
    : '';

  // Auto-scroll to bottom on new output
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output.length, waiting]);

  // Grab focus as soon as the program asks for input
  useEffect(() => {
    if (waiting) inputRef.current?.focus();
    else setLineText('');
  }, [waiting]);

  /** Single-keystroke mode (INT 21h AH=01h/07h/08h, INT 16h AH=00h). */
  const handleCharKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    let ch: string | null = null;
    if (e.key === 'Enter') ch = '\r';
    else if (e.key === 'Backspace') ch = '\b';
    else if (e.key === 'Tab') ch = '\t';
    else if (e.key === 'Escape') ch = '\x1b';
    else if (e.key.length === 1) ch = e.key;
    if (ch === null) return;
    e.preventDefault();
    provideInput(ch);
  };

  /** Buffered-line mode (INT 21h AH=0Ah). */
  const handleLineKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const text = lineText;
    setLineText('');
    provideInput(text + '\r');
  };

  // Lines before the prompt line, and the line the cursor sits on
  const lines    = output.length > 0 ? output : [''];
  const head     = waiting ? lines.slice(0, -1) : output;
  const lastLine = waiting ? lines[lines.length - 1] : '';

  return (
    <div
      className="flex flex-col h-full bg-editor-panel border-t border-editor-border"
      onClick={() => waiting && inputRef.current?.focus()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-editor-border">
        <div className="flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-editor-subtext" />
          <span className="text-editor-subtext text-xs font-semibold uppercase tracking-widest">
            Console Output
          </span>
        </div>
        {waiting ? (
          <span className="flex items-center gap-1 text-editor-amber text-[10px] font-semibold animate-pulse">
            <Keyboard className="w-3 h-3" />
            {inputMode === 'char' ? 'Press a key…' : 'Type input and press Enter…'}
          </span>
        ) : (
          <span className="text-editor-subtext text-[10px]">
            {output.filter(Boolean).length > 0
              ? `${output.filter(Boolean).length} line(s)`
              : ''}
          </span>
        )}
      </div>

      {/* Output area */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-sm">
        {output.length === 0 && status !== 'halted' && !waiting ? (
          <div className="text-editor-subtext text-xs">
            Program output will appear here when you run it…
          </div>
        ) : (
          <>
            {head.map((line, i) => (
              <div key={i} className="text-editor-green leading-relaxed whitespace-pre-wrap">
                {line || '\u00A0'}
              </div>
            ))}
            {waiting && (
              <div className="flex items-center text-editor-green leading-relaxed whitespace-pre-wrap">
                <span>{lastLine}</span>
                <input
                  ref={inputRef}
                  value={inputMode === 'line' ? lineText : ''}
                  onChange={e => inputMode === 'line' && setLineText(e.target.value)}
                  onKeyDown={inputMode === 'char' ? handleCharKey : handleLineKey}
                  aria-label={inputMode === 'char' ? 'Program is waiting for a key press' : 'Program input'}
                  spellCheck={false}
                  autoComplete="off"
                  className="flex-1 min-w-[2ch] bg-transparent outline-none border-none text-editor-amber caret-editor-amber font-mono text-sm p-0"
                />
              </div>
            )}
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
