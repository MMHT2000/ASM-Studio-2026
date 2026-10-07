// ─── 8086 Instruction Executor ────────────────────────────────────────────────
import type { CpuState, Flags, Operand, OpSize, Program, RegName, Registers, StepResult } from './types';
import { BYTE_REGS } from './types';

// ── Register helpers ──────────────────────────────────────────────────────────

export function getReg(regs: Registers, name: string): number {
  const n = name.toUpperCase() as RegName;
  switch (n) {
    case 'AX': return regs.AX; case 'BX': return regs.BX;
    case 'CX': return regs.CX; case 'DX': return regs.DX;
    case 'AH': return (regs.AX >> 8) & 0xFF;
    case 'AL': return  regs.AX       & 0xFF;
    case 'BH': return (regs.BX >> 8) & 0xFF;
    case 'BL': return  regs.BX       & 0xFF;
    case 'CH': return (regs.CX >> 8) & 0xFF;
    case 'CL': return  regs.CX       & 0xFF;
    case 'DH': return (regs.DX >> 8) & 0xFF;
    case 'DL': return  regs.DX       & 0xFF;
    case 'SI': return regs.SI; case 'DI': return regs.DI;
    case 'SP': return regs.SP; case 'BP': return regs.BP;
    case 'IP': return regs.IP;
    case 'CS': return regs.CS; case 'DS': return regs.DS;
    case 'SS': return regs.SS; case 'ES': return regs.ES;
    default: throw new Error(`Unknown register: ${name}`);
  }
}

export function setReg(regs: Registers, changed: Set<string>, name: string, val: number): void {
  const n = name.toUpperCase() as RegName;
  changed.add(n);
  switch (n) {
    case 'AX': regs.AX = val & 0xFFFF; break;
    case 'BX': regs.BX = val & 0xFFFF; break;
    case 'CX': regs.CX = val & 0xFFFF; break;
    case 'DX': regs.DX = val & 0xFFFF; break;
    case 'AH': regs.AX = (regs.AX & 0x00FF) | ((val & 0xFF) << 8); break;
    case 'AL': regs.AX = (regs.AX & 0xFF00) |  (val & 0xFF);       break;
    case 'BH': regs.BX = (regs.BX & 0x00FF) | ((val & 0xFF) << 8); break;
    case 'BL': regs.BX = (regs.BX & 0xFF00) |  (val & 0xFF);       break;
    case 'CH': regs.CX = (regs.CX & 0x00FF) | ((val & 0xFF) << 8); break;
    case 'CL': regs.CX = (regs.CX & 0xFF00) |  (val & 0xFF);       break;
    case 'DH': regs.DX = (regs.DX & 0x00FF) | ((val & 0xFF) << 8); break;
    case 'DL': regs.DX = (regs.DX & 0xFF00) |  (val & 0xFF);       break;
    case 'SI': regs.SI = val & 0xFFFF; break;
    case 'DI': regs.DI = val & 0xFFFF; break;
    case 'SP': regs.SP = val & 0xFFFF; break;
    case 'BP': regs.BP = val & 0xFFFF; break;
    case 'CS': regs.CS = val & 0xFFFF; break;
    case 'DS': regs.DS = val & 0xFFFF; break;
    case 'SS': regs.SS = val & 0xFFFF; break;
    case 'ES': regs.ES = val & 0xFFFF; break;
  }
}

/** Size of a register operand */
function regSize(name: string): 'byte' | 'word' {
  return BYTE_REGS.has(name.toUpperCase()) ? 'byte' : 'word';
}

// ── Memory helpers ────────────────────────────────────────────────────────────

function physAddr(cpu: CpuState, op: Extract<Operand, { kind: 'mem' }>): number {
  let offset = op.disp || 0;
  if (op.base)  offset += getReg(cpu.regs, op.base);
  if (op.index) offset += getReg(cpu.regs, op.index);
  return offset & 0xFFFF;
}

function readMem(mem: Uint8Array, addr: number, size: 'byte' | 'word'): number {
  const a = addr & 0xFFFF;
  if (size === 'byte') return mem[a];
  return mem[a] | (mem[(a + 1) & 0xFFFF] << 8);
}

function writeMem(cpu: CpuState, addr: number, val: number, size: 'byte' | 'word'): void {
  const a = addr & 0xFFFF;
  cpu.changedAddrs.add(a);
  if (size === 'byte') {
    cpu.mem[a] = val & 0xFF;
  } else {
    cpu.mem[a]              = val & 0xFF;
    cpu.mem[(a + 1) & 0xFFFF] = (val >> 8) & 0xFF;
    cpu.changedAddrs.add((a + 1) & 0xFFFF);
  }
}

// ── Operand read/write ────────────────────────────────────────────────────────

/** Read the value of an operand. size hint used for memory operands with 'auto'. */
function readOp(cpu: CpuState, op: Operand, sizeHint: 'byte' | 'word' = 'word'): number {
  switch (op.kind) {
    case 'reg': return getReg(cpu.regs, op.name);
    case 'imm': return op.value;
    case 'mem': {
      const addr = physAddr(cpu, op);
      const sz = op.size === 'auto' ? sizeHint : op.size as 'byte' | 'word';
      return readMem(cpu.mem, addr, sz);
    }
    case 'lbl': throw new Error(`Unresolved label: ${op.name}`);
  }
}

/** Write a value to an operand destination. */
function writeOp(cpu: CpuState, op: Operand, val: number, sizeHint: 'byte' | 'word' = 'word'): void {
  switch (op.kind) {
    case 'reg':
      setReg(cpu.regs, cpu.changedRegs, op.name, val);
      break;
    case 'mem': {
      const addr = physAddr(cpu, op);
      const sz = op.size === 'auto' ? sizeHint : op.size as 'byte' | 'word';
      writeMem(cpu, addr, val, sz);
      break;
    }
    default:
      throw new Error(`Cannot write to operand kind: ${op.kind}`);
  }
}

/** Determine the effective size of a dest operand */
function opEffectiveSize(op: Operand, other?: Operand): 'byte' | 'word' {
  if (op.kind === 'reg') return regSize(op.name);
  if (op.kind === 'mem' && op.size !== 'auto') return op.size as 'byte' | 'word';
  if (other) return opEffectiveSize(other);
  return 'word';
}

// ── Stack helpers ─────────────────────────────────────────────────────────────

function pushWord(cpu: CpuState, val: number): void {
  cpu.regs.SP = (cpu.regs.SP - 2) & 0xFFFF;
  cpu.changedRegs.add('SP');
  writeMem(cpu, cpu.regs.SS * 16 + cpu.regs.SP, val, 'word');
}

function popWord(cpu: CpuState): number {
  const val = readMem(cpu.mem, (cpu.regs.SS * 16 + cpu.regs.SP) & 0xFFFF, 'word');
  cpu.regs.SP = (cpu.regs.SP + 2) & 0xFFFF;
  cpu.changedRegs.add('SP');
  return val;
}

// ── Flag helpers ──────────────────────────────────────────────────────────────

function parity(n: number): boolean {
  // True if even number of 1-bits in low byte
  let v = n & 0xFF;
  v ^= v >> 4; v ^= v >> 2; v ^= v >> 1;
  return (v & 1) === 0;
}

function flagsAfterLogic(flags: Flags, result: number, size: 'byte' | 'word'): void {
  const mask = size === 'byte' ? 0xFF : 0xFFFF;
  const sb   = size === 'byte' ? 0x80 : 0x8000;
  const r = result & mask;
  flags.ZF = r === 0;
  flags.SF = (r & sb) !== 0;
  flags.CF = false;
  flags.OF = false;
  flags.PF = parity(r);
}

function flagsAfterAdd(flags: Flags, a: number, b: number, result: number, size: 'byte' | 'word'): void {
  const mask = size === 'byte' ? 0xFF : 0xFFFF;
  const sb   = size === 'byte' ? 0x80 : 0x8000;
  const r = result & mask;
  flags.ZF = r === 0;
  flags.SF = (r & sb) !== 0;
  flags.CF = result > mask;
  flags.PF = parity(r);
  flags.OF = ((a & sb) === (b & sb)) && ((r & sb) !== (a & sb));
  flags.AF = ((a & 0xF) + (b & 0xF)) > 0xF;
}

function flagsAfterSub(flags: Flags, a: number, b: number, result: number, size: 'byte' | 'word'): void {
  const mask = size === 'byte' ? 0xFF : 0xFFFF;
  const sb   = size === 'byte' ? 0x80 : 0x8000;
  const r = result & mask;
  flags.ZF = r === 0;
  flags.SF = (r & sb) !== 0;
  flags.CF = a < b;
  flags.PF = parity(r);
  flags.OF = ((a & sb) !== (b & sb)) && ((r & sb) === (b & sb));
  flags.AF = (a & 0xF) < (b & 0xF);
}

function flagsAfterInc(flags: Flags, prev: number, result: number, size: 'byte' | 'word'): void {
  const mask = size === 'byte' ? 0xFF : 0xFFFF;
  const sb   = size === 'byte' ? 0x80 : 0x8000;
  const r = result & mask;
  flags.ZF = r === 0;
  flags.SF = (r & sb) !== 0;
  flags.PF = parity(r);
  flags.OF = prev === (sb - 1); // was max positive
  // CF unchanged for INC/DEC
}

function flagsAfterDec(flags: Flags, prev: number, result: number, size: 'byte' | 'word'): void {
  const mask = size === 'byte' ? 0xFF : 0xFFFF;
  const sb   = size === 'byte' ? 0x80 : 0x8000;
  const r = result & mask;
  flags.ZF = r === 0;
  flags.SF = (r & sb) !== 0;
  flags.PF = parity(r);
  flags.OF = (prev & mask) === sb; // was min negative
  // CF unchanged for INC/DEC
}

// ── INT 21h DOS Emulation ─────────────────────────────────────────────────────

function handleInt21(cpu: CpuState, prog: Program): StepResult | null {
  const ah = getReg(cpu.regs, 'AH');

  switch (ah) {
    case 0x01: {
      // Read character into AL — use input buffer or prompt
      const ch = cpu.inputBuffer.length > 0 ? cpu.inputBuffer[0] : '\n';
      cpu.inputBuffer = cpu.inputBuffer.slice(1);
      setReg(cpu.regs, cpu.changedRegs, 'AL', ch.charCodeAt(0));
      break;
    }
    case 0x02: {
      // Display character in DL
      const dl = getReg(cpu.regs, 'DL');
      const char = String.fromCharCode(dl);
      if (char === '\n' || char === '\r') {
        if (char === '\n') cpu.output.push('');
      } else {
        if (cpu.output.length === 0) cpu.output.push('');
        cpu.output[cpu.output.length - 1] += char;
      }
      break;
    }
    case 0x09: {
      // Display '$'-terminated string at DX
      const dx = getReg(cpu.regs, 'DX');
      let addr = dx & 0xFFFF;
      let str = '';
      let safety = 0;
      while (safety++ < 4096) {
        const b = cpu.mem[addr & 0xFFFF];
        if (b === 0x24) break; // '$'
        str += String.fromCharCode(b);
        addr++;
      }
      if (cpu.output.length === 0) cpu.output.push('');
      const parts = str.split(/\r?\n/);
      cpu.output[cpu.output.length - 1] += parts[0];
      for (let i = 1; i < parts.length; i++) {
        cpu.output.push(parts[i]);
      }
      break;
    }
    case 0x0A: {
      // Buffered keyboard input — stub
      break;
    }
    case 0x4C: {
      // Exit with code in AL
      const al = getReg(cpu.regs, 'AL');
      cpu.halted = true;
      cpu.exitCode = al;
      return { type: 'halt', code: al };
    }
    default:
      // Unknown INT 21h service — ignore silently
      break;
  }
  return null;
}

// ── Label resolution helper ───────────────────────────────────────────────────

function resolveLabel(op: Operand, prog: Program): number {
  if (op.kind !== 'lbl') throw new Error('Expected label operand');
  const idx = prog.labels.get(op.name);
  if (idx === undefined) throw new Error(`Undefined label: ${op.name}`);
  return idx;
}

// ── Sign-extend byte to word ──────────────────────────────────────────────────
function signExtByte(b: number): number {
  return (b & 0x80) ? (b | 0xFF00) : b;
}
function signExtWord(w: number): number {
  return (w & 0x8000) ? (w | 0xFFFF0000) : w;
}
function toSigned16(n: number): number {
  n = n & 0xFFFF;
  return n >= 0x8000 ? n - 0x10000 : n;
}
function toSigned8(n: number): number {
  n = n & 0xFF;
  return n >= 0x80 ? n - 0x100 : n;
}

// ── Main step function ────────────────────────────────────────────────────────

export function step(cpu: CpuState, prog: Program): StepResult {
  if (cpu.halted) return { type: 'halt', code: cpu.exitCode };

  const idx = cpu.ipIdx;
  if (idx >= prog.instructions.length) {
    cpu.halted = true;
    return { type: 'halt', code: 0 };
  }

  const instr = prog.instructions[idx];
  const { mnemonic, ops } = instr;

  // Check breakpoint (skip on first step to actually execute it)
  if (cpu.stepCount > 0 && cpu.breakpoints.has(idx)) {
    return { type: 'break', ipIdx: idx };
  }

  cpu.changedRegs.clear();
  cpu.changedAddrs.clear();
  cpu.stepCount++;

  // Advance IP by default (jumps will override)
  let nextIdx = idx + 1;

  try {
    const [op0, op1] = ops;

    switch (mnemonic) {

      // ── Data Transfer ────────────────────────────────────────────

      case 'MOV': {
        const size = opEffectiveSize(op0, op1);
        const val  = readOp(cpu, op1, size);
        writeOp(cpu, op0, val, size);
        break;
      }
      case 'XCHG': {
        const size = opEffectiveSize(op0, op1);
        const a = readOp(cpu, op0, size);
        const b = readOp(cpu, op1, size);
        writeOp(cpu, op0, b, size);
        writeOp(cpu, op1, a, size);
        break;
      }
      case 'LEA': {
        if (op1.kind !== 'mem') throw new Error('LEA requires memory operand');
        let offset = op1.disp || 0;
        if (op1.base)  offset += getReg(cpu.regs, op1.base);
        if (op1.index) offset += getReg(cpu.regs, op1.index);
        writeOp(cpu, op0, offset & 0xFFFF, 'word');
        break;
      }
      case 'PUSH': {
        const size = op0.kind === 'reg' ? regSize(op0.name) : 'word';
        pushWord(cpu, readOp(cpu, op0, size));
        break;
      }
      case 'POP': {
        writeOp(cpu, op0, popWord(cpu), 'word');
        break;
      }
      case 'PUSHF': {
        const { CF,PF,AF,ZF,SF,TF,IF,DF,OF } = cpu.flags;
        const f = (CF?1:0)|(PF?4:0)|(AF?0x10:0)|(ZF?0x40:0)|(SF?0x80:0)|
                  (TF?0x100:0)|(IF?0x200:0)|(DF?0x400:0)|(OF?0x800:0)|0xF002;
        pushWord(cpu, f);
        break;
      }
      case 'POPF': {
        const f = popWord(cpu);
        cpu.flags.CF = !!(f & 0x0001); cpu.flags.PF = !!(f & 0x0004);
        cpu.flags.AF = !!(f & 0x0010); cpu.flags.ZF = !!(f & 0x0040);
        cpu.flags.SF = !!(f & 0x0080); cpu.flags.TF = !!(f & 0x0100);
        cpu.flags.IF = !!(f & 0x0200); cpu.flags.DF = !!(f & 0x0400);
        cpu.flags.OF = !!(f & 0x0800);
        break;
      }
      case 'CBW': {
        // sign-extend AL into AH
        const al = getReg(cpu.regs, 'AL');
        setReg(cpu.regs, cpu.changedRegs, 'AX', signExtByte(al));
        break;
      }
      case 'CWD': {
        // sign-extend AX into DX
        const ax = getReg(cpu.regs, 'AX');
        setReg(cpu.regs, cpu.changedRegs, 'DX', ax & 0x8000 ? 0xFFFF : 0x0000);
        break;
      }
      case 'DAA': {
        // Decimal Adjust AL after Addition (Packed BCD)
        let al = getReg(cpu.regs, 'AL');
        let cf = cpu.flags.CF;
        if ((al & 0x0F) > 9 || cpu.flags.AF) {
          al += 6;
          cpu.flags.AF = true;
        } else {
          cpu.flags.AF = false;
        }
        if (al > 0x9F || cf) {
          al += 0x60;
          cpu.flags.CF = true;
        } else {
          cpu.flags.CF = false;
        }
        setReg(cpu.regs, cpu.changedRegs, 'AL', al & 0xFF);
        cpu.flags.ZF = (al & 0xFF) === 0;
        cpu.flags.SF = !!(al & 0x80);
        break;
      }
      case 'AAA': {
        // ASCII / Unpacked Adjust after Addition
        let al = getReg(cpu.regs, 'AL');
        let ah = getReg(cpu.regs, 'AH');
        if ((al & 0x0F) > 9 || cpu.flags.AF) {
          al = (al + 6) & 0x0F;
          ah = (ah + 1) & 0xFF;
          cpu.flags.AF = true;
          cpu.flags.CF = true;
        } else {
          al = al & 0x0F;
          cpu.flags.AF = false;
          cpu.flags.CF = false;
        }
        setReg(cpu.regs, cpu.changedRegs, 'AL', al);
        setReg(cpu.regs, cpu.changedRegs, 'AH', ah);
        break;
      }

      // ── Arithmetic ───────────────────────────────────────────────

      case 'ADD': case 'ADC': {
        const size = opEffectiveSize(op0, op1);
        const a    = readOp(cpu, op0, size);
        const b    = readOp(cpu, op1, size);
        const carry = (mnemonic === 'ADC' && cpu.flags.CF) ? 1 : 0;
        const res  = a + b + carry;
        writeOp(cpu, op0, res, size);
        flagsAfterAdd(cpu.flags, a, b + carry, res, size);
        break;
      }
      case 'SUB': case 'SBB': {
        const size = opEffectiveSize(op0, op1);
        const a    = readOp(cpu, op0, size);
        const b    = readOp(cpu, op1, size);
        const borrow = (mnemonic === 'SBB' && cpu.flags.CF) ? 1 : 0;
        const res  = a - b - borrow;
        writeOp(cpu, op0, res & (size === 'byte' ? 0xFF : 0xFFFF), size);
        flagsAfterSub(cpu.flags, a, b + borrow, res, size);
        break;
      }
      case 'CMP': {
        const size = opEffectiveSize(op0, op1);
        const a    = readOp(cpu, op0, size);
        const b    = readOp(cpu, op1, size);
        flagsAfterSub(cpu.flags, a, b, a - b, size);
        break;
      }
      case 'INC': {
        const size = opEffectiveSize(op0);
        const a    = readOp(cpu, op0, size);
        const res  = (a + 1) & (size === 'byte' ? 0xFF : 0xFFFF);
        writeOp(cpu, op0, res, size);
        flagsAfterInc(cpu.flags, a, res, size);
        break;
      }
      case 'DEC': {
        const size = opEffectiveSize(op0);
        const a    = readOp(cpu, op0, size);
        const res  = (a - 1) & (size === 'byte' ? 0xFF : 0xFFFF);
        writeOp(cpu, op0, res, size);
        flagsAfterDec(cpu.flags, a, res, size);
        break;
      }
      case 'NEG': {
        const size = opEffectiveSize(op0);
        const a    = readOp(cpu, op0, size);
        const res  = (0 - a) & (size === 'byte' ? 0xFF : 0xFFFF);
        writeOp(cpu, op0, res, size);
        flagsAfterSub(cpu.flags, 0, a, -a, size);
        break;
      }
      case 'MUL': {
        // Unsigned multiply
        const size = opEffectiveSize(op0);
        const src  = readOp(cpu, op0, size);
        if (size === 'byte') {
          const res = getReg(cpu.regs, 'AL') * src;
          setReg(cpu.regs, cpu.changedRegs, 'AX', res & 0xFFFF);
          cpu.flags.CF = cpu.flags.OF = (res & 0xFF00) !== 0;
        } else {
          const res = getReg(cpu.regs, 'AX') * src;
          setReg(cpu.regs, cpu.changedRegs, 'AX', res & 0xFFFF);
          setReg(cpu.regs, cpu.changedRegs, 'DX', (res >> 16) & 0xFFFF);
          cpu.flags.CF = cpu.flags.OF = (res & 0xFFFF0000) !== 0;
        }
        break;
      }
      case 'IMUL': {
        // Signed multiply
        const size = opEffectiveSize(op0);
        const src  = size === 'byte' ? toSigned8(readOp(cpu, op0, size)) : toSigned16(readOp(cpu, op0, size));
        if (size === 'byte') {
          const res = toSigned8(getReg(cpu.regs, 'AL')) * src;
          setReg(cpu.regs, cpu.changedRegs, 'AX', res & 0xFFFF);
          cpu.flags.CF = cpu.flags.OF = (res < -128 || res > 127);
        } else {
          const res = toSigned16(getReg(cpu.regs, 'AX')) * src;
          setReg(cpu.regs, cpu.changedRegs, 'AX', res & 0xFFFF);
          setReg(cpu.regs, cpu.changedRegs, 'DX', (res >> 16) & 0xFFFF);
          cpu.flags.CF = cpu.flags.OF = (res < -32768 || res > 32767);
        }
        break;
      }
      case 'DIV': {
        const size = opEffectiveSize(op0);
        const src  = readOp(cpu, op0, size);
        if (src === 0) throw new Error('Division by zero');
        if (size === 'byte') {
          const ax = getReg(cpu.regs, 'AX');
          setReg(cpu.regs, cpu.changedRegs, 'AL', Math.floor(ax / src) & 0xFF);
          setReg(cpu.regs, cpu.changedRegs, 'AH', (ax % src) & 0xFF);
        } else {
          const dxax = (getReg(cpu.regs, 'DX') << 16) | getReg(cpu.regs, 'AX');
          setReg(cpu.regs, cpu.changedRegs, 'AX', Math.floor(dxax / src) & 0xFFFF);
          setReg(cpu.regs, cpu.changedRegs, 'DX', (dxax % src) & 0xFFFF);
        }
        break;
      }
      case 'IDIV': {
        const size = opEffectiveSize(op0);
        const src  = size === 'byte' ? toSigned8(readOp(cpu, op0, size)) : toSigned16(readOp(cpu, op0, size));
        if (src === 0) throw new Error('Division by zero');
        if (size === 'byte') {
          const ax = toSigned16(getReg(cpu.regs, 'AX'));
          setReg(cpu.regs, cpu.changedRegs, 'AL', Math.trunc(ax / src) & 0xFF);
          setReg(cpu.regs, cpu.changedRegs, 'AH', (ax % src) & 0xFF);
        } else {
          const dxax = toSigned16(getReg(cpu.regs, 'DX')) * 0x10000 + getReg(cpu.regs, 'AX');
          setReg(cpu.regs, cpu.changedRegs, 'AX', Math.trunc(dxax / src) & 0xFFFF);
          setReg(cpu.regs, cpu.changedRegs, 'DX', (dxax % src) & 0xFFFF);
        }
        break;
      }

      // ── Logic ────────────────────────────────────────────────────

      case 'AND': case 'OR': case 'XOR': {
        const size = opEffectiveSize(op0, op1);
        const a    = readOp(cpu, op0, size);
        const b    = readOp(cpu, op1, size);
        const res  = mnemonic === 'AND' ? a & b : mnemonic === 'OR' ? a | b : a ^ b;
        writeOp(cpu, op0, res, size);
        flagsAfterLogic(cpu.flags, res, size);
        break;
      }
      case 'NOT': {
        const size = opEffectiveSize(op0);
        const mask = size === 'byte' ? 0xFF : 0xFFFF;
        writeOp(cpu, op0, (~readOp(cpu, op0, size)) & mask, size);
        break;
      }
      case 'TEST': {
        const size = opEffectiveSize(op0, op1);
        const res  = readOp(cpu, op0, size) & readOp(cpu, op1, size);
        flagsAfterLogic(cpu.flags, res, size);
        break;
      }

      // ── Shifts & Rotates ─────────────────────────────────────────

      case 'SHL': case 'SAL': {
        const size  = opEffectiveSize(op0);
        const mask  = size === 'byte' ? 0xFF : 0xFFFF;
        const sb    = size === 'byte' ? 0x80 : 0x8000;
        const a     = readOp(cpu, op0, size);
        const count = (op1 ? readOp(cpu, op1, 'byte') : 1) & 0x1F;
        const res   = (a << count) & mask;
        writeOp(cpu, op0, res, size);
        cpu.flags.CF = count > 0 && !!(a & (sb >> (count - 1)));
        flagsAfterLogic(cpu.flags, res, size);
        cpu.flags.CF = count > 0 && !!(a & (sb >> (count - 1))); // restore CF
        break;
      }
      case 'SHR': {
        const size  = opEffectiveSize(op0);
        const a     = readOp(cpu, op0, size);
        const count = (op1 ? readOp(cpu, op1, 'byte') : 1) & 0x1F;
        const res   = (a >>> count) & (size === 'byte' ? 0xFF : 0xFFFF);
        writeOp(cpu, op0, res, size);
        cpu.flags.CF = count > 0 && !!(a & (1 << (count - 1)));
        flagsAfterLogic(cpu.flags, res, size);
        cpu.flags.CF = count > 0 && !!(a & (1 << (count - 1)));
        break;
      }
      case 'SAR': {
        const size  = opEffectiveSize(op0);
        const a     = size === 'byte' ? toSigned8(readOp(cpu, op0, size)) : toSigned16(readOp(cpu, op0, size));
        const count = (op1 ? readOp(cpu, op1, 'byte') : 1) & 0x1F;
        const res   = (a >> count) & (size === 'byte' ? 0xFF : 0xFFFF);
        writeOp(cpu, op0, res, size);
        cpu.flags.CF = count > 0 && !!(readOp(cpu, op0, size) & (1 << (count - 1)));
        flagsAfterLogic(cpu.flags, res, size);
        break;
      }
      case 'ROL': {
        const size  = opEffectiveSize(op0);
        const bits  = size === 'byte' ? 8 : 16;
        const a     = readOp(cpu, op0, size);
        const count = (op1 ? readOp(cpu, op1, 'byte') : 1) % bits;
        const res   = ((a << count) | (a >>> (bits - count))) & (size === 'byte' ? 0xFF : 0xFFFF);
        writeOp(cpu, op0, res, size);
        cpu.flags.CF = !!(res & 1);
        break;
      }
      case 'ROR': {
        const size  = opEffectiveSize(op0);
        const bits  = size === 'byte' ? 8 : 16;
        const a     = readOp(cpu, op0, size);
        const count = (op1 ? readOp(cpu, op1, 'byte') : 1) % bits;
        const res   = ((a >>> count) | (a << (bits - count))) & (size === 'byte' ? 0xFF : 0xFFFF);
        writeOp(cpu, op0, res, size);
        cpu.flags.CF = !!(res & (size === 'byte' ? 0x80 : 0x8000));
        break;
      }
      case 'RCL': {
        const size  = opEffectiveSize(op0);
        const bits  = size === 'byte' ? 8 : 16;
        let a = readOp(cpu, op0, size);
        const count = (op1 ? readOp(cpu, op1, 'byte') : 1) % (bits + 1);
        for (let i = 0; i < count; i++) {
          const newCF = !!(a & (bits === 8 ? 0x80 : 0x8000));
          a = ((a << 1) | (cpu.flags.CF ? 1 : 0)) & (bits === 8 ? 0xFF : 0xFFFF);
          cpu.flags.CF = newCF;
        }
        writeOp(cpu, op0, a, size);
        break;
      }
      case 'RCR': {
        const size  = opEffectiveSize(op0);
        const bits  = size === 'byte' ? 8 : 16;
        let a = readOp(cpu, op0, size);
        const count = (op1 ? readOp(cpu, op1, 'byte') : 1) % (bits + 1);
        for (let i = 0; i < count; i++) {
          const newCF = !!(a & 1);
          a = ((cpu.flags.CF ? (bits === 8 ? 0x80 : 0x8000) : 0) | (a >>> 1)) & (bits === 8 ? 0xFF : 0xFFFF);
          cpu.flags.CF = newCF;
        }
        writeOp(cpu, op0, a, size);
        break;
      }

      // ── Control Flow ─────────────────────────────────────────────

      case 'JMP': {
        if (op0.kind === 'lbl') nextIdx = resolveLabel(op0, prog);
        else if (op0.kind === 'imm') nextIdx = op0.value; // treat as instruction index
        else if (op0.kind === 'reg') nextIdx = getReg(cpu.regs, op0.name); // rare
        break;
      }

      // Conditional jumps - all check flags and jump to label
      case 'JE':  case 'JZ':   if ( cpu.flags.ZF)                                nextIdx = resolveLabel(op0, prog); break;
      case 'JNE': case 'JNZ':  if (!cpu.flags.ZF)                                nextIdx = resolveLabel(op0, prog); break;
      case 'JC':  case 'JB':   case 'JNAE': if ( cpu.flags.CF)                    nextIdx = resolveLabel(op0, prog); break;
      case 'JNC': case 'JNB':  case 'JAE':  if (!cpu.flags.CF)                    nextIdx = resolveLabel(op0, prog); break;
      case 'JS':                if ( cpu.flags.SF)                                nextIdx = resolveLabel(op0, prog); break;
      case 'JNS':               if (!cpu.flags.SF)                                nextIdx = resolveLabel(op0, prog); break;
      case 'JO':                if ( cpu.flags.OF)                                nextIdx = resolveLabel(op0, prog); break;
      case 'JNO':               if (!cpu.flags.OF)                                nextIdx = resolveLabel(op0, prog); break;
      case 'JP':  case 'JPE':   if ( cpu.flags.PF)                                nextIdx = resolveLabel(op0, prog); break;
      case 'JNP': case 'JPO':   if (!cpu.flags.PF)                                nextIdx = resolveLabel(op0, prog); break;
      case 'JA':  case 'JNBE': if (!cpu.flags.CF && !cpu.flags.ZF)               nextIdx = resolveLabel(op0, prog); break;
      case 'JBE': case 'JNA':  if ( cpu.flags.CF ||  cpu.flags.ZF)               nextIdx = resolveLabel(op0, prog); break;
      case 'JG':  case 'JNLE': if (!cpu.flags.ZF && cpu.flags.SF === cpu.flags.OF) nextIdx = resolveLabel(op0, prog); break;
      case 'JGE': case 'JNL':  if (cpu.flags.SF === cpu.flags.OF)                nextIdx = resolveLabel(op0, prog); break;
      case 'JL':  case 'JNGE': if (cpu.flags.SF !== cpu.flags.OF)                nextIdx = resolveLabel(op0, prog); break;
      case 'JLE': case 'JNG':  if (cpu.flags.ZF || cpu.flags.SF !== cpu.flags.OF) nextIdx = resolveLabel(op0, prog); break;
      case 'JCXZ':             if (getReg(cpu.regs, 'CX') === 0)                  nextIdx = resolveLabel(op0, prog); break;

      // ── Loops ────────────────────────────────────────────────────

      case 'LOOP': {
        const cx = (getReg(cpu.regs, 'CX') - 1) & 0xFFFF;
        setReg(cpu.regs, cpu.changedRegs, 'CX', cx);
        if (cx !== 0) nextIdx = resolveLabel(op0, prog);
        break;
      }
      case 'LOOPE': case 'LOOPZ': {
        const cx = (getReg(cpu.regs, 'CX') - 1) & 0xFFFF;
        setReg(cpu.regs, cpu.changedRegs, 'CX', cx);
        if (cx !== 0 && cpu.flags.ZF) nextIdx = resolveLabel(op0, prog);
        break;
      }
      case 'LOOPNE': case 'LOOPNZ': {
        const cx = (getReg(cpu.regs, 'CX') - 1) & 0xFFFF;
        setReg(cpu.regs, cpu.changedRegs, 'CX', cx);
        if (cx !== 0 && !cpu.flags.ZF) nextIdx = resolveLabel(op0, prog);
        break;
      }

      // ── Procedures ───────────────────────────────────────────────

      case 'CALL': {
        pushWord(cpu, nextIdx); // save return address (instruction index)
        cpu.callStack.push(nextIdx);
        nextIdx = resolveLabel(op0, prog);
        break;
      }
      case 'RET': case 'RETN': {
        const retIdx = popWord(cpu);
        cpu.callStack.pop();
        nextIdx = retIdx;
        break;
      }
      case 'RETF': {
        // Far return — for simplicity treat as near return
        const retIdx = popWord(cpu);
        cpu.callStack.pop();
        nextIdx = retIdx;
        break;
      }

      // ── String ops (simplified) ───────────────────────────────────

      case 'MOVS': case 'MOVSB': case 'MOVSW': {
        const sz: 'byte' | 'word' = mnemonic === 'MOVSB' ? 'byte' : 'word';
        const val = readMem(cpu.mem, (cpu.regs.DS * 16 + cpu.regs.SI) & 0xFFFF, sz);
        writeMem(cpu, (cpu.regs.ES * 16 + cpu.regs.DI) & 0xFFFF, val, sz);
        const delta = (sz === 'byte' ? 1 : 2) * (cpu.flags.DF ? -1 : 1);
        cpu.regs.SI = (cpu.regs.SI + delta) & 0xFFFF;
        cpu.regs.DI = (cpu.regs.DI + delta) & 0xFFFF;
        cpu.changedRegs.add('SI'); cpu.changedRegs.add('DI');
        break;
      }
      case 'STOS': case 'STOSB': case 'STOSW': {
        const sz: 'byte' | 'word' = mnemonic === 'STOSB' ? 'byte' : 'word';
        const val = sz === 'byte' ? getReg(cpu.regs, 'AL') : getReg(cpu.regs, 'AX');
        writeMem(cpu, (cpu.regs.ES * 16 + cpu.regs.DI) & 0xFFFF, val, sz);
        const delta = (sz === 'byte' ? 1 : 2) * (cpu.flags.DF ? -1 : 1);
        cpu.regs.DI = (cpu.regs.DI + delta) & 0xFFFF;
        cpu.changedRegs.add('DI');
        break;
      }

      // ── Interrupts ───────────────────────────────────────────────

      case 'INT': {
        const intNum = readOp(cpu, op0, 'byte');
        if (intNum === 0x21) {
          const r = handleInt21(cpu, prog);
          if (r) { cpu.ipIdx = nextIdx; return r; }
        }
        // Other interrupts: stub
        break;
      }

      // ── Hardware I/O Ports ───────────────────────────────────────

      case 'OUT': {
        // OUT port, AL/AX  or  OUT DX, AL/AX
        const port = readOp(cpu, op0, 'word') & 0xFFFF;
        const val = readOp(cpu, op1, 'byte');
        cpu.ioPorts[port] = val;
        break;
      }
      case 'IN': {
        // IN AL/AX, port  or  IN AL/AX, DX
        const port = readOp(cpu, op1, 'word') & 0xFFFF;
        const val = cpu.ioPorts[port] ?? 0;
        writeOp(cpu, op0, val, 'byte');
        break;
      }

      // ── Processor Control ────────────────────────────────────────

      case 'NOP': break;
      case 'HLT': {
        cpu.halted = true;
        return { type: 'halt', code: 0 };
      }
      case 'CLC': cpu.flags.CF = false; break;
      case 'STC': cpu.flags.CF = true;  break;
      case 'CMC': cpu.flags.CF = !cpu.flags.CF; break;
      case 'CLD': cpu.flags.DF = false; break;
      case 'STD': cpu.flags.DF = true;  break;
      case 'CLI': cpu.flags.IF = false; break;
      case 'STI': cpu.flags.IF = true;  break;

      default:
        // Unknown instruction — skip it with a warning in output
        if (cpu.output.length === 0) cpu.output.push('');
        cpu.output[cpu.output.length - 1] += `[Warning: unknown instruction "${mnemonic}" at line ${instr.line}]`;
        break;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { type: 'error', msg, line: instr.line };
  }

  // Update display IP
  cpu.regs.IP = prog.instructions[nextIdx]?.address ?? (cpu.regs.IP + 3);
  cpu.ipIdx = nextIdx;
  return { type: 'step' };
}

