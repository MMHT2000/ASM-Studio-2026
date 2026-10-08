import { useEffect } from 'react';
import { 
  Play, Pause, Square, ChevronLeft, ChevronRight, RotateCcw, 
  Settings as SettingsIcon, Coffee, Zap, Gauge, PlayCircle, Loader2,
  CheckCircle2, AlertCircle, Cpu
} from 'lucide-react';
import { useEmulatorStore } from '../../store/emulatorStore';
import { useSettingsStore } from '../../store/settingsStore';
import SampleSelector from './SampleSelector';
import FileMenu from './FileMenu';

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
    <header className="h-11 bg-editor-panel border-b border-editor-border flex items-center justify-between px-3 gap-2 select-none shrink-0 z-20">
      {/* ── LEFT SECTION: Brand & Project ── */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-2 pr-2 border-r border-editor-border/60">
          <img 
            src="./icon.png" 
            alt="ASM Studio" 
            className="w-5 h-5 rounded-xs object-contain"
            onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
          />
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-xs tracking-wide text-editor-text">ASM Studio</span>
            <span className="text-[10px] font-mono text-editor-accent font-semibold">8086</span>
          </div>
        </div>

        {/* Project Menus */}
        <div className="flex items-center gap-1">
          <FileMenu />
          <SampleSelector />
        </div>
      </div>

      {/* ── CENTER SECTION: Organized Execution Control Deck ── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {/* Assemble Button */}
        <button
          onClick={assemble}
          title="Assemble code & load into memory (F5)"
          disabled={isRunning}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-editor-accent/15 hover:bg-editor-accent/25 text-editor-accent border border-editor-accent/35 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
        >
          <span>⚙</span>
          <span>Assemble</span>
          <kbd className="text-[9px] font-mono opacity-60 bg-editor-panel/80 px-1 py-0.2 rounded border border-editor-accent/20">F5</kbd>
        </button>

        {/* Playback & Speed Cluster */}
        <div className="inline-flex items-center rounded border border-editor-border bg-editor-surface/30 p-0.5 shadow-xs">
          {/* Animate / Pause */}
          {isAnimating ? (
            <button
              onClick={pauseAction}
              title="Pause execution (F6)"
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-editor-amber/20 text-editor-amber hover:bg-editor-amber/30 transition cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
              <kbd className="text-[9px] font-mono opacity-60 bg-editor-panel/70 px-1 py-0.2 rounded">F6</kbd>
            </button>
          ) : (
            <button
              onClick={startAnimatedRun}
              title="Animate instruction-by-instruction (F6)"
              disabled={isRunning || isHalted || isIdle}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-editor-green hover:bg-editor-green/15 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Animate</span>
              <kbd className="text-[9px] font-mono opacity-60 bg-editor-panel/70 px-1 py-0.2 rounded">F6</kbd>
            </button>
          )}

          {/* Speed Selector */}
          <div className="flex items-center gap-1 px-1.5 py-0.5 border-l border-editor-border/50 text-[11px] text-editor-subtext hover:text-editor-text transition" title="Emulation clock frequency">
            <Gauge className="w-3 h-3 text-editor-subtext" />
            <select
              value={animSpeedMs}
              onChange={(e) => setAnimSpeed(Number(e.target.value))}
              className="bg-transparent text-editor-text text-[11px] font-mono focus:outline-none cursor-pointer pr-1"
            >
              <option value={1000} className="bg-editor-panel">1 Hz</option>
              <option value={400}  className="bg-editor-panel">2.5 Hz</option>
              <option value={200}  className="bg-editor-panel">5 Hz</option>
              <option value={100}  className="bg-editor-panel">10 Hz</option>
              <option value={40}   className="bg-editor-panel">25 Hz</option>
              <option value={15}   className="bg-editor-panel">60 Hz</option>
            </select>
          </div>

          {/* Fast Run */}
          <button
            onClick={runAction}
            title="Fast execution until breakpoint or halt (F7)"
            disabled={isRunning || isHalted || isIdle}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-editor-cyan hover:bg-editor-cyan/15 border-l border-editor-border/50 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Fast</span>
            <kbd className="text-[9px] font-mono opacity-60 bg-editor-panel/70 px-1 py-0.2 rounded">F7</kbd>
          </button>
        </div>

        {/* Stepping Cluster (Segmented Control) */}
        <div className="inline-flex items-center rounded border border-editor-border bg-editor-surface/30 p-0.5 shadow-xs">
          {/* Step Back */}
          <button
            onClick={stepBackAction}
            title="Step back / Undo instruction (Shift+F10 / F8)"
            disabled={!canStepBack || isRunning}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-editor-peach hover:bg-editor-peach/15 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back</span>
            {historyCount > 0 && (
              <span className="text-[9px] font-mono bg-editor-panel/80 px-1 rounded text-editor-subtext font-semibold">
                {historyCount}
              </span>
            )}
          </button>

          {/* Step Forward */}
          <button
            onClick={stepAction}
            title="Step forward one instruction (F10)"
            disabled={isRunning || isHalted || isIdle}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-editor-amber hover:bg-editor-amber/15 border-l border-editor-border/50 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span>Step</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <kbd className="text-[9px] font-mono opacity-60 bg-editor-panel/70 px-1 py-0.2 rounded">F10</kbd>
          </button>
        </div>

        {/* Stop & Reset Cluster */}
        <div className="inline-flex items-center rounded border border-editor-border bg-editor-surface/30 p-0.5 shadow-xs">
          <button
            onClick={stopAction}
            title="Stop execution"
            disabled={!isRunning && !isHalted}
            className="p-1.5 rounded text-editor-red hover:bg-editor-red/15 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>

          <button
            onClick={resetAction}
            title="Reset CPU registers & memory state"
            disabled={isRunning}
            className="p-1.5 rounded text-editor-mauve hover:bg-editor-mauve/15 border-l border-editor-border/50 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── RIGHT SECTION: Status Pill, Coffee & Settings ── */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Status Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-editor-surface/40 border border-editor-border/60 text-xs">
          <span className={`w-2 h-2 rounded-full ${
            status === 'running' || status === 'animating' ? 'bg-editor-cyan animate-pulse' :
            status === 'halted' ? 'bg-editor-green' :
            status === 'paused' ? 'bg-editor-amber' :
            status === 'error' ? 'bg-editor-red' :
            'bg-editor-subtext/60'
          }`} />
          <span className="capitalize text-editor-text text-[11px] font-medium">
            {status}
          </span>
          {stepCount > 0 && (
            <span className="text-[10px] font-mono text-editor-subtext border-l border-editor-border/60 pl-1.5">
              {stepCount} steps
            </span>
          )}
        </div>

        {/* Buy Me a Coffee */}
        <a
          href="https://buymeacoffee.com/MMHT2000"
          target="_blank"
          rel="noopener noreferrer"
          title="Support the Creator on Buy Me a Coffee"
          className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition cursor-pointer shadow-xs"
        >
          <Coffee className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden xl:inline">Buy Coffee</span>
        </a>

        {/* Settings Button */}
        <button
          onClick={openSettings}
          title="Settings & Preferences (Ctrl+,)"
          className="flex items-center gap-1 p-1.5 rounded text-editor-subtext hover:text-editor-text hover:bg-editor-surface/60 border border-editor-border/60 transition cursor-pointer"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
