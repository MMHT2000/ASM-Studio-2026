import { create } from 'zustand';
import { Emulator, SAMPLE_PROGRAM } from '../lib/emulator';
import type { AsmError, CpuState, Program, StepResult } from '../lib/emulator';
import { useSettingsStore } from './settingsStore';

type EmulatorStatus = 'idle' | 'running' | 'animating' | 'paused' | 'halted' | 'error';

export interface HistoryEntry {
  cpu: CpuState;
  currentLine: number;
  status: EmulatorStatus;
  statusMessage: string;
}

interface EmulatorStore {
  // Source code in the editor
  source: string;
  setSource: (src: string) => void;

  // Assembled program
  program: Program | null;
  asmErrors: AsmError[];

  // CPU state snapshot (updated after each step)
  cpuSnapshot: CpuState | null;

  // Status
  status: EmulatorStatus;
  statusMessage: string;

  // Current execution line in source (1-based)
  currentLine: number;

  // Breakpoints: set of instruction indices with breakpoints
  breakpoints: Set<number>;

  // Time-travel history stack
  history: HistoryEntry[];
  canStepBack: boolean;

  // Animated execution settings
  animSpeedMs: number;
  setAnimSpeed: (ms: number) => void;

  // Actions
  assemble: () => void;
  step: () => void;
  stepBack: () => void;
  run: () => void;
  startAnimatedRun: () => void;
  pause: () => void;
  stop: () => void;
  reset: () => void;
  toggleBreakpoint: (instrIdx: number) => void;
  setInputBuffer: (s: string) => void;
  setMemoryByte: (addr: number, val: number) => void;
}

// Single Emulator instance shared across the store
const emu = new Emulator();
let animTimer: ReturnType<typeof setInterval> | null = null;

function clearAnimTimer() {
  if (animTimer !== null) {
    clearInterval(animTimer);
    animTimer = null;
  }
}

function snapshot(e: Emulator): CpuState {
  // Deep clone the CPU state so React re-renders reliably
  const c = e.cpu;
  return {
    ...c,
    regs: { ...c.regs },
    flags: { ...c.flags },
    mem: c.mem.slice() as Uint8Array,
    callStack: [...c.callStack],
    output: [...c.output],
    changedRegs: new Set(c.changedRegs),
    changedAddrs: new Set(c.changedAddrs),
    breakpoints: new Set(c.breakpoints),
    ioPorts: { ...c.ioPorts },
  };
}

export const useEmulatorStore = create<EmulatorStore>((set, get) => ({
  source: SAMPLE_PROGRAM,
  setSource: (src) => set({ source: src }),

  program: null,
  asmErrors: [],
  cpuSnapshot: null,
  status: 'idle',
  statusMessage: 'Ready. Press Assemble (F5) to compile.',
  currentLine: -1,
  breakpoints: new Set(),

  history: [],
  canStepBack: false,
  animSpeedMs: 100, // default 100ms per step (10 Hz)
  setAnimSpeed: (ms: number) => {
    set({ animSpeedMs: ms });
    if (get().status === 'animating') {
      get().startAnimatedRun();
    }
  },

  assemble: () => {
    clearAnimTimer();
    const { source } = get();
    const prog = emu.load(source);
    const errors = prog.errors;
    const hasErrors = errors.some(e => e.type === 'error');

    set({
      history: [],
      canStepBack: false,
      program: prog,
      asmErrors: errors,
      cpuSnapshot: snapshot(emu),
      status: hasErrors ? 'error' : 'paused',
      statusMessage: hasErrors
        ? `${errors.filter(e => e.type === 'error').length} error(s) — fix them and reassemble`
        : `Assembled OK. ${prog.instructions.length} instructions.`,
      currentLine: emu.currentLine,
    });
  },

  step: () => {
    if (!emu.isReady) {
      get().assemble();
      return;
    }
    // Save history entry before stepping
    const currentSnapshot = snapshot(emu);
    const lineBefore = emu.currentLine;
    const historyEntry: HistoryEntry = {
      cpu: currentSnapshot,
      currentLine: lineBefore,
      status: get().status === 'animating' ? 'paused' : get().status,
      statusMessage: get().statusMessage,
    };
    const maxHist = useSettingsStore.getState?.().historySize || 150;
    const nextHistory = [...get().history, historyEntry].slice(-maxHist);

    const result: StepResult = emu.step();
    const line = emu.currentLine;

    if (result.type === 'halt') {
      clearAnimTimer();
      set({
        history: nextHistory,
        canStepBack: true,
        cpuSnapshot: snapshot(emu),
        status: 'halted',
        statusMessage: `Program halted. Exit code: ${result.code}`,
        currentLine: -1,
      });
    } else if (result.type === 'error') {
      clearAnimTimer();
      set({
        history: nextHistory,
        canStepBack: true,
        cpuSnapshot: snapshot(emu),
        status: 'error',
        statusMessage: `Runtime error on line ${result.line}: ${result.msg}`,
        currentLine: result.line,
      });
    } else if (result.type === 'break') {
      clearAnimTimer();
      set({
        history: nextHistory,
        canStepBack: true,
        cpuSnapshot: snapshot(emu),
        status: 'paused',
        statusMessage: `Breakpoint hit at instruction ${result.ipIdx}`,
        currentLine: line,
      });
    } else {
      set({
        history: nextHistory,
        canStepBack: true,
        cpuSnapshot: snapshot(emu),
        status: get().status === 'animating' ? 'animating' : 'paused',
        statusMessage: `Step ${emu.cpu.stepCount}`,
        currentLine: line,
      });
    }
  },

  stepBack: () => {
    clearAnimTimer();
    const { history } = get();
    if (history.length === 0) return;
    const newHistory = [...history];
    const prev = newHistory.pop()!;
    emu.restoreCpu(prev.cpu);
    set({
      history: newHistory,
      canStepBack: newHistory.length > 0,
      cpuSnapshot: snapshot(emu),
      currentLine: prev.currentLine,
      status: 'paused',
      statusMessage: `Stepped back to step ${prev.cpu.stepCount}`,
    });
  },

  run: () => {
    clearAnimTimer();
    if (!emu.isReady) {
      get().assemble();
      if (!emu.isReady) return;
    }
    const currentSnapshot = snapshot(emu);
    const lineBefore = emu.currentLine;
    const historyEntry: HistoryEntry = {
      cpu: currentSnapshot,
      currentLine: lineBefore,
      status: get().status,
      statusMessage: get().statusMessage,
    };
    const maxHist = useSettingsStore.getState?.().historySize || 150;
    const nextHistory = [...get().history, historyEntry].slice(-maxHist);

    set({ status: 'running', statusMessage: 'Running fast…', history: nextHistory, canStepBack: true });

    setTimeout(() => {
      const stepLimit = useSettingsStore.getState?.().maxStepLimit || 100000;
      const result = emu.run(stepLimit);
      const line = emu.currentLine;

      if (result.type === 'halt') {
        set({
          cpuSnapshot: snapshot(emu),
          status: 'halted',
          statusMessage: `Halted. Exit code: ${result.code}`,
          currentLine: -1,
        });
      } else if (result.type === 'error') {
        set({
          cpuSnapshot: snapshot(emu),
          status: 'error',
          statusMessage: `Runtime error: ${result.msg} (line ${result.line})`,
          currentLine: result.line,
        });
      } else if (result.type === 'break') {
        set({
          cpuSnapshot: snapshot(emu),
          status: 'paused',
          statusMessage: `Breakpoint hit`,
          currentLine: line,
        });
      }
    }, 10);
  },

  startAnimatedRun: () => {
    if (!emu.isReady) {
      get().assemble();
      if (!emu.isReady) return;
    }
    if (emu.cpu.halted) {
      get().reset();
    }
    clearAnimTimer();
    set({ status: 'animating', statusMessage: 'Animating execution…' });

    const delay = get().animSpeedMs;
    animTimer = setInterval(() => {
      const { status } = get();
      if (status !== 'animating' || emu.cpu.halted) {
        clearAnimTimer();
        return;
      }
      get().step();
    }, delay);
  },

  pause: () => {
    clearAnimTimer();
    set({
      status: 'paused',
      statusMessage: 'Paused. Use Step or Run.',
    });
  },

  stop: () => {
    clearAnimTimer();
    emu.cpu.halted = true;
    set({
      cpuSnapshot: snapshot(emu),
      status: 'halted',
      statusMessage: 'Stopped by user.',
      currentLine: -1,
    });
  },

  reset: () => {
    clearAnimTimer();
    emu.reset();
    set({
      history: [],
      canStepBack: false,
      cpuSnapshot: snapshot(emu),
      status: 'paused',
      statusMessage: 'Reset. Press ▶ Animate, ⚡ Fast, or ⏭ Step.',
      currentLine: emu.currentLine,
    });
  },

  toggleBreakpoint: (instrIdx: number) => {
    emu.toggleBreakpoint(instrIdx);
    set({ breakpoints: new Set(emu.cpu.breakpoints) });
  },

  setInputBuffer: (s: string) => {
    emu.cpu.inputBuffer = s;
  },

  setMemoryByte: (addr: number, val: number) => {
    const validAddr = addr & 0xFFFF;
    const validVal = val & 0xFF;
    emu.cpu.mem[validAddr] = validVal;
    emu.cpu.changedAddrs.add(validAddr);
    set({
      cpuSnapshot: snapshot(emu),
      statusMessage: `Modified RAM: [0x${validAddr.toString(16).toUpperCase().padStart(4, '0')}] = 0x${validVal.toString(16).toUpperCase().padStart(2, '0')}`,
    });
  },
}));

