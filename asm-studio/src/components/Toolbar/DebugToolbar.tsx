import { useEffect } from 'react';
import { 
  Play, Pause, Square, ChevronLeft, ChevronRight, RotateCcw, 
  Cpu, AlertCircle, CheckCircle, Loader2, PauseCircle, Zap, Gauge, Settings as SettingsIcon,
  Coffee
} from 'lucide-react';
import { useEmulatorStore } from '../../store/emulatorStore';
import { useSettingsStore } from '../../store/settingsStore';
import SampleSelector from './SampleSelector';
import FileMenu from './FileMenu';

const STATUS_ICONS = {
  idle:      <Cpu         className="w-3.5 h-3.5 text-editor-subtext" />,
  paused:    <PauseCircle className="w-3.5 h-3.5 text-editor-amber" />,
  animating: <Loader2     className="w-3.5 h-3.5 text-editor-cyan animate-spin" />,
  running:   <Loader2     className="w-3.5 h-3.5 text-editor-green animate-spin" />,
  halted:    <CheckCircle className="w-3.5 h-3.5 text-editor-green" />,
  error:     <AlertCircle className="w-3.5 h-3.5 text-editor-red" />,
};

export default function DebugToolbar() {
  const status           = useEmulatorStore(s => s.status);
  const statusMessage    = useEmulatorStore(s => s.statusMessage);
  const stepCount        = useEmulatorStore(s => s.cpuSnapshot?.stepCount ?? 0);
  const canStepBack      = useEmulatorStore(s => s.canStepBack);
  const historyCount     = useEmulatorStore(s => s.history.length);
  const animSpeedMs      = useEmulatorStore(s => s.animSpeedMs);
  const setAnimSpeed     = useEmulatorStore(s => s.setAnimSpeed);

  const openSettings     = useSettingsStore(s => s.openSettings);
  const toggleSettings   = useSettingsStore(s => s.toggleSettings);

  const assemble         = useEmulatorStore(s => s.assemble);
  const stepAction       = useEmulatorStore(s => s.step);
  const stepBackAction   = useEmulatorStore(s => s.stepBack);
  const runAction        = useEmulatorStore(s => s.run);
  const startAnimatedRun = useEmulatorStore(s => s.startAnimatedRun);
  const pauseAction      = useEmulatorStore(s => s.pause);
  const stopAction       = useEmulatorStore(s => s.stop);
  const resetAction      = useEmulatorStore(s => s.reset);

  const isAnimating = status === 'animating';
  const isRunning   = status === 'running' || isAnimating;
  const isHalted    = status === 'halted';
  const isIdle      = status === 'idle';

  // Global hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in a modal or non-editor input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        toggleSettings();
      } else if (e.key === 'F5') {
        e.preventDefault();
        assemble();
      } else if (e.key === 'F10' && !e.shiftKey) {
        e.preventDefault();
        if (!isRunning && !isHalted) stepAction();
      } else if ((e.key === 'F10' && e.shiftKey) || e.key === 'F8') {
        e.preventDefault();
        if (canStepBack && !isRunning) stepBackAction();
      } else if (e.key === 'F6') {
        e.preventDefault();
        if (isAnimating) {
          pauseAction();
        } else if (!isHalted && !isIdle) {
          startAnimatedRun();
        }
      } else if (e.key === 'F7') {
        e.preventDefault();
        if (!isRunning && !isHalted && !isIdle) runAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [assemble, stepAction, stepBackAction, runAction, startAnimatedRun, pauseAction, toggleSettings, isRunning, isAnimating, isHalted, isIdle, canStepBack]);

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 bg-editor-panel border-b border-editor-border select-none flex-wrap sm:flex-nowrap">
      {/* Brand */}
      <div className="flex items-center gap-1.5 mr-2 shrink-0">
        <img 
          src="/logo.png" 
          alt="ASM Studio" 
          className="h-5 w-auto object-contain rounded-xs" 
          onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
        />
        <span className="text-editor-accent font-bold text-sm tracking-wide">ASM Studio</span>
        <span className="text-editor-subtext text-xs">8086</span>
      </div>

      {/* File & Share Menu */}
      <FileMenu />

      {/* Samples Dropdown */}
      <SampleSelector />

      {/* Separator */}
      <div className="w-px h-5 bg-editor-border mx-1 shrink-0" />

      {/* Assemble button */}
      <ToolButton
        onClick={assemble}
        title="Assemble & Load (F5)"
        className="bg-editor-accent/20 hover:bg-editor-accent/40 text-editor-accent border border-editor-accent/30 font-medium"
        disabled={isRunning}
      >
        <span>⚙ Assemble</span>
        <kbd className="ml-0.5 text-[10px] opacity-60">F5</kbd>
      </ToolButton>

      {/* Separator */}
      <div className="w-px h-5 bg-editor-border mx-1 shrink-0" />

      {/* Animate / Pause */}
      {isAnimating ? (
        <ToolButton
          onClick={pauseAction}
          title="Pause execution (F6)"
          className="bg-editor-amber/20 hover:bg-editor-amber/30 text-editor-amber border border-editor-amber/30 font-medium"
        >
          <Pause className="w-3.5 h-3.5" />
          <span>Pause</span>
          <kbd className="ml-0.5 text-[10px] opacity-60">F6</kbd>
        </ToolButton>
      ) : (
        <ToolButton
          onClick={startAnimatedRun}
          title="Animate step-by-step (F6)"
          disabled={isRunning || isHalted || isIdle}
          className="hover:bg-editor-green/20 text-editor-green font-medium"
        >
          <Play className="w-3.5 h-3.5" />
          <span>Animate</span>
          <kbd className="ml-0.5 text-[10px] opacity-60">F6</kbd>
        </ToolButton>
      )}

      {/* Speed Selector */}
      <div className="flex items-center gap-1 bg-editor-bg/80 border border-editor-border rounded px-1.5 py-0.5 text-xs text-editor-subtext" title="Stepping frequency">
        <Gauge className="w-3 h-3 text-editor-accent" />
        <select
          value={animSpeedMs}
          onChange={(e) => setAnimSpeed(Number(e.target.value))}
          className="bg-transparent text-editor-text text-xs focus:outline-none cursor-pointer"
        >
          <option value={1000} className="bg-editor-panel">1 Hz (1s)</option>
          <option value={400}  className="bg-editor-panel">2.5 Hz (400ms)</option>
          <option value={200}  className="bg-editor-panel">5 Hz (200ms)</option>
          <option value={100}  className="bg-editor-panel">10 Hz (100ms)</option>
          <option value={40}   className="bg-editor-panel">25 Hz (40ms)</option>
          <option value={15}   className="bg-editor-panel">60 Hz (15ms)</option>
        </select>
      </div>

      {/* Fast Run */}
      <ToolButton
        onClick={runAction}
        title="Fast Run to Halt / Breakpoint (F7)"
        disabled={isRunning || isHalted || isIdle}
        className="hover:bg-editor-cyan/20 text-editor-cyan"
      >
        <Zap className="w-3.5 h-3.5" />
        <span>Fast</span>
        <kbd className="ml-0.5 text-[10px] opacity-60">F7</kbd>
      </ToolButton>

      {/* Separator */}
      <div className="w-px h-5 bg-editor-border mx-1 shrink-0" />

      {/* Step Back (Time-Travel) */}
      <ToolButton
        onClick={stepBackAction}
        title="Step backward / Undo instruction (Shift+F10 / F8)"
        disabled={!canStepBack || isRunning}
        className="hover:bg-editor-peach/20 text-editor-peach disabled:opacity-30"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        <span>Step Back</span>
        {historyCount > 0 && (
          <span className="text-[10px] bg-editor-bg/90 px-1 py-0.5 rounded text-editor-subtext font-mono">
            {historyCount}
          </span>
        )}
      </ToolButton>

      {/* Step Forward */}
      <ToolButton
        onClick={stepAction}
        title="Step one instruction forward (F10)"
        disabled={isRunning || isHalted || isIdle}
        className="hover:bg-editor-amber/20 text-editor-amber"
      >
        <span>Step</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <kbd className="ml-0.5 text-[10px] opacity-60">F10</kbd>
      </ToolButton>

      {/* Stop */}
      <ToolButton
        onClick={stopAction}
        title="Stop execution"
        disabled={!isRunning && !isHalted}
        className="hover:bg-editor-red/20 text-editor-red"
      >
        <Square className="w-3.5 h-3.5" />
        <span>Stop</span>
      </ToolButton>

      {/* Reset */}
      <ToolButton
        onClick={resetAction}
        title="Reset CPU state & history"
        disabled={isRunning}
        className="hover:bg-editor-mauve/20 text-editor-mauve"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>Reset</span>
      </ToolButton>

      {/* Separator */}
      <div className="w-px h-5 bg-editor-border mx-1 shrink-0" />

      {/* Status indicator */}
      <div className="flex items-center gap-1.5 text-xs overflow-hidden">
        {STATUS_ICONS[status]}
        <span className={`truncate max-w-[260px] ${
          status === 'error'     ? 'text-editor-red' :
          status === 'halted'    ? 'text-editor-green' :
          status === 'paused'    ? 'text-editor-amber' :
          status === 'animating' ? 'text-editor-cyan' :
          status === 'running'   ? 'text-editor-green' :
          'text-editor-subtext'
        }`}>
          {statusMessage}
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Step counter */}
      {stepCount > 0 && (
        <div className="text-xs text-editor-subtext font-mono shrink-0">
          Steps: <span className="text-editor-accent font-semibold">{stepCount}</span>
        </div>
      )}

      {/* Buy Me a Coffee Button */}
      <a
        href="https://buymeacoffee.com/MMHT2000"
        target="_blank"
        rel="noopener noreferrer"
        title="Support MMHT2000 on Buy Me a Coffee"
        className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition shrink-0 cursor-pointer"
      >
        <Coffee className="w-3.5 h-3.5 text-amber-400" />
        <span className="hidden md:inline font-medium text-xs">Buy Me a Coffee</span>
      </a>

      {/* Settings Button */}
      <button
        onClick={openSettings}
        title="Settings & Preferences (Ctrl+,)"
        className="flex items-center gap-1 px-2 py-1 rounded text-xs text-editor-subtext hover:text-editor-text hover:bg-editor-surface/80 border border-editor-border/50 transition ml-2 shrink-0 cursor-pointer"
      >
        <SettingsIcon className="w-3.5 h-3.5 text-editor-subtext" />
        <span className="hidden sm:inline text-xs">Settings</span>
      </button>
    </div>
  );
}

function ToolButton({
  onClick, title, children, disabled = false, className = ''
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

