// Monaco language definition for 8086 Assembly (Intel MASM/Emu8086 syntax)
import type * as Monaco from 'monaco-editor';

export const ASM_LANGUAGE_ID = 'asm8086';

const MNEMONICS = [
  // Data transfer
  'MOV','XCHG','LEA','LDS','LES','PUSH','POP','PUSHA','POPA','PUSHF','POPF','CBW','CWD',
  // Arithmetic
  'ADD','ADC','SUB','SBB','MUL','IMUL','DIV','IDIV','INC','DEC','NEG','CMP','AAA','AAS','DAA','DAS','AAM','AAD',
  // Logic
  'AND','OR','XOR','NOT','TEST',
  // Shifts & Rotates
  'SHL','SHR','SAL','SAR','ROL','ROR','RCL','RCR',
  // String
  'MOVS','MOVSB','MOVSW','CMPS','CMPSB','CMPSW','SCAS','SCASB','SCASW',
  'LODS','LODSB','LODSW','STOS','STOSB','STOSW','REP','REPE','REPZ','REPNE','REPNZ',
  // Jumps
  'JMP','JE','JNE','JZ','JNZ','JG','JL','JGE','JLE','JA','JB','JAE','JBE','JNBE',
  'JNAE','JNLE','JNGE','JNA','JNB','JS','JNS','JC','JNC','JO','JNO','JP','JNP','JPE','JPO',
  'JCXZ','JNLE','JNGE',
  // Loop
  'LOOP','LOOPE','LOOPNE','LOOPZ','LOOPNZ',
  // Procedure
  'CALL','RET','RETN','RETF',
  // Interrupts
  'INT','INTO','IRET',
  // Processor control
  'NOP','HLT','CLC','STC','CMC','CLD','STD','CLI','STI','WAIT','LOCK',
  // 80286+
  'ENTER','LEAVE',
];

const REGISTERS = [
  'AX','BX','CX','DX','AH','AL','BH','BL','CH','CL','DH','DL',
  'SI','DI','SP','BP','IP','FLAGS',
  'CS','DS','SS','ES',
];

const DIRECTIVES = [
  '.MODEL','.STACK','.DATA','.CODE','.CONST','.FARDATA',
  'DB','DW','DD','DQ','DT','DF','EQU',
  'PROC','ENDP','SEGMENT','ENDS','ASSUME','ORG','END',
  'INCLUDE','MACRO','ENDM','IF','ENDIF','ELSE','IFDEF','IFNDEF',
];

const SIZE_KEYWORDS = ['BYTE','WORD','DWORD','NEAR','FAR','PTR','DUP','OFFSET','SEG','SHORT'];

export function registerAsmLanguage(monaco: typeof Monaco): void {
  // Avoid re-registering
  const existing = monaco.languages.getLanguages().find(l => l.id === ASM_LANGUAGE_ID);
  if (existing) return;

  monaco.languages.register({
    id: ASM_LANGUAGE_ID,
    extensions: ['.asm', '.s'],
    aliases: ['8086 Assembly', 'asm8086'],
    mimetypes: ['text/x-asm'],
  });

  monaco.languages.setMonarchTokensProvider(ASM_LANGUAGE_ID, {
    defaultToken: '',
    tokenPostfix: '.asm',
    ignoreCase: true,

    keywords: MNEMONICS,
    registers: REGISTERS,
    directives: DIRECTIVES.map(d => d.replace(/^\./, '')),
    sizeKeywords: SIZE_KEYWORDS,

    tokenizer: {
      root: [
        // Comments
        [/;.*$/, 'comment'],

        // Labels (IDENTIFIER:)
        [/^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*:/, 'type.identifier'],

        // Strings
        [/'[^']*'/, 'string'],
        [/"[^"]*"/, 'string'],

        // Hex numbers: 0FFh or 0x0FF
        [/[0-9][0-9a-fA-F]*[hH]\b/, 'number.hex'],
        [/0[xX][0-9a-fA-F]+/, 'number.hex'],
        // Binary
        [/[01]+[bB]\b/, 'number'],
        // Decimal
        [/[0-9]+/, 'number'],

        // Directives (starting with dot)
        [/\.[a-zA-Z_][a-zA-Z0-9_]*/, 'keyword.directive'],

        // Identifiers: keywords, registers, directives
        [/[a-zA-Z_@$][a-zA-Z0-9_@$]*/, {
          cases: {
            '@keywords': 'keyword',
            '@registers': 'variable.name',
            '@directives': 'keyword.directive',
            '@sizeKeywords': 'keyword.type',
            '@default': 'identifier',
          },
        }],

        // Operators / punctuation
        [/[+\-*/,\[\]:()]/, 'delimiter'],
        [/[<>=!&|^~]/, 'operator'],
      ],
    },
  } as Monaco.languages.IMonarchLanguage);

  // Hover docs for opcodes
  monaco.languages.registerHoverProvider(ASM_LANGUAGE_ID, {
    provideHover(model, position) {
      const word = model.getWordAtPosition(position);
      if (!word) return null;
      const doc = OPCODE_DOCS[word.word.toUpperCase()];
      if (!doc) return null;
      return {
        range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
        contents: [
          { value: `**${word.word.toUpperCase()}** — ${doc.name}` },
          { value: doc.desc },
          { value: `*Flags affected: ${doc.flags}*` },
        ],
      };
    },
  });

  // Auto-complete
  monaco.languages.registerCompletionItemProvider(ASM_LANGUAGE_ID, {
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
        startColumn: word.startColumn, endColumn: word.endColumn,
      };

      const items: Monaco.languages.CompletionItem[] = [
        ...MNEMONICS.map(m => ({
          label: m,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: m,
          range,
          detail: OPCODE_DOCS[m]?.name ?? 'Instruction',
        })),
        ...REGISTERS.map(r => ({
          label: r,
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: r,
          range,
          detail: 'Register',
        })),
        ...DIRECTIVES.map(d => ({
          label: d,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: d,
          range,
          detail: 'Directive',
        })),
        ...SIZE_KEYWORDS.map(k => ({
          label: k,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: k === 'PTR' ? 'PTR' : k + ' PTR',
          range,
          detail: 'Size specifier',
        })),
      ];
      return { suggestions: items };
    },
  });

  // Editor theme tokens
  monaco.editor.defineTheme('asm-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword',           foreground: 'cba6f7', fontStyle: 'bold' },
      { token: 'keyword.directive', foreground: 'f9e2af' },
      { token: 'keyword.type',      foreground: 'f9e2af' },
      { token: 'variable.name',     foreground: '89dceb' },
      { token: 'type.identifier',   foreground: 'a6e3a1', fontStyle: 'bold' },
      { token: 'number',            foreground: 'fab387' },
      { token: 'number.hex',        foreground: 'fab387' },
      { token: 'string',            foreground: 'a6e3a1' },
      { token: 'comment',           foreground: '6c7086', fontStyle: 'italic' },
      { token: 'identifier',        foreground: 'cdd6f4' },
      { token: 'delimiter',         foreground: '89b4fa' },
    ],
    colors: {
      'editor.background': '#1e1e2e',
      'editor.foreground': '#cdd6f4',
      'editor.lineHighlightBackground': '#313244',
      'editor.selectionBackground': '#45475a',
      'editorLineNumber.foreground': '#585b70',
      'editorLineNumber.activeForeground': '#cdd6f4',
      'editorCursor.foreground': '#f5c2e7',
      'editorGutter.background': '#181825',
      'editorGlyphMargin.background': '#181825',
      'editor.inactiveSelectionBackground': '#313244',
    },
  });
}

// ── Opcode documentation ──────────────────────────────────────────────────────

const OPCODE_DOCS: Record<string, { name: string; desc: string; flags: string }> = {
  MOV:  { name: 'Move', desc: '`MOV dest, src` — Copies src into dest. Does not modify flags.', flags: 'None' },
  ADD:  { name: 'Add', desc: '`ADD dest, src` — dest = dest + src.', flags: 'CF, ZF, SF, OF, PF, AF' },
  SUB:  { name: 'Subtract', desc: '`SUB dest, src` — dest = dest - src.', flags: 'CF, ZF, SF, OF, PF, AF' },
  CMP:  { name: 'Compare', desc: '`CMP op1, op2` — Subtracts op2 from op1, sets flags, discards result.', flags: 'CF, ZF, SF, OF, PF, AF' },
  JMP:  { name: 'Unconditional Jump', desc: '`JMP label` — Jumps to the given label unconditionally.', flags: 'None' },
  JE:   { name: 'Jump if Equal', desc: '`JE label` — Jumps if ZF=1 (result was zero / operands were equal).', flags: 'ZF' },
  JNE:  { name: 'Jump if Not Equal', desc: '`JNE label` — Jumps if ZF=0.', flags: 'ZF' },
  JZ:   { name: 'Jump if Zero', desc: '`JZ label` — Alias for JE. Jumps if ZF=1.', flags: 'ZF' },
  JNZ:  { name: 'Jump if Not Zero', desc: '`JNZ label` — Alias for JNE. Jumps if ZF=0.', flags: 'ZF' },
  CALL: { name: 'Call Procedure', desc: '`CALL label` — Pushes return address and jumps to label.', flags: 'None' },
  RET:  { name: 'Return', desc: '`RET` — Pops return address from stack and jumps to it.', flags: 'None' },
  INT:  { name: 'Software Interrupt', desc: '`INT n` — Triggers interrupt n. `INT 21h` is the DOS services interrupt.', flags: 'Varies' },
  PUSH: { name: 'Push', desc: '`PUSH src` — Decrements SP by 2 and stores src at SS:SP.', flags: 'None' },
  POP:  { name: 'Pop', desc: '`POP dest` — Loads word at SS:SP into dest and increments SP by 2.', flags: 'None' },
  INC:  { name: 'Increment', desc: '`INC op` — op = op + 1. Does not affect CF.', flags: 'ZF, SF, OF, PF, AF' },
  DEC:  { name: 'Decrement', desc: '`DEC op` — op = op - 1. Does not affect CF.', flags: 'ZF, SF, OF, PF, AF' },
  NEG:  { name: 'Negate', desc: '`NEG op` — op = 0 - op (two\'s complement).', flags: 'CF, ZF, SF, OF, PF, AF' },
  MUL:  { name: 'Multiply (Unsigned)', desc: '`MUL src` — AX = AL * src (byte) or DX:AX = AX * src (word).', flags: 'CF, OF' },
  IMUL: { name: 'Multiply (Signed)', desc: '`IMUL src` — Signed version of MUL.', flags: 'CF, OF' },
  DIV:  { name: 'Divide (Unsigned)', desc: '`DIV src` — AL = AX / src, AH = remainder (byte) or AX = DX:AX / src, DX = remainder (word).', flags: 'Undefined' },
  LOOP: { name: 'Loop', desc: '`LOOP label` — Decrements CX; jumps to label if CX ≠ 0.', flags: 'None' },
  LEA:  { name: 'Load Effective Address', desc: '`LEA reg, [mem]` — Loads the address of mem into reg (not the value).', flags: 'None' },
  AND:  { name: 'Bitwise AND', desc: '`AND dest, src` — dest = dest AND src.', flags: 'CF=0, OF=0, ZF, SF, PF' },
  OR:   { name: 'Bitwise OR', desc: '`OR dest, src` — dest = dest OR src.', flags: 'CF=0, OF=0, ZF, SF, PF' },
  XOR:  { name: 'Bitwise XOR', desc: '`XOR dest, src` — dest = dest XOR src. `XOR AX,AX` zeroes AX.', flags: 'CF=0, OF=0, ZF, SF, PF' },
  NOT:  { name: 'Bitwise NOT', desc: '`NOT op` — Inverts all bits of op.', flags: 'None' },
  SHL:  { name: 'Shift Left', desc: '`SHL dest, count` — Shifts dest left by count bits. 0 shifted in from right.', flags: 'CF, ZF, SF, PF' },
  SHR:  { name: 'Shift Right', desc: '`SHR dest, count` — Logical right shift. 0 shifted in from left.', flags: 'CF, ZF, SF, PF' },
  SAR:  { name: 'Arithmetic Shift Right', desc: '`SAR dest, count` — Arithmetic right shift. Sign bit preserved.', flags: 'CF, ZF, SF, PF' },
  HLT:  { name: 'Halt', desc: '`HLT` — Stops the CPU. Program ends.', flags: 'None' },
  NOP:  { name: 'No Operation', desc: '`NOP` — Does nothing. Used for timing/alignment.', flags: 'None' },
};

