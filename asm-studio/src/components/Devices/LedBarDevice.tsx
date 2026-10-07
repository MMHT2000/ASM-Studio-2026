import { useEmulatorStore } from '../../store/emulatorStore';

// Emu8086 Standard Port for 8-bit LED Bar: 0378h (LPT / Port 888)
export default function LedBarDevice() {
  const ioPorts = useEmulatorStore(s => s.cpuSnapshot?.ioPorts ?? {});
  const portVal = ioPorts[0x0378] ?? ioPorts[888] ?? 0;

  // 8 bits from bit 7 (MSB) down to bit 0 (LSB)
  const bits = Array.from({ length: 8 }, (_, i) => {
    const bitIndex = 7 - i;
    return {
      index: bitIndex,
      active: !!(portVal & (1 << bitIndex)),
    };
  });

  return (
    <div className="bg-editor-surface/30 p-3 rounded-lg border border-editor-border flex flex-col">
      <div className="flex items-center justify-between w-full mb-2">
        <span className="text-xs font-semibold text-editor-text">8-Bit LED Bar Graph</span>
        <span className="text-[10px] font-mono text-editor-subtext bg-editor-surface px-1.5 py-0.5 rounded">
          Port 0378h: {portVal.toString(16).toUpperCase().padStart(2, '0')}h ({portVal})
        </span>
      </div>

      <div className="flex justify-between items-center bg-editor-bg p-2 rounded-lg border border-editor-border">
        {bits.map(({ index, active }) => (
          <div key={index} className="flex flex-col items-center gap-1">
            <span className="text-[9px] text-editor-subtext font-mono">b{index}</span>
            <div
              className={`w-5 h-8 rounded-sm border transition-all duration-150 ${
                active
                  ? 'bg-emerald-400 border-emerald-200 shadow-[0_0_10px_rgba(52,211,153,0.9)]'
                  : 'bg-emerald-950/40 border-emerald-900/30'
              }`}
            />
            <span className={`text-[10px] font-mono font-bold ${active ? 'text-editor-green' : 'text-editor-subtext/40'}`}>
              {active ? '1' : '0'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

