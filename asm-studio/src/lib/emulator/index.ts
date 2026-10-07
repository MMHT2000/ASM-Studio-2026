// ─── Emulator Facade ──────────────────────────────────────────────────────────
import { assemble } from './assembler';
import { step } from './executor';
import type { CpuState, Program, StepResult } from './types';
import { defaultFlags, defaultRegisters } from './types';

export { assemble, SAMPLE_PROGRAM } from './assembler';
export type { AsmError, CpuState, DataVar, Flags, Instruction, Program, Registers, StepResult } from './types';
export { getReg, setReg } from './executor';

export class Emulator {
  private prog: Program | null = null;
  public  cpu: CpuState;

  constructor() {
    this.cpu = this.makeInitialCpu();
  }

  private makeInitialCpu(): CpuState {
    return {
      regs: defaultRegisters(),
      flags: defaultFlags(),
      mem: new Uint8Array(65536),
      ipIdx: 0,
      callStack: [],
      halted: false,
      exitCode: 0,
      output: [],
      inputBuffer: '',
      changedRegs: new Set(),
      changedAddrs: new Set(),
      stepCount: 0,
      breakpoints: new Set(),
      ioPorts: {},
    };
  }

  /** Load & assemble source code. Returns any assembly errors. */
  load(source: string): Program {
    this.prog = assemble(source);
    this.reset(false);
    return this.prog;
  }

  /** Reset CPU state but keep the loaded program. */
  reset(keepProgram = true): void {
    const bp = new Set(this.cpu.breakpoints);
    this.cpu = this.makeInitialCpu();
    this.cpu.breakpoints = bp;
    if (keepProgram && this.prog) {
      // Pre-load initial data memory
      this.cpu.mem.set(this.prog.initialMem);
      this.cpu.regs.IP = this.prog.instructions[0]?.address ?? 0x0100;
    } else if (this.prog) {
      this.cpu.mem.set(this.prog.initialMem);
      this.cpu.regs.IP = this.prog.instructions[0]?.address ?? 0x0100;
    }
  }

  /** Restore CPU state from a snapshot (for time travel / step back). */
  restoreCpu(saved: CpuState): void {
    this.cpu = {
      ...saved,
      regs: { ...saved.regs },
      flags: { ...saved.flags },
      mem: saved.mem.slice() as Uint8Array,
      callStack: [...saved.callStack],
      output: [...saved.output],
      changedRegs: new Set(saved.changedRegs),
      changedAddrs: new Set(saved.changedAddrs),
      breakpoints: new Set(saved.breakpoints),
      ioPorts: { ...saved.ioPorts },
    };
  }

  /** Execute one instruction. Returns the step result. */
  step(): StepResult {
    if (!this.prog) return { type: 'error', msg: 'No program loaded', line: 0 };
    return step(this.cpu, this.prog);
  }

  /** Run until HLT, error, breakpoint, or maxSteps exceeded. */
  run(maxSteps = 100_000): StepResult {
    if (!this.prog) return { type: 'error', msg: 'No program loaded', line: 0 };
    let last: StepResult = { type: 'step' };
    for (let i = 0; i < maxSteps; i++) {
      last = step(this.cpu, this.prog);
      if (last.type !== 'step') return last;
    }
    return { type: 'error', msg: `Exceeded ${maxSteps} steps — infinite loop?`, line: 0 };
  }

  /** Toggle breakpoint at the instruction covering a given source line. */
  toggleBreakpoint(instrIdx: number): void {
    if (this.cpu.breakpoints.has(instrIdx)) {
      this.cpu.breakpoints.delete(instrIdx);
    } else {
      this.cpu.breakpoints.add(instrIdx);
    }
  }

  /** True if a program is loaded with no errors. */
  get isReady(): boolean {
    return !!this.prog && this.prog.errors.filter(e => e.type === 'error').length === 0;
  }

  get program(): Program | null {
    return this.prog;
  }

  /** Get current instruction index */
  get currentLine(): number {
    if (!this.prog || this.cpu.ipIdx >= this.prog.instructions.length) return -1;
    return this.prog.instructions[this.cpu.ipIdx]?.line ?? -1;
  }
}

