import { useState, useEffect } from 'react';
import AsmEditor from './components/Editor/AsmEditor';
import RegisterPanel from './components/CPU/RegisterPanel';
import FlagsPanel from './components/CPU/FlagsPanel';
import DebugToolbar from './components/Toolbar/DebugToolbar';
import ConsoleOutput from './components/Console/ConsoleOutput';
import MemoryView from './components/Memory/MemoryView';
import { useEmulatorStore } from './store/emulatorStore';
import type { AsmError } from './lib/emulator';
import { decodeSourceFromHash } from './lib/fileUtils';

import VirtualDevicesPanel from './components/Devices/VirtualDevicesPanel';
import AiTutorPanel from './components/AI/AiTutorPanel';
import SettingsModal from './components/Settings/SettingsModal';

type RightTab = 'registers' | 'memory' | 'devices';
type BottomTab = 'console' | 'errors' | 'ai';

export default function App() {
  const [rightTab, setRightTab]   = useState<RightTab>('registers');
  const [bottomTab, setBottomTab] = useState<BottomTab>('console');
  const asmErrors = useAsmErrors();
  const setSource = useEmulatorStore(s => s.setSource);
  const assemble  = useEmulatorStore(s => s.assemble);

  // Check URL hash for shared code or auto-assemble on start
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#code=')) {
      const codeParam = hash.slice(6);
      const decoded = decodeSourceFromHash(codeParam);
      if (decoded.trim()) {
        setSource(decoded);
      }
    }
    assemble();
  }, [setSource, assemble]);

  return (
    <div className="flex flex-col h-screen bg-editor-bg text-editor-text overflow-hidden">
      {/* Top toolbar */}
      <DebugToolbar />

      {/* Settings Modal */}
      <SettingsModal />

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Editor (left, ~60%) ───────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden border-r border-editor-border">
          {/* Editor takes ~70% of left column height */}
          <div style={{ flex: '7 1 0' }} className="min-h-0 overflow-hidden">
            <AsmEditor />
          </div>

          {/* Bottom tabs: Console | Errors | AI Tutor */}
          <div style={{ flex: bottomTab === 'ai' ? '4.5 1 0' : '3 1 0' }} className="min-h-0 flex flex-col border-t border-editor-border transition-all duration-200">
            <TabBar
              tabs={[
                { id: 'console', label: 'Console', badge: undefined },
                { id: 'errors',  label: 'Problems', badge: asmErrors > 0 ? asmErrors : undefined },
                { id: 'ai',      label: '✨ AI Tutor', badge: undefined },
              ]}
              active={bottomTab}
              onSelect={id => setBottomTab(id as BottomTab)}
            />
            <div className="flex-1 min-h-0 overflow-hidden">
              {bottomTab === 'console' && <ConsoleOutput />}
              {bottomTab === 'errors'  && <ErrorsPanel />}
              {bottomTab === 'ai'      && <AiTutorPanel />}
            </div>
          </div>
        </div>

        {/* ── Right panel (~40%) ─────────────────────────────────── */}
        <div className="flex flex-col w-84 min-w-[300px] max-w-[420px] overflow-hidden">
          {/* Tab switcher */}
          <TabBar
            tabs={[
              { id: 'registers', label: '⚙ Registers' },
              { id: 'memory',    label: '🗄 Memory' },
              { id: 'devices',   label: '🚦 Devices' },
            ]}
            active={rightTab}
            onSelect={id => setRightTab(id as RightTab)}
          />

          {rightTab === 'registers' && (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-hidden">
                <RegisterPanel />
              </div>
              {/* Flags always visible below registers */}
              <FlagsPanel />
            </div>
          )}
          {rightTab === 'memory' && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <MemoryView />
            </div>
          )}
          {rightTab === 'devices' && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <VirtualDevicesPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

function useAsmErrors() {
  return useEmulatorStore((s) => s.asmErrors.filter((e) => e.type === 'error').length);
}

function TabBar({ tabs, active, onSelect }: {
  tabs: { id: string; label: string; badge?: number }[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex bg-editor-panel border-b border-editor-border">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors duration-150 border-b-2 ${
            active === tab.id
              ? 'border-editor-accent text-editor-accent bg-editor-surface/30'
              : 'border-transparent text-editor-subtext hover:text-editor-text hover:bg-editor-surface/20'
          }`}
        >
          {tab.label}
          {tab.badge !== undefined && (
            <span className="bg-editor-red text-white rounded-full px-1.5 py-px text-[10px] font-bold leading-none">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function ErrorsPanel() {
  const errors = useEmulatorStore((s) => s.asmErrors);

  if (!errors || errors.length === 0) {
    return (
      <div className="p-4 text-editor-subtext text-xs flex items-center gap-2 h-full">
        <span className="text-editor-green">✓</span>
        No problems — code looks good!
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full p-2 space-y-1">
      {errors.map((err, i: number) => (
        <div
          key={i}
          className={`flex items-start gap-2 px-2 py-1.5 rounded text-xs font-mono ${
            err.type === 'error'
              ? 'bg-editor-red/10 text-editor-red border border-editor-red/20'
              : 'bg-editor-amber/10 text-editor-amber border border-editor-amber/20'
          }`}
        >
          <span className="mt-px">{err.type === 'error' ? '✖' : '⚠'}</span>
          <div>
            <span className="font-semibold">Line {err.line}: </span>
            {err.msg}
          </div>
        </div>
      ))}
    </div>
  );
}
