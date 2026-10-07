// ─── 8086 Two-Pass Assembler ───────────────────────────────────────────────────
import type { AsmError, DataVar, Instruction, Operand, OpSize, Program, RegName } from './types';
import { ALL_REGS, BYTE_REGS, WORD_REGS } from './types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function stripComment(line: string): string {
  // Remove ; comment but preserve ; inside quoted strings
  let inStr = false;
  let strChar = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (!inStr && (c === "'" || c === '"')) { inStr = true; strChar = c; }
    else if (inStr && c === strChar) { inStr = false; }
    else if (!inStr && c === ';') return line.slice(0, i);
  }
  return line;
}

function parseNumber(s: string): number | null {
  s = s.trim();
  if (!s) return null;
  const u = s.toUpperCase();
  // Binary: 1010b or 0b1010
  if (u.endsWith('B') && /^[01]+B$/i.test(u)) return parseInt(u.slice(0, -1), 2);
  if (u.startsWith('0B')) return parseInt(u.slice(2), 2);
  // Hex: 0FFh or 0x0FF or 0FFH
  if (u.endsWith('H') && /^[0-9A-F]+H$/i.test(u)) return parseInt(u.slice(0, -1), 16);
  if (u.startsWith('0X')) return parseInt(u.slice(2), 16);
  // Decimal
  if (/^-?[0-9]+$/.test(s)) return parseInt(s, 10);
  return null;
}

function isRegister(s: string): s is RegName {
  return ALL_REGS.has(s.toUpperCase());
}

function isWordRegister(s: string): boolean {
  return WORD_REGS.has(s.toUpperCase());
}

export const VALID_MNEMONICS = new Set([
  'MOV', 'XCHG', 'LEA', 'PUSH', 'POP', 'PUSHF', 'POPF', 'CBW', 'CWD', 'DAA', 'AAA',
  'ADD', 'ADC', 'SUB', 'SBB', 'INC', 'DEC', 'NEG', 'MUL', 'IMUL', 'DIV', 'IDIV', 'CMP',
  'AND', 'OR', 'XOR', 'NOT', 'TEST',
  'SHL', 'SHR', 'SAL', 'SAR', 'ROL', 'ROR', 'RCL', 'RCR',
  'JMP', 'JE', 'JZ', 'JNE', 'JNZ', 'JL', 'JNGE', 'JLE', 'JNG', 'JG', 'JNLE', 'JGE', 'JNL',
  'JB', 'JNAE', 'JBE', 'JNA', 'JA', 'JNBE', 'JAE', 'JNB', 'JC', 'JNC', 'JS', 'JNS', 'JO', 'JNO', 'JP', 'JPE', 'JNP', 'JPO',
  'LOOP', 'JCXZ', 'LOOPZ', 'LOOPE', 'LOOPNZ', 'LOOPNE',
  'CALL', 'RET', 'INT', 'IRET',
  'CLC', 'STC', 'CMC', 'CLD', 'STD', 'CLI', 'STI',
  'IN', 'OUT', 'HLT', 'NOP',
  'PROC', 'ENDP', 'ORG', 'ASSUME', 'END'
]);

/** Split "MOV AX, WORD PTR [BX+2]" into {mnemonic:"MOV", rest:"AX, WORD PTR [BX+2]"} */
function splitMnemonicRest(line: string): { mnemonic: string; rest: string } {
  const m = line.match(/^(\S+)(.*)/);
  if (!m) return { mnemonic: line.trim(), rest: '' };
  return { mnemonic: m[1].toUpperCase(), rest: m[2].trim() };
}

/** Split operand list by commas that are NOT inside brackets */
function splitOperands(s: string): string[] {
  if (!s.trim()) return [];
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (const c of s) {
    if (c === '[') { depth++; cur += c; }
    else if (c === ']') { depth--; cur += c; }
    else if (c === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; }
    else cur += c;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

/** Parse the expression inside [...] into base/index/disp components */
function parseMemExpr(expr: string): { base?: RegName; index?: RegName; disp: number; varName?: string } {
  // Tokenise by + and - keeping signs
  const tokens: Array<{ sign: number; val: string }> = [];
  let buf = '';
  let sign = 1;
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if ((c === '+' || c === '-') && buf.trim()) {
      tokens.push({ sign, val: buf.trim() });
      buf = '';
      sign = c === '-' ? -1 : 1;
    } else if (c !== '+') {
      buf += c;
    }
  }
  if (buf.trim()) tokens.push({ sign, val: buf.trim() });

  let base: RegName | undefined;
  let index: RegName | undefined;
  let disp = 0;
  let varName: string | undefined;

  for (const tok of tokens) {
    const u = tok.val.toUpperCase();
    if (isWordRegister(u)) {
      if (!base) base = u as RegName;
      else if (!index) index = u as RegName;
    } else {
      const num = parseNumber(tok.val);
      if (num !== null) {
        disp += tok.sign * num;
      } else if (/^[A-Z_][A-Z0-9_]*$/i.test(tok.val)) {
        varName = u;
      }
    }
  }
  return { base, index, disp, varName };
}

/** Parse a single operand string into an Operand object */
function parseOperand(raw: string, knownLabels?: Set<string>): Operand {
  let text = raw.trim();
  if (!text) throw new Error(`Empty operand`);

  // BYTE PTR / WORD PTR prefix
  let size: OpSize = 'auto';
  const ptrMatch = text.match(/^(BYTE|WORD)\s+PTR\s+/i);
  if (ptrMatch) {
    size = ptrMatch[1].toUpperCase() === 'BYTE' ? 'byte' : 'word';
    text = text.slice(ptrMatch[0].length).trim();
  }

  // Memory operand [...]
  if (text.startsWith('[')) {
    if (!text.endsWith(']')) throw new Error(`Unmatched [ in: ${raw}`);
    const inner = text.slice(1, -1).trim();
    const { base, index, disp, varName } = parseMemExpr(inner);
    return { kind: 'mem', base, index, disp, varName, size };
  }

  const upper = text.toUpperCase();

  // Register
  if (isRegister(upper)) return { kind: 'reg', name: upper as RegName };

  // @data / @code / @stack (segment pseudo-vars)
  if (upper === '@DATA' || upper === '@CODE' || upper === '@STACK') return { kind: 'imm', value: 0 };

  // Character literal 'X'
  if (/^'.'$/.test(text)) return { kind: 'imm', value: text.charCodeAt(1) };

  // Number
  const num = parseNumber(text);
  if (num !== null) return { kind: 'imm', value: num };

  // Label or variable name — resolved later
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(text)) {
    return { kind: 'lbl', name: upper };
  }

  // Negative number (e.g., -5) already handled by parseNumber, but fallback
  throw new Error(`Cannot parse operand: "${raw}"`);
}

// ── Data Section Parsing ──────────────────────────────────────────────────────

/** Parse values for DB/DW directive and write to mem, returning byte count used */
function parseDataValues(raw: string, elemType: 'byte' | 'word', mem: Uint8Array, addr: number): number {
  let offset = 0;
  let i = 0;
  const s = raw.trim();

  while (i < s.length) {
    // skip whitespace and commas
    while (i < s.length && (s[i] === ',' || s[i] === ' ' || s[i] === '\t')) i++;
    if (i >= s.length) break;

    if (s[i] === "'") {
      // String literal '...'
      const end = s.indexOf("'", i + 1);
      if (end === -1) throw new Error('Unterminated string literal');
      const str = s.slice(i + 1, end);
      for (const ch of str) {
        mem[addr + offset] = ch.charCodeAt(0);
        offset++;
      }
      i = end + 1;
    } else if (s[i] === '"') {
      // Double-quoted string
      const end = s.indexOf('"', i + 1);
      if (end === -1) throw new Error('Unterminated string literal');
      const str = s.slice(i + 1, end);
      for (const ch of str) {
        mem[addr + offset] = ch.charCodeAt(0);
        offset++;
      }
      i = end + 1;
    } else {
      // Number or DUP expression
      let j = i;
      while (j < s.length && s[j] !== ',' && s[j] !== ';') j++;
      const token = s.slice(i, j).trim().toUpperCase();
      i = j;

      // DUP: "N DUP(val)" or "N DUP(?)"
      const dupMatch = token.match(/^(\d+)\s+DUP\s*\(([^)]*)\)/);
      if (dupMatch) {
        const count = parseInt(dupMatch[1], 10);
        const valStr = dupMatch[2].trim();
        const val = valStr === '?' ? 0 : (parseNumber(valStr) ?? 0);
        for (let k = 0; k < count; k++) {
          if (elemType === 'byte') {
            mem[addr + offset] = val & 0xFF;
            offset += 1;
          } else {
            mem[addr + offset]     = val & 0xFF;
            mem[addr + offset + 1] = (val >> 8) & 0xFF;
            offset += 2;
          }
        }
      } else if (token === '?') {
        offset += elemType === 'byte' ? 1 : 2;
      } else {
        const val = parseNumber(token) ?? 0;
        if (elemType === 'byte') {
          mem[addr + offset] = val & 0xFF;
          offset += 1;
        } else {
          mem[addr + offset]     = val & 0xFF;
          mem[addr + offset + 1] = (val >> 8) & 0xFF;
          offset += 2;
        }
      }
    }
  }
  return offset;
}

// ── Main Assembler Entry Point ────────────────────────────────────────────────

export function assemble(source: string): Program {
  const lines = source.split('\n');
  const errors: AsmError[] = [];
  const vars   = new Map<string, DataVar>();
  const consts = new Map<string, number>();
  const labels = new Map<string, number>();
  const instructions: Instruction[] = [];
  const mem = new Uint8Array(65536);
  // Data segment starts at 0x0300 (leaves room for IVT and BIOS data)
  const DATA_BASE = 0x0300;
  let dataOffset = 0;

  type Section = 'preamble' | 'data' | 'code';
  let section: Section = 'preamble';

  // ─ First Pass: parse data and label definitions ─────────────────────────────
  const pendingInstructions: Array<{ lineNum: number; text: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    let line = stripComment(lines[i]).trim();
    if (!line) continue;

    const upper = line.toUpperCase();

    // Section directives
    if (/^\.MODEL\b/i.test(upper)) continue;
    if (/^\.STACK\b/i.test(upper)) continue;
    if (/^\.DATA\b/i.test(upper)) { section = 'data'; continue; }
    if (/^\.CODE\b/i.test(upper)) { section = 'code'; continue; }
    if (/^ASSUME\b/i.test(upper)) continue;
    if (/^END\b/i.test(upper)) continue;

    // ── DATA SECTION ───────────────────────────────────────────────
    if (section === 'data') {
      // NAME DB|DW values  or  NAME EQU value
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+(DB|DW|EQU)\s+(.*)/i);
      if (m) {
        const name   = m[1].toUpperCase();
        const dir    = m[2].toUpperCase();
        const values = m[3].trim();

        if (dir === 'EQU') {
          const v = parseNumber(values);
          if (v !== null) consts.set(name, v);
          continue;
        }

        const elemType: 'byte' | 'word' = dir === 'DB' ? 'byte' : 'word';
        const absAddr = DATA_BASE + dataOffset;

        try {
          const used = parseDataValues(values, elemType, mem, absAddr);
          vars.set(name, { name, address: absAddr, byteSize: used, elemType });
          dataOffset += used;
        } catch (e) {
          errors.push({ line: lineNum, msg: String(e), type: 'error' });
        }
      }
      continue;
    }

    // ── CODE SECTION ────────────────────────────────────────────────
    if (section === 'code') {
      // PROC / ENDP → treat PROC as a label, ENDP as no-op
      const procMatch = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+PROC\b/i);
      if (procMatch) {
        labels.set(procMatch[1].toUpperCase(), pendingInstructions.length);
        continue;
      }
      if (/^[A-Za-z_][A-Za-z0-9_]*\s+ENDP\b/i.test(line)) continue;

      // Extract optional label at start: "LABELNAME:"
      const lblMatch = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)/);
      if (lblMatch) {
        labels.set(lblMatch[1].toUpperCase(), pendingInstructions.length);
        line = lblMatch[2].trim();
        if (!line) continue;
      }

      pendingInstructions.push({ lineNum, text: line });
    }
  }

  // ─ Second Pass: parse instructions and resolve labels/vars ──────────────────
  for (let pi = 0; pi < pendingInstructions.length; pi++) {
    const { lineNum, text } = pendingInstructions[pi];
    const address = 0x0100 + pi * 3; // pseudo code address for display

    try {
      const { mnemonic, rest } = splitMnemonicRest(text);
      if (!VALID_MNEMONICS.has(mnemonic)) {
        errors.push({ line: lineNum, msg: `Unknown instruction: '${mnemonic}'`, type: 'error' });
      }

      const rawOps = splitOperands(rest);
      const ops: Operand[] = [];

      for (const raw of rawOps) {
        try {
          ops.push(parseOperand(raw));
        } catch (e) {
          errors.push({ line: lineNum, msg: String(e), type: 'error' });
          ops.push({ kind: 'imm', value: 0 });
        }
      }

      instructions.push({ mnemonic, ops, line: lineNum, address });
    } catch (e) {
      errors.push({ line: lineNum, msg: String(e), type: 'error' });
    }
  }

  // ─ Resolve label/var operands ────────────────────────────────────────────────
  // Convert { kind:'lbl', name } operands to immediate (for jumps) or mem (for vars)
  for (const instr of instructions) {
    instr.ops = instr.ops.map(op => {
      if (op.kind === 'mem' && op.varName) {
        const v = vars.get(op.varName);
        if (v) {
          const size: OpSize = op.size !== 'auto' ? op.size : (v.elemType === 'byte' ? 'byte' : 'word');
          return { ...op, disp: (op.disp || 0) + v.address, size, varName: undefined };
        }
      }

      if (op.kind !== 'lbl') return op;
      const name = op.name;

      // Is it a known label? → keep as label (executor will look up index)
      if (labels.has(name)) return op;

      // Is it a known variable? → convert to memory operand with its address
      const v = vars.get(name);
      if (v) {
        const size: OpSize = v.elemType === 'byte' ? 'byte' : 'word';
        return { kind: 'mem', disp: v.address, size } as Operand;
      }

      // Is it a known constant? → immediate
      const c = consts.get(name);
      if (c !== undefined) return { kind: 'imm', value: c };

      // Unknown symbol or label
      errors.push({ line: instr.line, msg: `Undefined symbol or label: '${name}'`, type: 'error' });
      return op;
    });
  }

  // Set IP display to first instruction address
  return { instructions, vars, consts, labels, initialMem: mem, errors };
}

/** Default "Hello, World!" sample program */
export const SAMPLE_PROGRAM = `; ─────────────────────────────────────────────────────
; ASM Studio — Hello World Demo
; Prints a greeting and performs some arithmetic.
; Press ▶ Run or use F5 to execute.
; ─────────────────────────────────────────────────────

.model small
.stack 100h

.data
    msg     DB 'Hello from ASM Studio!$'
    num1    DW 42
    num2    DW 58
    result  DW 0

.code
main proc
    ; Set up data segment
    MOV AX, @data
    MOV DS, AX

    ; ── Print greeting ──────────────────────────────
    MOV AH, 09h         ; DOS: print string
    LEA DX, msg         ; DX = address of message
    INT 21h

    ; ── Arithmetic demo ─────────────────────────────
    MOV AX, [num1]      ; AX = 42
    ADD AX, [num2]      ; AX = 42 + 58 = 100
    MOV [result], AX    ; save result

    ; ── Count down loop ─────────────────────────────
    MOV CX, 5           ; loop 5 times
count_loop:
    MOV AH, 02h         ; DOS: print char
    MOV DL, '.'         ; character to print
    INT 21h
    LOOP count_loop     ; CX--, jump if CX != 0

    ; ── Exit ─────────────────────────────────────────
    MOV AH, 4Ch         ; DOS: exit
    MOV AL, 0           ; exit code 0
    INT 21h
main endp
END main
`;

