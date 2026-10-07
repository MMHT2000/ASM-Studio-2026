import { useEmulatorStore } from '../../store/emulatorStore';

const FLAGS: Array<{ key: keyof import('../../lib/emulator').Flags; label: string; desc: string }> = [
  { key: 'CF', label: 'CF', desc: 'Carry — set when arithmetic produces a carry/borrow out of the MSB' },
  { key: 'ZF', label: 'ZF', desc: 'Zero — set when result is 0' },
  { key: 'SF', label: 'SF', desc: 'Sign — equals MSB of result (1 = negative in signed arithmetic)' },
  { key: 'OF', label: 'OF', desc: 'Overflow — set when signed arithmetic result overflows' },
  { key: 'PF', label: 'PF', desc: 'Parity — set when low byte of result has an even number of 1-bits' },
  { key: 'AF', label: 'AF', desc: 'Aux Carry — carry from bit 3 (used in BCD arithmetic)' },
  { key: 'DF', label: 'DF', desc: 'Direction — controls string instruction direction (0=up, 1=down)' },
  { key: 'IF', label: 'IF', desc: 'Interrupt Enable — 1 = maskable interrupts enabled' },
  { key: 'TF', label: 'TF', desc: 'Trap — 1 = single-step mode (triggers INT 1 after each instruction)' },
];

export default function FlagsPanel() {
  const cpu = useEmulatorStore(s => s.cpuSnapshot);

  if (!cpu) {
    return (
      <div className="bg-editor-panel border-t border-editor-border">
        <div className="px-3 py-2 text-editor-subtext text-xs font-semibold uppercase tracking-widest">Flags</div>
      </div>
    );
  }

  const flagsWord = flagsToWord(cpu.flags);

  return (
    <div className="bg-editor-panel border-t border-editor-border">
      <div className="px-3 py-1.5 flex items-center justify-between border-b border-editor-border">
        <span className="text-editor-subtext text-xs font-semibold uppercase tracking-widest">Flags</span>
        <span className="font-mono text-editor-subtext text-xs" title="FLAGS register value">
          FLAGS={flagsWord.toString(16).toUpperCase().padStart(4,'0')}
        </span>
      </div>
      <div className="p-2 flex flex-wrap gap-1">
        {FLAGS.map(({ key, label, desc }) => {
          const on = cpu.flags[key];
          return (
            <div
              key={key}
              title={desc}
              className={`flex flex-col items-center px-2 py-1 rounded cursor-default select-none transition-all duration-200 min-w-[36px] ${
                on
                  ? 'bg-editor-accent/20 border border-editor-accent/60 text-editor-accent'
                  : 'bg-editor-surface/30 border border-editor-border text-editor-subtext'
              }`}
            >
              <span className="text-[10px] font-semibold uppercase">{label}</span>
              <span className={`text-xs font-mono font-bold ${on ? 'text-editor-accent' : 'text-editor-subtext'}`}>
                {on ? '1' : '0'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function flagsToWord(f: import('../../lib/emulator').Flags): number {
  return (
    (f.CF ? 0x0001 : 0) |
    (f.PF ? 0x0004 : 0) |
    (f.AF ? 0x0010 : 0) |
    (f.ZF ? 0x0040 : 0) |
    (f.SF ? 0x0080 : 0) |
    (f.TF ? 0x0100 : 0) |
    (f.IF ? 0x0200 : 0) |
    (f.DF ? 0x0400 : 0) |
    (f.OF ? 0x0800 : 0) |
    0xF002
  );
}

