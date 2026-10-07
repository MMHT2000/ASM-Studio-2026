import { useEmulatorStore } from '../../store/emulatorStore';

// Emu8086 Standard Port for 7-Segment Display: 0300h
// Maps 4-bit nibbles or BCD to standard 7-segment patterns:
// Segment layout:
//       a
//     f   b
//       g
//     e   c
//       d
const DIGIT_SEGMENTS: Record<number, number> = {
  0: 0b00111111,
  1: 0b00000110,
  2: 0b01011011,
  3: 0b01001111,
  4: 0b01100110,
  5: 0b01101101,
  6: 0b01111101,
  7: 0b00000111,
  8: 0b01111111,
  9: 0b01101111,
  10: 0b01110111, // A
  11: 0b01111100, // b
  12: 0b00111001, // C
  13: 0b01011110, // d
  14: 0b01111001, // E
  15: 0b01110001, // F
};

export default function SevenSegmentDevice() {
  const ioPorts = useEmulatorStore(s => s.cpuSnapshot?.ioPorts ?? {});
  const portVal = ioPorts[0x0300] ?? ioPorts[768] ?? 0;

  // Split word into 4 hex digits (or display byte as 2 digits)
  const d3 = (portVal >> 12) & 0x0F;
  const d2 = (portVal >> 8) & 0x0F;
  const d1 = (portVal >> 4) & 0x0F;
  const d0 = portVal & 0x0F;

  return (
    <div className="bg-editor-surface/30 p-3 rounded-lg border border-editor-border flex flex-col items-center">
      <div className="flex items-center justify-between w-full mb-2">
        <span className="text-xs font-semibold text-editor-text">4-Digit 7-Segment Display</span>
        <span className="text-[10px] font-mono text-editor-subtext bg-editor-surface px-1.5 py-0.5 rounded">
          Port 0300h: {portVal.toString(16).toUpperCase().padStart(4, '0')}h
        </span>
      </div>

      <div className="flex gap-2 bg-zinc-950 p-3 rounded-lg border-2 border-editor-border shadow-inner">
        <SingleDigit value={d3} />
        <SingleDigit value={d2} />
        <div className="w-1" />
        <SingleDigit value={d1} />
        <SingleDigit value={d0} />
      </div>
    </div>
  );
}

function SingleDigit({ value }: { value: number }) {
  const mask = DIGIT_SEGMENTS[value] ?? 0;

  const segA = !!(mask & 0b00000001);
  const segB = !!(mask & 0b00000010);
  const segC = !!(mask & 0b00000100);
  const segD = !!(mask & 0b00001000);
  const segE = !!(mask & 0b00010000);
  const segF = !!(mask & 0b00100000);
  const segG = !!(mask & 0b01000000);

  const onStyle  = 'fill-rose-500 drop-shadow-[0_0_4px_rgba(244,63,94,0.9)]';
  const offStyle = 'fill-rose-950/20';

  return (
    <div className="w-9 h-14 relative flex items-center justify-center">
      <svg viewBox="0 0 50 80" className="w-full h-full">
        {/* a (top) */}
        <polygon points="10,6 14,2 36,2 40,6 36,10 14,10" className={segA ? onStyle : offStyle} />
        {/* b (top right) */}
        <polygon points="41,8 45,12 45,36 41,40 37,36 37,12" className={segB ? onStyle : offStyle} />
        {/* c (bottom right) */}
        <polygon points="41,42 45,46 45,70 41,74 37,70 37,46" className={segC ? onStyle : offStyle} />
        {/* d (bottom) */}
        <polygon points="10,74 14,70 36,70 40,74 36,78 14,78" className={segD ? onStyle : offStyle} />
        {/* e (bottom left) */}
        <polygon points="9,42 13,46 13,70 9,74 5,70 5,46" className={segE ? onStyle : offStyle} />
        {/* f (top left) */}
        <polygon points="9,8 13,12 13,36 9,40 5,36 5,12" className={segF ? onStyle : offStyle} />
        {/* g (middle) */}
        <polygon points="10,40 14,36 36,36 40,40 36,44 14,44" className={segG ? onStyle : offStyle} />
      </svg>
    </div>
  );
}

