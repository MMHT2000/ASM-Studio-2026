// ─── Comprehensive End-to-End Verification Test Suite ───────────────────────────
import { Emulator } from '../lib/emulator/index.ts';
import { CODE_SAMPLES } from '../lib/samples.ts';
import { 
  encodeSourceToHash, decodeSourceFromHash, 
  generateListing, generateBinary 
} from '../lib/fileUtils.ts';
import { askGemini } from '../lib/geminiApi.ts';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, passed: true });
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    results.push({ name, passed: false, error: err.message || String(err) });
    console.error(`  ✗ ${name}: ${err.message || err}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

function assertEq(actual: any, expected: any, msg: string) {
  if (actual !== expected) {
    throw new Error(`${msg} — Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`);
  }
}

console.log('\n======================================================');
console.log('   ASM STUDIO 2026 - END-TO-END VERIFICATION SUITE');
console.log('======================================================\n');

// ─────────────────────────────────────────────────────────────────────────────
// 1. Assembler & Directives
// ─────────────────────────────────────────────────────────────────────────────
console.log('[1/8] Testing Assembler & Directives...');

test('Assembler handles .model, .stack, .data, .code, and DB/DW', () => {
  const emu = new Emulator();
  const prog = emu.load(`
    .model small
    .stack 100h
    .data
      byteVar DB 42
      wordVar DW 1234h
      strVar  DB 'Hello$'
      dupVar  DB 4 DUP(0)
    .code
    main proc
      MOV AX, [wordVar]
      MOV BL, [byteVar]
      MOV AH, 4Ch
      INT 21h
    main endp
    end main
  `);
  assert(prog.errors.filter(e => e.type === 'error').length === 0, 'Should assemble without errors');
  assert(prog.vars.has('BYTEVAR'), 'Should parse byteVar');
  assert(prog.vars.has('WORDVAR'), 'Should parse wordVar');
  assert(prog.vars.has('STRVAR'), 'Should parse strVar');
  assert(prog.vars.has('DUPVAR'), 'Should parse dupVar');
  assertEq(prog.vars.get('BYTEVAR')?.byteSize, 1, 'byteVar size should be 1');
  assertEq(prog.vars.get('WORDVAR')?.byteSize, 2, 'wordVar size should be 2');
  assertEq(prog.vars.get('DUPVAR')?.byteSize, 4, 'dupVar size should be 4');
});

test('Assembler correctly catches syntax and operand errors', () => {
  const emu = new Emulator();
  const prog = emu.load(`
    .code
    main proc
      INVALID_OPCODE AX, BX
      MOV AX, NONEXISTENT_LABEL
    main endp
  `);
  assert(prog.errors.some(e => e.msg.includes('Unknown instruction') || e.msg.includes('INVALID_OPCODE')), 'Should catch unknown opcode');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Arithmetic & Logic Operations
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[2/8] Testing CPU Arithmetic & Logic ALU...');

test('ADD, ADC, SUB, SBB, NEG and Flag computations', () => {
  const emu = new Emulator();
  emu.load(`
    .code
    main proc
      ; ADD & Carry flag
      MOV AX, 0FFFFh
      ADD AX, 1          ; AX=0, CF=1, ZF=1
      
      ; ADC
      MOV BX, 5
      ADC BX, 2          ; BX = 5 + 2 + CF(1) = 8
      
      ; NEG
      MOV CX, 5
      NEG CX             ; CX = -5 = 0FFFBh, SF=1
      
      ; SUB (produces 0, sets ZF=1)
      SUB BX, 8          ; BX=0, ZF=1
      
      HLT
    main endp
  `);
  const res = emu.run(100);
  assertEq(res.type, 'halt', 'Should halt cleanly');
  assertEq(emu.cpu.regs.AX, 0, 'AX should be 0');
  assertEq(emu.cpu.regs.BX, 0, 'BX should be 0');
  assertEq(emu.cpu.regs.CX, 0xFFFB, 'CX should be 0xFFFB (-5)');
  assert(emu.cpu.flags.ZF === true, 'ZF should be 1');
});

test('INC does NOT modify Carry Flag (Intel 8086 specification)', () => {
  const emu = new Emulator();
  emu.load(`
    .code
    main proc
      ; Set CF
      STC                ; CF = 1
      MOV AX, 5
      INC AX             ; AX = 6, CF should STILL be 1!
      HLT
    main endp
  `);
  emu.run(50);
  assertEq(emu.cpu.regs.AX, 6, 'AX should be 6');
  assertEq(emu.cpu.flags.CF, true, 'CF must remain 1 after INC');
});

test('Multiplication (MUL, IMUL) & Division (DIV, IDIV)', () => {
  const emu = new Emulator();
  emu.load(`
    .code
    main proc
      ; MUL 8-bit: AL * BL -> AX
      MOV AL, 6
      MOV BL, 7
      MUL BL             ; AX = 42 (2Ah)
      MOV CX, AX         ; save in CX
      
      ; DIV 8-bit: AX / BL -> AL (quotient), AH (remainder)
      MOV AX, 100
      MOV BL, 7
      DIV BL             ; AL = 14 (0Eh), AH = 2
      
      HLT
    main endp
  `);
  emu.run(100);
  assertEq(emu.cpu.regs.CX, 42, 'MUL: 6 * 7 should be 42');
  assertEq(emu.cpu.regs.AX & 0xFF, 14, 'DIV: 100 / 7 quotient should be 14 (AL)');
  assertEq((emu.cpu.regs.AX >> 8) & 0xFF, 2, 'DIV: 100 % 7 remainder should be 2 (AH)');
});

test('Logical Bitwise (AND, OR, XOR, NOT, TEST, Shifts)', () => {
  const emu = new Emulator();
  emu.load(`
    .code
    main proc
      MOV AX, 0F0Fh
      AND AX, 00FFh      ; AX = 000Fh
      OR  AX, 00F0h      ; AX = 00FFh
      
      MOV BX, 1
      SHL BX, 3          ; BX = 8
      SHR BX, 1          ; BX = 4
      
      XOR AX, AX         ; AX = 0000h, ZF=1
      HLT
    main endp
  `);
  emu.run(100);
  assertEq(emu.cpu.regs.AX, 0, 'XOR AX, AX should result in 0');
  assertEq(emu.cpu.flags.ZF, true, 'XOR AX, AX should set ZF=1');
  assertEq(emu.cpu.regs.BX, 4, 'SHL/SHR should result in 4');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Jumps, Loops & Subroutines
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[3/8] Testing Jumps, Branches, Loops, CALL/RET...');

test('Conditional Jumps & LOOP instruction', () => {
  const emu = new Emulator();
  emu.load(`
    .code
    main proc
      MOV CX, 5
      MOV AX, 0
    my_loop:
      ADD AX, 10
      LOOP my_loop       ; runs 5 times: AX = 50
      
      CMP AX, 50
      JE is_equal
      MOV BX, 999
      JMP finish
    is_equal:
      MOV BX, 777
    finish:
      HLT
    main endp
  `);
  emu.run(100);
  assertEq(emu.cpu.regs.AX, 50, 'AX should accumulate 50 over 5 loops');
  assertEq(emu.cpu.regs.CX, 0, 'CX should be 0 after LOOP');
  assertEq(emu.cpu.regs.BX, 777, 'JE branch should take to is_equal');
});

test('Stack LIFO (PUSH, POP) and Subroutines (CALL, RET)', () => {
  const emu = new Emulator();
  emu.load(`
    .code
    main proc
      MOV AX, 1234h
      PUSH AX
      MOV AX, 5678h
      CALL double_ax
      POP BX             ; BX should be 1234h
      HLT
    main endp

    double_ax proc
      ADD AX, AX         ; 5678h * 2 = 0ACF0h
      RET
    double_ax endp
  `);
  emu.run(100);
  assertEq(emu.cpu.regs.AX, 0xACF0, 'AX should be doubled by procedure');
  assertEq(emu.cpu.regs.BX, 0x1234, 'BX should retrieve original AX from stack');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Memory Addressing Modes
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[4/8] Testing Memory Addressing Modes...');

test('Direct, Register Indirect [BX], Based Indexed [BX+SI], Displacement', () => {
  const emu = new Emulator();
  emu.load(`
    .data
      table DB 10, 20, 30, 40, 50
    .code
    main proc
      LEA BX, table      ; BX = address of table
      MOV AL, [BX]       ; AL = 10
      
      MOV SI, 2
      MOV AH, [BX+SI]    ; AH = 30 (offset + 2)
      
      MOV DL, [BX+3]     ; DL = 40 (displacement + 3)
      HLT
    main endp
  `);
  emu.run(100);
  assertEq(emu.cpu.regs.AX & 0xFF, 10, 'Direct indirect [BX] should load 10');
  assertEq((emu.cpu.regs.AX >> 8) & 0xFF, 30, 'Based indexed [BX+SI] should load 30');
  assertEq(emu.cpu.regs.DX & 0xFF, 40, 'Displacement [BX+3] should load 40');
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Virtual Hardware Peripherals & DOS INT 21h
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[5/8] Testing Virtual Hardware Devices & INT 21h...');

test('Virtual Hardware Ports (0378h LED, 0379h Traffic Light, 0300h 7-Segment)', () => {
  const emu = new Emulator();
  emu.load(`
    .code
    main proc
      ; Port 0378h - LED Bar
      MOV AL, 10101010b
      OUT 0378h, AL
      
      ; Port 0379h - Traffic Lights (bits 0..5)
      MOV AL, 00100100b
      OUT 0379h, AL
      
      ; Port 0300h - 7-Segment Display (BCD 1234h)
      MOV AX, 1234h
      OUT 0300h, AX
      
      HLT
    main endp
  `);
  emu.run(100);
  assertEq(emu.cpu.ioPorts[0x0378], 0b10101010, 'LED bar port 0378h value');
  assertEq(emu.cpu.ioPorts[0x0379], 0b00100100, 'Traffic light port 0379h value');
  assertEq(emu.cpu.ioPorts[0x0300], 0x1234, '7-Segment display port 0300h value');
});

test('DOS INT 21h Services (AH=01h read, AH=02h char, AH=09h string, AH=4Ch exit)', () => {
  const emu = new Emulator();
  emu.load(`
    .data
      msg DB 'ASM2026$'
    .code
    main proc
      ; Print character 'X'
      MOV AH, 02h
      MOV DL, 'X'
      INT 21h
      
      ; Print string 'ASM2026'
      MOV AH, 09h
      LEA DX, msg
      INT 21h
      
      ; Exit with code 42
      MOV AH, 4Ch
      MOV AL, 42
      INT 21h
    main endp
  `);
  const res = emu.run(100);
  assertEq(res.type, 'halt', 'Should halt via INT 21h / AH=4Ch');
  assertEq(emu.cpu.exitCode, 42, 'Exit code should be 42');
  const fullOutput = emu.cpu.output.join('');
  assertEq(fullOutput, 'XASM2026', 'Console output matches');
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Curated Sample Programs
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[6/8] Testing All 8 Curated Sample Programs...');

for (const sample of CODE_SAMPLES) {
  test(`Sample Program: "${sample.title}" (${sample.id})`, () => {
    const emu = new Emulator();
    const prog = emu.load(sample.code);
    assert(prog.errors.filter(e => e.type === 'error').length === 0, `Sample ${sample.id} should assemble with 0 errors`);
    
    // Bubble sort specific assertion
    if (sample.id === 'bubble-sort') {
      emu.run(10000);
      assert(emu.cpu.halted, 'Bubble sort must halt');
      // Read array at 0300h
      const arr = [
        emu.cpu.mem[0x0300], emu.cpu.mem[0x0301], emu.cpu.mem[0x0302], emu.cpu.mem[0x0303],
        emu.cpu.mem[0x0304], emu.cpu.mem[0x0305], emu.cpu.mem[0x0306], emu.cpu.mem[0x0307]
      ];
      assertEq(arr.join(','), '5,11,12,22,25,64,80,90', 'Bubble sort array must be sorted in ascending order');
    } else if (sample.id === 'reverse-string') {
      emu.run(1000);
      const out = emu.cpu.output.join('');
      assert(out.includes('YLBMESSA'), `String reversal output should match reversed text, got: "${out}"`);
    } else {
      emu.run(1000);
      assert(emu.cpu.stepCount > 0, 'Program should execute instructions');
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Time-Travel (Step Back) & Interactive Memory Editing
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[7/8] Testing Time-Travel Debugging & Memory Editing...');

test('Time-Travel Snapshot & Restore Determinism', () => {
  const emu = new Emulator();
  emu.load(`
    .code
    main proc
      MOV AX, 10
      ADD AX, 20
      ADD AX, 30
      ADD AX, 40
      HLT
    main endp
  `);

  // Step 1: MOV AX, 10
  emu.step();
  const snap1 = { ...emu.cpu, regs: { ...emu.cpu.regs } };
  assertEq(emu.cpu.regs.AX, 10, 'After step 1: AX=10');

  // Step 2: ADD AX, 20
  emu.step();
  assertEq(emu.cpu.regs.AX, 30, 'After step 2: AX=30');

  // Step 3: ADD AX, 30
  emu.step();
  assertEq(emu.cpu.regs.AX, 60, 'After step 3: AX=60');

  // Time-travel: Restore snap1
  emu.restoreCpu(snap1 as any);
  assertEq(emu.cpu.regs.AX, 10, 'After restoreCpu: AX must be restored to 10');
  
  // Step again from restored state
  emu.step();
  assertEq(emu.cpu.regs.AX, 30, 'Stepping after rewind must produce 30 deterministically');
});

test('Direct Memory Editing via setMemoryByte', () => {
  const emu = new Emulator();
  emu.load(`
    .data
      myVal DB 55h
    .code
    main proc
      MOV AL, [myVal]
      HLT
    main endp
  `);
  
  // Directly edit RAM byte before running
  emu.cpu.mem[0x0300] = 0xAA;
  emu.run(10);
  assertEq(emu.cpu.regs.AX & 0xFF, 0xAA, 'Instruction should load modified RAM byte (0xAA)');
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. File Utilities & Gemini Offline Diagnostics
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[8/8] Testing File Utilities & Gemini Offline Diagnostics...');

test('URL Hash Encoding/Decoding round-trip with Unicode and Special Chars', () => {
  const sampleText = `; Intel 8086 Program 🚀\n.data\nmsg DB 'Hello 世界 $'\n.code\nMOV AX, 42h\n`;
  const hash = encodeSourceToHash(sampleText);
  assert(hash.length > 0, 'Hash should not be empty');
  const decoded = decodeSourceFromHash(hash);
  assertEq(decoded, sampleText, 'Decoded string must match original unicode source exactly');
});

test('Assembler Listing (.lst) and Binary (.com) generation', () => {
  const emu = new Emulator();
  const prog = emu.load(`
    .data
      num DW 1234h
    .code
    main proc
      MOV AX, [num]
      HLT
    main endp
  `);
  const listing = generateListing(prog, emu.program ? '; code' : '');
  assert(listing.includes('ADDR   LINE  SOURCE CODE'), 'Listing has header');
  assert(listing.includes('SYMBOL / VARIABLE TABLE'), 'Listing has symbol table');

  const bin = generateBinary(prog, emu.cpu);
  assert(bin.length >= 16, 'Binary should contain emitted byte image');
});

test('Gemini AI Tutor Offline Diagnostic Heuristics', async () => {
  // Test code with bug: missing @data initialization and missing $ terminator
  const buggyCode = `
    .data
      str DB 'Unterminated'
    .code
    main proc
      MOV AH, 09h
      LEA DX, str
      INT 21h
    main endp
  `;
  const emu = new Emulator();
  emu.load(buggyCode);
  
  const diagnosis = await askGemini("Why did it crash?", {
    source: buggyCode,
    cpuSnapshot: emu.cpu,
    asmErrors: [],
    currentLine: 1,
  });

  assert(diagnosis.includes('Data Segment (DS) Not Initialized') || diagnosis.includes('Missing DOS String Terminator'),
    'Offline diagnosis must detect uninitialized DS or missing $ terminator');
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Multi-Provider AI (Gemini, OpenAI, Anthropic) & Editor Customization
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[9/9] Testing Multi-Provider AI & Theme/Font Customization...');

import { THEME_PRESETS, FONT_FAMILIES, isColorDark } from '../lib/themeManager.ts';
import { askAi, formatAiContextPrompt } from '../lib/aiService.ts';
import { useSettingsStore } from '../store/settingsStore.ts';

test('Theme Presets, Color Luminance and Font Families definitions', () => {
  assert(THEME_PRESETS.length >= 7, 'Must define at least 7 theme presets');
  const catppuccin = THEME_PRESETS.find(p => p.id === 'catppuccin');
  const vscodeDark = THEME_PRESETS.find(p => p.id === 'vscode-dark');
  const githubLight = THEME_PRESETS.find(p => p.id === 'github-light');
  const custom = THEME_PRESETS.find(p => p.id === 'custom');

  assert(!!catppuccin, 'Catppuccin preset must exist');
  assert(!!vscodeDark, 'VS Code Dark preset must exist');
  assert(!!githubLight, 'GitHub Light preset must exist');
  assert(!!custom, 'Custom preset must exist');

  // Luminance checks
  assert(isColorDark('#1e1e2e') === true, '#1e1e2e must be dark');
  assert(isColorDark('#000000') === true, '#000000 must be dark');
  assert(isColorDark('#ffffff') === false, '#ffffff must be light');
  assert(isColorDark('#f8f9fa') === false, '#f8f9fa must be light');

  // Font family checks
  assert(FONT_FAMILIES.length >= 5, 'Must offer at least 5 font families');
  assert(FONT_FAMILIES.some(f => f.id === 'JetBrains Mono'), 'JetBrains Mono must be listed');
  assert(FONT_FAMILIES.some(f => f.id === 'Fira Code'), 'Fira Code must be listed');
});

test('Settings Store manages Theme, Custom Colors, Fonts and AI Providers', () => {
  const store = useSettingsStore.getState();
  
  // Test updating editor appearance
  store.updateSettings({
    editorTheme: 'monokai',
    fontFamily: 'Fira Code',
    customBgColor: '#2b2b2b',
    customTextColor: '#a9b7c6',
  });

  const s1 = useSettingsStore.getState();
  assertEq(s1.editorTheme, 'monokai', 'Editor theme should update to monokai');
  assertEq(s1.fontFamily, 'Fira Code', 'Font family should update to Fira Code');
  assertEq(s1.customBgColor, '#2b2b2b', 'customBgColor should update');
  assertEq(s1.customTextColor, '#a9b7c6', 'customTextColor should update');

  // Test updating AI providers
  store.updateSettings({
    aiProvider: 'openai',
    openaiApiKey: 'sk-test-key-12345',
    openaiModel: 'gpt-4o-mini',
  });

  const s2 = useSettingsStore.getState();
  assertEq(s2.aiProvider, 'openai', 'AI provider should switch to openai');
  assertEq(s2.openaiApiKey, 'sk-test-key-12345', 'OpenAI key should be saved');
  assertEq(s2.openaiModel, 'gpt-4o-mini', 'OpenAI model should be gpt-4o-mini');

  // Test Anthropic provider
  store.updateSettings({
    aiProvider: 'anthropic',
    anthropicApiKey: 'sk-ant-test-key-67890',
    anthropicModel: 'claude-3-5-haiku-20241022',
  });

  const s3 = useSettingsStore.getState();
  assertEq(s3.aiProvider, 'anthropic', 'AI provider should switch to anthropic');
  assertEq(s3.anthropicApiKey, 'sk-ant-test-key-67890', 'Anthropic key should be saved');
  assertEq(s3.anthropicModel, 'claude-3-5-haiku-20241022', 'Anthropic model should be haiku');

  // Clean reset
  store.updateSettings({
    aiProvider: 'gemini',
    editorTheme: 'catppuccin',
    fontFamily: 'JetBrains Mono',
    customBgColor: '#1e1e2e',
    customTextColor: '#cdd6f4',
  });
});

test('askAi correctly delegates based on active AI provider with offline fallback', async () => {
  const dummyContext = {
    source: 'MOV AX, 42h\nHLT',
    cpuSnapshot: null,
    asmErrors: [],
    currentLine: 1,
  };

  // Test OpenAI provider fallback
  useSettingsStore.getState().updateSettings({
    aiProvider: 'openai',
    openaiApiKey: '',
  });
  const openAiReply = await askAi('Explain this instruction', dummyContext);
  assert(openAiReply.includes('OpenAI API Key'), 'Offline response for OpenAI should instruct user to set OpenAI key');

  // Test Anthropic provider fallback
  useSettingsStore.getState().updateSettings({
    aiProvider: 'anthropic',
    anthropicApiKey: '',
  });
  const anthropicReply = await askAi('Explain this instruction', dummyContext);
  assert(anthropicReply.includes('Anthropic Claude API Key'), 'Offline response for Anthropic should instruct user to set Claude key');

  // Reset back to Gemini
  useSettingsStore.getState().updateSettings({ aiProvider: 'gemini' });
});

test('Future-proof arbitrary model IDs (GPT-6, GPT-5.5, Claude 4, Gemini 4) and custom base URLs', () => {
  const store = useSettingsStore.getState();

  // Test setting future model IDs and custom proxy endpoints
  store.updateSettings({
    openaiModel: 'gpt-6',
    openaiBaseUrl: 'https://openrouter.ai/api/v1',
    anthropicModel: 'claude-4-sonnet',
    geminiModel: 'gemini-4.0-flash',
  });

  const state = useSettingsStore.getState();
  assertEq(state.openaiModel, 'gpt-6', 'Must accept future GPT-6 model identifier');
  assertEq(state.openaiBaseUrl, 'https://openrouter.ai/api/v1', 'Must accept custom OpenAI proxy/base URL');
  assertEq(state.anthropicModel, 'claude-4-sonnet', 'Must accept future Claude-4 model identifier');
  assertEq(state.geminiModel, 'gemini-4.0-flash', 'Must accept future Gemini-4 model identifier');

  // Also test GPT-5.5
  store.updateSettings({ openaiModel: 'gpt-5.5' });
  assertEq(useSettingsStore.getState().openaiModel, 'gpt-5.5', 'Must accept GPT-5.5 model identifier');
});



// ─────────────────────────────────────────────────────────────────────────────
// Final Report
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n======================================================');
const passedCount = results.filter(r => r.passed).length;
const totalCount = results.length;
const failedCount = totalCount - passedCount;

if (failedCount === 0) {
  console.log(`🎉 ALL ${totalCount} CHECKS PASSED PERFECTLY! (100% SUCCESS)`);
} else {
  console.error(`⚠️ ${failedCount} of ${totalCount} CHECKS FAILED!`);
}
console.log('======================================================\n');

if (failedCount > 0) {
  process.exit(1);
}
