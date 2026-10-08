import { useEmulatorStore } from '../../store/emulatorStore';
import { useSettingsStore } from '../../store/settingsStore';
import { Cpu, CheckCircle2, AlertCircle, Loader2, PauseCircle, Sparkles, Settings as SettingsIcon } from 'lucide-react';

export default function StatusBar() {
  const status        = useEmulatorStore(s => s.status);
  const statusMessage = useEmulatorStore(s => s.statusMessage);
  const cpu           = useEmulatorStore(s => s.cpuSnapshot);
  const errors        = useEmulatorStore(s => s.asmErrors.filter(e => e.type === 'error').length);
  const aiProvider    = useSettingsStore(s => s.aiProvider);
  const openSettings  = useSettingsStore(s => s.openSettings);

  const ipHex = (cpu?.regs.IP ?? 0).toString(16).toUpperCase().padStart(4, '0');
  const spHex = (cpu?.regs.SP ?? 0xFFFE).toString(16).toUpperCase().padStart(4, '0');
  const stepCount = cpu?.stepCount ?? 0;

  return (
    <footer className="h-6 bg-editor-panel border-t border-editor-border flex items-center justify-between px-3 text-[11px] text-editor-subtext select-none shrink-0 z-10">
      {/* Left: Status & CPU State */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-1.5 truncate">
          {status === 'running' || status === 'animating' ? (
            <Loader2 className="w-3 h-3 text-editor-green animate-spin shrink-0" />
          ) : status === 'paused' ? (
            <PauseCircle className="w-3 h-3 text-editor-amber shrink-0" />
          ) : status === 'halted' ? (
            <CheckCircle2 className="w-3 h-3 text-editor-green shrink-0" />
          ) : status === 'error' ? (
            <AlertCircle className="w-3 h-3 text-editor-red shrink-0" />
          ) : (
            <Cpu className="w-3 h-3 text-editor-accent shrink-0" />
          )}
          <span className={`truncate ${
            status === 'error' ? 'text-editor-red font-medium' :
            status === 'halted' ? 'text-editor-green' :
            status === 'running' || status === 'animating' ? 'text-editor-cyan' :
            'text-editor-text'
          }`}>
            {statusMessage || 'Ready'}
          </span>
        </div>

        {errors > 0 && (
          <span className="flex items-center gap-1 text-editor-red bg-editor-red/10 px-1.5 py-0.2 rounded text-[10px] font-semibold">
            <AlertCircle className="w-2.5 h-2.5" />
            {errors} {errors === 1 ? 'Error' : 'Errors'}
          </span>
        )}

        <div className="hidden md:flex items-center gap-2 border-l border-editor-border/60 pl-3 font-mono text-[10px] text-editor-subtext/80">
          <span>IP: <strong className="text-editor-accent font-normal">{ipHex}h</strong></span>
          <span>SP: <strong className="text-editor-text font-normal">{spHex}h</strong></span>
          <span>Steps: <strong className="text-editor-amber font-normal">{stepCount}</strong></span>
        </div>
      </div>

      {/* Right: Architecture, AI & Settings */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="hidden sm:inline hover:text-editor-text transition cursor-default">
          Intel 8086 Real Mode
        </span>

        <span className="hidden lg:inline border-l border-editor-border/60 pl-3 hover:text-editor-text transition cursor-default">
          MASM 16-Bit
        </span>

        <span className="flex items-center gap-1 border-l border-editor-border/60 pl-3 text-editor-accent/90">
          <Sparkles className="w-2.5 h-2.5" />
          <span className="capitalize">{aiProvider} AI</span>
        </span>

        <button
          onClick={openSettings}
          title="Settings (Ctrl+,)"
          className="flex items-center gap-1 hover:text-editor-text transition cursor-pointer border-l border-editor-border/60 pl-2"
        >
          <SettingsIcon className="w-3 h-3" />
        </button>
      </div>
    </footer>
  );
}
