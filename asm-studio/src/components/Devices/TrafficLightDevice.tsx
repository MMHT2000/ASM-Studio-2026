import { useEmulatorStore } from '../../store/emulatorStore';

// Emu8086 Standard Port for Traffic Lights: 0379h (Port 889)
// Bit pattern:
// Bit 0: South Green
// Bit 1: South Yellow
// Bit 2: South Red
// Bit 3: North Green
// Bit 4: North Yellow
// Bit 5: North Red
export default function TrafficLightDevice() {
  const ioPorts = useEmulatorStore(s => s.cpuSnapshot?.ioPorts ?? {});
  const portVal = ioPorts[0x0379] ?? ioPorts[889] ?? 0;

  // Bits:
  // North: Red (bit 5), Yellow (bit 4), Green (bit 3)
  // South: Red (bit 2), Yellow (bit 1), Green (bit 0)
  const nRed    = !!(portVal & (1 << 5));
  const nYellow = !!(portVal & (1 << 4));
  const nGreen  = !!(portVal & (1 << 3));

  const sRed    = !!(portVal & (1 << 2));
  const sYellow = !!(portVal & (1 << 1));
  const sGreen  = !!(portVal & (1 << 0));

  return (
    <div className="bg-editor-surface/30 p-3 rounded-lg border border-editor-border flex flex-col items-center">
      <div className="flex items-center justify-between w-full mb-2">
        <span className="text-xs font-semibold text-editor-text">Traffic Lights</span>
        <span className="text-[10px] font-mono text-editor-subtext bg-editor-surface px-1.5 py-0.5 rounded">
          Port 0379h: {portVal.toString(16).toUpperCase().padStart(2, '0')}h
        </span>
      </div>

      <div className="flex gap-6 items-center">
        {/* North Light */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-editor-subtext mb-1">North</span>
          <div className="bg-editor-bg border-2 border-editor-border p-1.5 rounded-lg flex flex-col gap-1.5 shadow-inner">
            <Light color="red" active={nRed} />
            <Light color="yellow" active={nYellow} />
            <Light color="green" active={nGreen} />
          </div>
        </div>

        {/* Intersection Graphic */}
        <div className="flex flex-col items-center text-editor-subtext/40 text-[10px]">
          <div>▲ N</div>
          <div className="w-10 h-10 border border-dashed border-editor-border rounded flex items-center justify-center font-mono my-1">
            +
          </div>
          <div>▼ S</div>
        </div>

        {/* South Light */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-editor-subtext mb-1">South</span>
          <div className="bg-editor-bg border-2 border-editor-border p-1.5 rounded-lg flex flex-col gap-1.5 shadow-inner">
            <Light color="red" active={sRed} />
            <Light color="yellow" active={sYellow} />
            <Light color="green" active={sGreen} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Light({ color, active }: { color: 'red' | 'yellow' | 'green'; active: boolean }) {
  const styles = {
    red: active
      ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.9)] border-rose-300'
      : 'bg-rose-950/40 border-rose-900/40',
    yellow: active
      ? 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)] border-amber-200'
      : 'bg-amber-950/40 border-amber-900/40',
    green: active
      ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.9)] border-emerald-300'
      : 'bg-emerald-950/40 border-emerald-900/40',
  };

  return (
    <div
      className={`w-6 h-6 rounded-full border transition-all duration-150 ${styles[color]}`}
    />
  );
}

