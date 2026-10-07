import type { Program, CpuState } from './emulator';

/** Encode Unicode string to Base64 URL-safe hash */
export function encodeSourceToHash(code: string): string {
  const bytes = new TextEncoder().encode(code);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

/** Decode Base64 hash back to Unicode string */
export function decodeSourceFromHash(hash: string): string {
  try {
    const bin = atob(hash);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}

/** Trigger browser download for a text or binary file */
export function downloadFile(filename: string, data: string | Uint8Array, mimeType = 'text/plain'): void {
  const blobPart: BlobPart = typeof data === 'string' ? data : (data.buffer as ArrayBuffer);
  const blob = new Blob([blobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Generate an assembler listing file (.lst) */
export function generateListing(program: Program | null, source: string): string {
  const lines = source.split('\n');
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  let out = `; =========================================================================\n`;
  out += `; ASM Studio 8086 Assembler Listing\n`;
  out += `; Generated: ${timestamp}\n`;
  out += `; Instructions: ${program?.instructions.length ?? 0} | Variables: ${program?.vars.size ?? 0}\n`;
  out += `; =========================================================================\n\n`;
  out += `ADDR   LINE  SOURCE CODE\n`;
  out += `-----  ----  ---------------------------------------------------------\n`;

  const lineToInstr = new Map<number, { address: number; mnemonic: string }>();
  if (program) {
    for (const instr of program.instructions) {
      if (!lineToInstr.has(instr.line)) {
        lineToInstr.set(instr.line, { address: instr.address, mnemonic: instr.mnemonic });
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const info = lineToInstr.get(lineNum);
    const addrStr = info ? info.address.toString(16).toUpperCase().padStart(4, '0') + 'h' : '     ';
    const lineStr = lineNum.toString().padStart(4, ' ');
    out += `${addrStr}  ${lineStr}  ${lines[i]}\n`;
  }

  if (program && program.vars.size > 0) {
    out += `\n; ----------------- SYMBOL / VARIABLE TABLE -----------------\n`;
    out += `NAME            ADDR   TYPE   SIZE\n`;
    out += `--------------  -----  -----  ----\n`;
    for (const [name, v] of program.vars) {
      const addrHex = v.address.toString(16).toUpperCase().padStart(4, '0') + 'h';
      const typeStr = v.elemType.toUpperCase().padEnd(5, ' ');
      out += `${name.padEnd(14, ' ')}  ${addrHex}  ${typeStr}  ${v.byteSize} byte(s)\n`;
    }
  }

  return out;
}

/** Generate a raw binary / .com file from loaded memory image */
export function generateBinary(program: Program | null, cpu: CpuState | null): Uint8Array {
  if (!program) return new Uint8Array(0);

  // In .com programs or flat memory, code/data spans 0100h up to the highest modified address
  let minAddr = 0x0100;
  let maxAddr = 0x0100;

  for (const instr of program.instructions) {
    if (instr.address < minAddr) minAddr = instr.address;
    if (instr.address > maxAddr) maxAddr = instr.address;
  }
  for (const [, v] of program.vars) {
    if (v.address < minAddr) minAddr = v.address;
    if (v.address + v.byteSize > maxAddr) maxAddr = v.address + v.byteSize;
  }

  const length = Math.max(16, maxAddr - minAddr + 16);
  const bin = new Uint8Array(length);

  const memSource = cpu ? cpu.mem : program.initialMem;
  for (let i = 0; i < length; i++) {
    bin[i] = memSource[minAddr + i] || 0;
  }

  return bin;
}

export const NEW_PROGRAM_TEMPLATE = `; ========================================================
; ASM Studio - New Intel 8086 Assembly Program
; ========================================================

.model small
.stack 100h

.data
    ; Define variables here
    greeting DB 'Hello from ASM Studio!', 0Dh, 0Ah, '$'

.code
main proc
    ; Initialize data segment
    MOV AX, @data
    MOV DS, AX

    ; Print greeting string
    MOV AH, 09h
    LEA DX, greeting
    INT 21h

    ; Exit to DOS
    MOV AH, 4Ch
    MOV AL, 0
    INT 21h
main endp

end main
`;
