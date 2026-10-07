// ─── 8086 Emulator Type Definitions ───────────────────────────────────────────

/** All named registers accessible to the CPU */
export type RegName =
  | 'AX' | 'BX' | 'CX' | 'DX'
  | 'AH' | 'AL' | 'BH' | 'BL' | 'CH' | 'CL' | 'DH' | 'DL'
  | 'SI' | 'DI' | 'SP' | 'BP' | 'IP'
  | 'CS' | 'DS' | 'SS' | 'ES';

export const BYTE_REGS = new Set(['AH','AL','BH','BL','CH','CL','DH','DL']);
export const WORD_REGS = new Set(['AX','BX','CX','DX','SI','DI','SP','BP','IP','CS','DS','SS','ES']);
export const ALL_REGS  = new Set([...BYTE_REGS, ...WORD_REGS]);

/** CPU Registers (all stored as 16-bit words; byte halves are derived) */
export interface Registers {
  AX: number; BX: number; CX: number; DX: number;
  SI: number; DI: number; SP: number; BP: number;
  IP: number;   // display only
  CS: number; DS: number; SS: number; ES: number;
}

/** CPU Flags */
export interface Flags {
  CF: boolean;  // Carry
  ZF: boolean;  // Zero
  SF: boolean;  // Sign
  OF: boolean;  // Overflow
  PF: boolean;  // Parity
  AF: boolean;  // Auxiliary Carry
  DF: boolean;  // Direction
  TF: boolean;  // Trap
  IF: boolean;  // Interrupt Enable
}

/** Operand size for memory accesses */
export type OpSize = 'byte' | 'word' | 'auto';

/** A parsed instruction operand */
export type Operand =
  | { kind: 'reg';  name: RegName }
  | { kind: 'imm';  value: number }
  | { kind: 'mem';  base?: RegName; index?: RegName; disp: number; varName?: string; size: OpSize }
  | { kind: 'lbl';  name: string };

/** A fully parsed instruction */
export interface Instruction {
  mnemonic: string;
  ops: Operand[];
  line: number;      // 1-based source line number
  address: number;   // pseudo-address for display (CS:IP style)
}

/** A data variable declared in .data section */
export interface DataVar {
  name: string;
  address: number;    // byte offset in the data segment (= absolute addr since DS=0)
  byteSize: number;   // total allocated bytes
  elemType: 'byte' | 'word';
}

/** A fully assembled program ready for execution */
export interface Program {
  instructions: Instruction[];
  vars: Map<string, DataVar>;      // UPPERCASE name → DataVar
  consts: Map<string, number>;     // EQU constants
  labels: Map<string, number>;     // UPPERCASE label → instruction index
  initialMem: Uint8Array;          // 64 KB memory pre-loaded with .data values
  errors: AsmError[];
}

/** An error produced by the assembler */
export interface AsmError {
  line: number;
  msg: string;
  type: 'error' | 'warning';
}

/** Full emulator CPU state */
export interface CpuState {
  regs: Registers;
  flags: Flags;
  mem: Uint8Array;         // 64 KB
  ipIdx: number;           // index into program.instructions
  callStack: number[];     // return instruction indices for CALL/RET
  halted: boolean;
  exitCode: number;
  output: string[];        // accumulated console output
  inputBuffer: string;     // for INT 21h/01h reads
  changedRegs: Set<string>;
  changedAddrs: Set<number>;
  stepCount: number;
  breakpoints: Set<number>; // instruction indices with breakpoints
  ioPorts: Record<number, number>; // I/O port address -> 8-bit or 16-bit value
}

/** Result of a single emulator step */
export type StepResult =
  | { type: 'step' }
  | { type: 'halt';  code: number }
  | { type: 'error'; msg: string; line: number }
  | { type: 'break'; ipIdx: number };

/** Default initial CPU registers */
export function defaultRegisters(): Registers {
  return { AX:0, BX:0, CX:0, DX:0, SI:0, DI:0, SP:0xFFFE, BP:0, IP:0x0100, CS:0, DS:0, SS:0, ES:0 };
}

/** Default initial flags */
export function defaultFlags(): Flags {
  return { CF:false, ZF:false, SF:false, OF:false, PF:false, AF:false, DF:false, TF:false, IF:true };
}

