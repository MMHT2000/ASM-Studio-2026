import { useEmulatorStore } from '../../store/emulatorStore';
import { getReg } from '../../lib/emulator';

const REG_GROUPS = [
  { label: 'General Purpose', regs: ['AX', 'BX', 'CX', 'DX'] },
  { label: 'Index & Pointer', regs: ['SI', 'DI', 'SP', 'BP'] },
  { label: 'Segments', regs: ['CS', 'DS', 'SS', 'ES'] },
  { label: 'Instruction Pointer', regs: ['IP'] },
];

const BYTE_PARTS: Record<string, [string, string]> = {
  AX: ['AH', 'AL'], BX: ['BH', 'BL'], CX: ['CH', 'CL'], DX: ['DH', 'DL'],
};

function toHex4(n: number) {
  return n.toString(16).toUpperCase().padStart(4, '0');
}
function toHex2(n: number) {
  return n.toString(16).toUpperCase().padStart(2, '0');
}
function toBin16(n: number) {
  return n.toString(2).padStart(16, '0');
}

export default function RegisterPanel() {
  const cpu     = useEmulatorStore(s => s.cpuSnapshot);
  const status  = useEmulatorStore(s => s.status);

  if (!cpu) {
    return (
      <div className="h-full flex flex-col bg-editor-panel">
        <PanelHeader title="Registers" />
        <div className="flex-1 flex items-center justify-center text-editor-subtext text-sm">
          Assemble a program to see CPU state
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-editor-panel overflow-y-auto">
      <PanelHeader title="Registers" />
      <div className="p-2 space-y-3 text-xs font-mono">
        {REG_GROUPS.map(group => (
          <div key={group.label}>
            <div className="text-editor-subtext uppercase tracking-widest text-[10px] px-1 mb-1">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.regs.map(reg => {
                const val     = getReg(cpu.regs, reg);
                const changed = cpu.changedRegs.has(reg);
                return (
                  <RegRow key={reg} name={reg} value={val} changed={changed} status={status} />
                );
              })}
            </div>

            {/* Byte sub-registers for AX/BX/CX/DX */}
            {group.regs
              .filter(r => BYTE_PARTS[r])
              .map(r => {
                const [hi, lo] = BYTE_PARTS[r];
                const hiVal = getReg(cpu.regs, hi);
                const loVal = getReg(cpu.regs, lo);
                return (
                  <div key={`${r}-bytes`} className="flex gap-2 mt-0.5 pl-4">
                    <ByteRow name={hi} value={hiVal} changed={cpu.changedRegs.has(hi) || cpu.changedRegs.has(r)} />
                    <ByteRow name={lo} value={loVal} changed={cpu.changedRegs.has(lo) || cpu.changedRegs.has(r)} />
                  </div>
                );
              })}
          </div>
        ))}

        {/* Binary view of a key register */}
        <div>
          <div className="text-editor-subtext uppercase tracking-widest text-[10px] px-1 mb-1">
            AX Binary
          </div>
          <div className="px-1 flex gap-px">
            {toBin16(cpu.regs.AX).split('').map((bit, i) => (
              <span
                key={i}
                className={`w-[13px] text-center rounded-sm ${
                  bit === '1' ? 'bg-editor-accent text-editor-bg font-bold' : 'bg-editor-surface text-editor-subtext'
                }`}
              >
                {bit}
              </span>
            ))}
          </div>
          <div className="px-1 flex gap-px mt-px">
            {Array.from({ length: 16 }, (_, i) => (
              <span key={i} className="w-[13px] text-center text-[8px] text-editor-subtext">
                {15 - i}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelHeader({ title }: { title: string }) {
  return (
    <div className="px-3 py-2 border-b border-editor-border text-editor-subtext text-xs font-semibold uppercase tracking-widest">
      {title}
    </div>
  );
}

function RegRow({ name, value, changed, status }: {
  name: string; value: number; changed: boolean; status: string;
}) {
  const isRunning = status === 'running';
  return (
    <div
      className={`flex items-center justify-between px-2 py-0.5 rounded transition-all duration-300 ${
        changed && !isRunning
          ? 'bg-editor-amber/20 border border-editor-amber/40'
          : 'hover:bg-editor-surface/50'
      }`}
    >
      <span className="text-editor-subtext w-6">{name}</span>
      <span className={`font-mono tracking-widest ${changed && !isRunning ? 'text-editor-amber' : 'text-editor-accent'}`}>
        {toHex4(value)}
      </span>
      <span className="text-editor-subtext ml-2 w-6 text-right">
        {value}
      </span>
    </div>
  );
}

function ByteRow({ name, value, changed }: { name: string; value: number; changed: boolean }) {
  return (
    <div className={`flex items-center gap-1 px-1 py-0.5 rounded text-[11px] ${changed ? 'text-editor-amber' : 'text-editor-subtext'}`}>
      <span>{name}</span>
      <span className="font-mono">{toHex2(value)}</span>
    </div>
  );
}

