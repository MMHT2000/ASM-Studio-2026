import { useState, useRef, useEffect } from 'react';
import { HardDrive, Edit3, ArrowRight, CornerDownLeft } from 'lucide-react';
import { useEmulatorStore } from '../../store/emulatorStore';

const COLS = 16; // bytes per row

function toHex2(n: number) {
  return (n & 0xFF).toString(16).toUpperCase().padStart(2, '0');
}
function toHex4(n: number) {
  return (n & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}
function isPrintable(n: number) {
  return n >= 0x20 && n <= 0x7E;
}

export default function MemoryView() {
  const cpu           = useEmulatorStore(s => s.cpuSnapshot);
  const program       = useEmulatorStore(s => s.program);
  const setMemoryByte = useEmulatorStore(s => s.setMemoryByte);

  const [jumpAddr, setJumpAddr]         = useState('0300');
  const [viewStart, setViewStart]       = useState(0x0300);
  const [selectedAddr, setSelectedAddr] = useState<number | null>(0x0300);
  const [editingAddr, setEditingAddr]   = useState<number | null>(null);
  const [editValue, setEditValue]       = useState('');
  
  const editInputRef = useRef<HTMLInputElement>(null);
  const ROWS = 16;

  // Auto-focus and select input when entering edit mode
  useEffect(() => {
    if (editingAddr !== null && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingAddr]);

  if (!cpu) {
    return (
      <div className="h-full bg-editor-panel border-t border-editor-border flex flex-col">
        <PanelHeader />
        <div className="flex-1 flex items-center justify-center text-editor-subtext text-xs">
          No program loaded
        </div>
      </div>
    );
  }

  // Build variable address-to-name map for annotations
  const varAtAddr = new Map<number, string>();
  if (program) {
    for (const [, v] of program.vars) {
      for (let i = 0; i < v.byteSize; i++) {
        varAtAddr.set(v.address + i, i === 0 ? v.name : '');
      }
    }
  }

  const sp = cpu.regs.SP;

  const rows: number[] = [];
  for (let i = 0; i < ROWS; i++) {
    rows.push((viewStart + i * COLS) & 0xFFFF);
  }

  const handleJump = (target?: string) => {
    const val = target !== undefined ? target : jumpAddr;
    const addr = parseInt(val, 16);
    if (!isNaN(addr)) {
      const aligned = (addr & ~(COLS - 1)) & 0xFFFF;
      setViewStart(aligned);
      setSelectedAddr(addr & 0xFFFF);
    }
  };

  const startEditing = (addr: number) => {
    setSelectedAddr(addr);
    setEditingAddr(addr);
    setEditValue(toHex2(cpu.mem[addr]));
  };

  const commitEdit = (addr: number, nextAddrAfter?: number) => {
    const parsed = parseInt(editValue, 16);
    if (!isNaN(parsed)) {
      setMemoryByte(addr, parsed & 0xFF);
    }
    if (nextAddrAfter !== undefined) {
      setSelectedAddr(nextAddrAfter);
      setEditingAddr(nextAddrAfter);
      setEditValue(toHex2(cpu.mem[nextAddrAfter]));
    } else {
      setEditingAddr(null);
    }
  };

  const cancelEdit = () => {
    setEditingAddr(null);
  };

  // Keyboard navigation for selected cell
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editingAddr !== null) return; // handled by inline input
    if (selectedAddr === null) return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = (selectedAddr - 1) & 0xFFFF;
      setSelectedAddr(next);
      ensureVisible(next);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = (selectedAddr + 1) & 0xFFFF;
      setSelectedAddr(next);
      ensureVisible(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = (selectedAddr - COLS) & 0xFFFF;
      setSelectedAddr(next);
      ensureVisible(next);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (selectedAddr + COLS) & 0xFFFF;
      setSelectedAddr(next);
      ensureVisible(next);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      startEditing(selectedAddr);
    }
  };

  const ensureVisible = (addr: number) => {
    if (addr < viewStart) {
      setViewStart(addr & ~(COLS - 1));
    } else if (addr >= viewStart + ROWS * COLS) {
      setViewStart(((addr - (ROWS - 1) * COLS) & ~(COLS - 1)) & 0xFFFF);
    }
  };

  // Details for inspector footer
  const inspectByte = selectedAddr !== null ? cpu.mem[selectedAddr] : 0;
  const inspectNextByte = selectedAddr !== null ? cpu.mem[(selectedAddr + 1) & 0xFFFF] : 0;
  const inspectWord = (inspectByte | (inspectNextByte << 8)) & 0xFFFF;
  const inspectVarName = selectedAddr !== null ? varAtAddr.get(selectedAddr) : undefined;

  return (
    <div 
      className="h-full bg-editor-panel border-t border-editor-border flex flex-col focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <PanelHeader />

      {/* Jump & Quick Nav Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 border-b border-editor-border bg-editor-bg/40 text-xs">
        <span className="text-editor-subtext font-mono text-[11px]">Addr:</span>
        <input
          className="w-16 bg-editor-bg text-editor-text font-mono text-xs px-1.5 py-0.5 rounded border border-editor-border outline-none focus:border-editor-accent uppercase"
          value={jumpAddr}
          onChange={e => setJumpAddr(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleJump()}
          maxLength={4}
          placeholder="0300"
        />
        <button
          onClick={() => handleJump()}
          className="text-xs text-editor-accent hover:bg-editor-accent/20 px-1.5 py-0.5 rounded transition font-medium"
        >
          Go
        </button>

        {/* Quick jump presets */}
        <div className="flex items-center gap-1 ml-1">
          <QuickButton label=".DATA" addr="0300" onClick={addr => handleJump(addr)} />
          <QuickButton label=".CODE" addr="0100" onClick={addr => handleJump(addr)} />
          <QuickButton label="STACK" addr={toHex4(sp & ~0xF)} onClick={addr => handleJump(addr)} />
          <QuickButton label="IVT"   addr="0000" onClick={addr => handleJump(addr)} />
        </div>

        <div className="flex-1" />

        {/* Scroll arrows */}
        <div className="flex gap-0.5">
          <button
            onClick={() => setViewStart(v => Math.max(0, v - COLS * ROWS))}
            title="Page Up"
            className="text-editor-subtext hover:text-editor-text hover:bg-editor-surface text-xs px-1.5 py-0.5 rounded"
          >▲</button>
          <button
            onClick={() => setViewStart(v => Math.min(0xFFFF - COLS * ROWS, v + COLS * ROWS))}
            title="Page Down"
            className="text-editor-subtext hover:text-editor-text hover:bg-editor-surface text-xs px-1.5 py-0.5 rounded"
          >▼</button>
        </div>
      </div>

      {/* Hex Grid */}
      <div className="flex-1 overflow-auto p-2">
        <table className="text-[11px] font-mono w-full border-collapse select-none">
          <thead>
            <tr>
              <th className="text-editor-subtext text-left pr-2 pb-1 font-normal">Addr</th>
              {Array.from({ length: COLS }, (_, i) => (
                <th key={i} className="text-editor-subtext font-normal w-5.5 text-center pb-1">
                  {i.toString(16).toUpperCase()}
                </th>
              ))}
              <th className="text-editor-subtext font-normal pl-2 pb-1 text-left">ASCII</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(rowBase => {
              const bytes = Array.from({ length: COLS }, (_, i) => ({
                addr: (rowBase + i) & 0xFFFF,
                val: cpu.mem[(rowBase + i) & 0xFFFF],
              }));
              return (
                <tr key={rowBase} className="hover:bg-editor-surface/30">
                  {/* Address */}
                  <td className="pr-2 text-editor-subtext py-0.5">{toHex4(rowBase)}:</td>
                  
                  {/* Hex bytes */}
                  {bytes.map(({ addr, val }) => {
                    const isSelected = selectedAddr === addr;
                    const isEditing  = editingAddr === addr;
                    const isChanged  = cpu.changedAddrs.has(addr);
                    const isVar      = varAtAddr.has(addr);
                    const isSP       = addr === sp;

                    return (
                      <td
                        key={addr}
                        onClick={() => setSelectedAddr(addr)}
                        onDoubleClick={() => startEditing(addr)}
                        title={varAtAddr.get(addr) ? `${varAtAddr.get(addr)} (+${addr - (program?.vars.get(varAtAddr.get(addr)!)?.address ?? 0)})` : `0x${toHex4(addr)} — Double click to edit`}
                        className={`text-center py-0.5 px-0.5 rounded-sm transition-all relative cursor-pointer ${
                          isSelected  ? 'ring-1 ring-editor-accent bg-editor-accent/25 font-bold z-10' : ''
                        } ${
                          isSP        ? 'bg-editor-mauve/30 text-editor-mauve font-bold' :
                          isChanged   ? 'bg-editor-amber/25 text-editor-amber' :
                          isVar       ? 'bg-editor-accent/10 text-editor-accent' :
                          val === 0   ? 'text-editor-subtext/40' :
                          'text-editor-text'
                        }`}
                      >
                        {isEditing ? (
                          <input
                            ref={editInputRef}
                            value={editValue}
                            maxLength={2}
                            onChange={e => setEditValue(e.target.value.toUpperCase())}
                            onBlur={() => commitEdit(addr)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                commitEdit(addr);
                              } else if (e.key === 'Tab') {
                                e.preventDefault();
                                commitEdit(addr, (addr + (e.shiftKey ? -1 : 1)) & 0xFFFF);
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                cancelEdit();
                              }
                            }}
                            className="w-5 text-center bg-editor-panel text-editor-accent font-bold outline-none border border-editor-accent rounded text-[10px] uppercase p-0"
                          />
                        ) : (
                          toHex2(val)
                        )}
                      </td>
                    );
                  })}

                  {/* ASCII */}
                  <td className="pl-2 text-editor-subtext tracking-tight py-0.5 font-mono">
                    {bytes.map(({ addr, val }) => {
                      const isSelected = selectedAddr === addr;
                      const isChanged = cpu.changedAddrs.has(addr);
                      return (
                        <span
                          key={addr}
                          onClick={() => setSelectedAddr(addr)}
                          onDoubleClick={() => startEditing(addr)}
                          className={`cursor-pointer hover:text-editor-text ${
                            isSelected ? 'bg-editor-accent/30 text-editor-accent font-bold rounded-xs' : ''
                          } ${isChanged ? 'text-editor-amber' : ''}`}
                        >
                          {isPrintable(val) ? String.fromCharCode(val) : '.'}
                        </span>
                      );
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected Cell Inspector & Inline Editor Bar */}
      {selectedAddr !== null && (
        <div className="border-t border-editor-border bg-editor-panel/90 px-3 py-1.5 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-3 overflow-x-auto text-[11px]">
            <div>
              <span className="text-editor-subtext">Addr:</span>{' '}
              <span className="text-editor-accent font-bold">0x{toHex4(selectedAddr)}</span>
            </div>
            <div>
              <span className="text-editor-subtext">Hex:</span>{' '}
              <span className="text-editor-text font-bold">0x{toHex2(inspectByte)}</span>
            </div>
            <div>
              <span className="text-editor-subtext">Dec:</span>{' '}
              <span className="text-editor-text">{inspectByte}</span>
            </div>
            <div>
              <span className="text-editor-subtext">Bin:</span>{' '}
              <span className="text-editor-subtext">{inspectByte.toString(2).padStart(8, '0')}b</span>
            </div>
            <div>
              <span className="text-editor-subtext">ASCII:</span>{' '}
              <span className="text-editor-green">'{isPrintable(inspectByte) ? String.fromCharCode(inspectByte) : '.'}'</span>
            </div>
            <div>
              <span className="text-editor-subtext">Word:</span>{' '}
              <span className="text-editor-mauve">0x{toHex4(inspectWord)} ({inspectWord})</span>
            </div>
            {inspectVarName && (
              <div className="text-editor-cyan font-semibold">
                [{inspectVarName}]
              </div>
            )}
          </div>

          <button
            onClick={() => startEditing(selectedAddr)}
            className="flex items-center gap-1 text-[11px] bg-editor-surface hover:bg-editor-accent/20 hover:text-editor-accent px-2 py-0.5 rounded text-editor-subtext transition shrink-0 ml-2"
            title="Edit byte at this memory address"
          >
            <Edit3 className="w-3 h-3" />
            <span>Edit Byte</span>
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-3 px-3 py-1 bg-editor-bg/30 border-t border-editor-border/50 text-[10px] text-editor-subtext">
        <LegendItem color="bg-editor-accent/20" label="Variable" />
        <LegendItem color="bg-editor-amber/25" label="Changed" />
        <LegendItem color="bg-editor-mauve/30" label="Stack Pointer (SP)" />
        <div className="flex-1" />
        <span className="opacity-70">Tip: Double-click or press Enter to edit any byte</span>
      </div>
    </div>
  );
}

function PanelHeader() {
  return (
    <div className="px-3 py-1.5 flex items-center gap-1.5 border-b border-editor-border">
      <HardDrive className="w-3.5 h-3.5 text-editor-subtext" />
      <span className="text-editor-subtext text-xs font-semibold uppercase tracking-widest">Memory Hex View & Editor</span>
    </div>
  );
}

function QuickButton({ label, addr, onClick }: { label: string; addr: string; onClick: (addr: string) => void }) {
  return (
    <button
      onClick={() => onClick(addr)}
      className="text-[10px] font-mono bg-editor-surface/60 hover:bg-editor-surface text-editor-subtext hover:text-editor-text px-1.5 py-0.5 rounded border border-editor-border/50 transition"
      title={`Jump to ${label} (${addr}h)`}
    >
      {label}
    </button>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className={`w-2.5 h-2.5 rounded-xs ${color}`} />
      <span>{label}</span>
    </div>
  );
}
