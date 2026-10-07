import TrafficLightDevice from './TrafficLightDevice';
import LedBarDevice from './LedBarDevice';
import SevenSegmentDevice from './SevenSegmentDevice';
import { Cpu } from 'lucide-react';

export default function VirtualDevicesPanel() {
  return (
    <div className="h-full flex flex-col bg-editor-panel overflow-y-auto p-3 space-y-4">
      <div className="flex items-center gap-2 border-b border-editor-border pb-2">
        <Cpu className="w-4 h-4 text-editor-accent" />
        <span className="text-xs font-semibold text-editor-text uppercase tracking-wider">
          Virtual Hardware I/O
        </span>
      </div>

      {/* Traffic Lights */}
      <TrafficLightDevice />

      {/* LED Bar */}
      <LedBarDevice />

      {/* 7-Segment Display */}
      <SevenSegmentDevice />
    </div>
  );
}

