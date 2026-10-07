import { useState } from 'react';
import { BookOpen, ChevronDown, Check, Code } from 'lucide-react';
import { CODE_SAMPLES, type CodeSample } from '../../lib/samples';
import { useEmulatorStore } from '../../store/emulatorStore';

export default function SampleSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(CODE_SAMPLES[0].id);
  const setSource = useEmulatorStore(s => s.setSource);
  const assemble = useEmulatorStore(s => s.assemble);

  const categories = Array.from(new Set(CODE_SAMPLES.map(s => s.category)));

  const handleSelect = (sample: CodeSample) => {
    setSelectedId(sample.id);
    setSource(sample.code);
    setIsOpen(false);
    // Auto-assemble immediately
    setTimeout(() => {
      useEmulatorStore.getState().assemble();
    }, 10);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-editor-surface hover:bg-editor-border text-editor-text border border-editor-border transition-colors duration-150"
      >
        <BookOpen className="w-3.5 h-3.5 text-editor-accent" />
        <span className="font-medium">Samples</span>
        <ChevronDown className="w-3 h-3 text-editor-subtext" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-1.5 w-72 origin-top-left rounded-md bg-editor-panel border border-editor-border shadow-xl z-50 overflow-hidden divide-y divide-editor-border">
            <div className="px-3 py-2 bg-editor-surface/40">
              <div className="text-xs font-semibold text-editor-accent flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5" />
                8086 Example Programs
              </div>
              <p className="text-[11px] text-editor-subtext mt-0.5">
                Choose a template to load into the editor
              </p>
            </div>

            <div className="max-h-80 overflow-y-auto py-1">
              {categories.map(cat => (
                <div key={cat} className="py-1">
                  <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-editor-subtext">
                    {cat}
                  </div>
                  {CODE_SAMPLES.filter(s => s.category === cat).map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSelect(s)}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-start gap-2 hover:bg-editor-surface/60 transition-colors ${
                        selectedId === s.id ? 'bg-editor-accent/15 text-editor-accent' : 'text-editor-text'
                      }`}
                    >
                      <div className="mt-0.5">
                        {selectedId === s.id ? (
                          <Check className="w-3 h-3 text-editor-accent" />
                        ) : (
                          <div className="w-3 h-3" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{s.title}</div>
                        <div className="text-[10px] text-editor-subtext leading-tight mt-0.5">
                          {s.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

