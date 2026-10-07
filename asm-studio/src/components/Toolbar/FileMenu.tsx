import { useState, useRef, useEffect } from 'react';
import { 
  FileText, FolderOpen, Save, FilePlus, Share2, 
  Download, Binary, Check, ChevronDown, Copy
} from 'lucide-react';
import { useEmulatorStore } from '../../store/emulatorStore';
import { 
  downloadFile, generateListing, generateBinary, 
  encodeSourceToHash, NEW_PROGRAM_TEMPLATE 
} from '../../lib/fileUtils';

export default function FileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const source = useEmulatorStore(s => s.source);
  const setSource = useEmulatorStore(s => s.setSource);
  const program = useEmulatorStore(s => s.program);
  const cpuSnapshot = useEmulatorStore(s => s.cpuSnapshot);
  const assemble = useEmulatorStore(s => s.assemble);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Global hotkeys for Ctrl+S and Ctrl+O
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveAsm();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [source]);

  const handleNewFile = () => {
    setIsOpen(false);
    if (confirm('Create a new program? Any unsaved edits will be replaced.')) {
      setSource(NEW_PROGRAM_TEMPLATE);
      setTimeout(() => assemble(), 50);
    }
  };

  const handleOpenFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (typeof content === 'string') {
        setSource(content);
        setTimeout(() => assemble(), 50);
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be opened again if desired
    e.target.value = '';
    setIsOpen(false);
  };

  const handleSaveAsm = () => {
    setIsOpen(false);
    downloadFile('program.asm', source, 'text/plain');
  };

  const handleExportListing = () => {
    setIsOpen(false);
    const listing = generateListing(program, source);
    downloadFile('program.lst', listing, 'text/plain');
  };

  const handleExportBinary = () => {
    setIsOpen(false);
    const bin = generateBinary(program, cpuSnapshot);
    downloadFile('program.com', bin, 'application/octet-stream');
  };

  const handleShareLink = () => {
    try {
      const hash = encodeSourceToHash(source);
      const url = new URL(window.location.href);
      url.hash = `code=${hash}`;
      window.history.replaceState(null, '', url.toString());

      navigator.clipboard.writeText(url.toString()).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    } catch (err) {
      console.error('Failed to copy share link:', err);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Hidden file input for opening .asm */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleOpenFile}
        accept=".asm,.s,.inc,.txt"
        className="hidden"
      />

      <div className="flex items-center gap-1">
        {/* File Dropdown Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition border font-medium ${
            isOpen 
              ? 'bg-editor-surface text-editor-text border-editor-accent/40' 
              : 'bg-editor-surface/60 hover:bg-editor-surface text-editor-subtext hover:text-editor-text border-editor-border/60'
          }`}
          title="File operations (New, Open, Save, Export)"
        >
          <FileText className="w-3.5 h-3.5 text-editor-accent" />
          <span>File</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>

        {/* Quick Share Button */}
        <button
          onClick={handleShareLink}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition border ${
            copied
              ? 'bg-editor-green/20 text-editor-green border-editor-green/40'
              : 'bg-editor-surface/40 hover:bg-editor-surface text-editor-subtext hover:text-editor-text border-editor-border/40'
          }`}
          title="Share code via URL link"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5 text-editor-blue" />}
          <span>{copied ? 'Copied Link!' : 'Share'}</span>
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-56 rounded-md shadow-xl bg-editor-panel border border-editor-border z-50 py-1.5 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-100">
          {/* New */}
          <button
            onClick={handleNewFile}
            className="w-full text-left px-3 py-1.5 text-xs text-editor-text hover:bg-editor-surface flex items-center justify-between group transition"
          >
            <div className="flex items-center gap-2">
              <FilePlus className="w-3.5 h-3.5 text-editor-accent" />
              <span>New Program</span>
            </div>
          </button>

          {/* Open */}
          <button
            onClick={() => { setIsOpen(false); fileInputRef.current?.click(); }}
            className="w-full text-left px-3 py-1.5 text-xs text-editor-text hover:bg-editor-surface flex items-center justify-between group transition"
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="w-3.5 h-3.5 text-editor-amber" />
              <span>Open .asm File…</span>
            </div>
            <kbd className="text-[10px] text-editor-subtext bg-editor-bg px-1 py-0.5 rounded">Ctrl+O</kbd>
          </button>

          {/* Save / Download */}
          <button
            onClick={handleSaveAsm}
            className="w-full text-left px-3 py-1.5 text-xs text-editor-text hover:bg-editor-surface flex items-center justify-between group transition"
          >
            <div className="flex items-center gap-2">
              <Save className="w-3.5 h-3.5 text-editor-green" />
              <span>Save / Download .asm</span>
            </div>
            <kbd className="text-[10px] text-editor-subtext bg-editor-bg px-1 py-0.5 rounded">Ctrl+S</kbd>
          </button>

          <div className="my-1 border-t border-editor-border/60" />

          {/* Export Listing */}
          <button
            onClick={handleExportListing}
            className="w-full text-left px-3 py-1.5 text-xs text-editor-text hover:bg-editor-surface flex items-center gap-2 transition"
          >
            <Download className="w-3.5 h-3.5 text-editor-mauve" />
            <span>Export Listing (.lst)</span>
          </button>

          {/* Export COM Binary */}
          <button
            onClick={handleExportBinary}
            className="w-full text-left px-3 py-1.5 text-xs text-editor-text hover:bg-editor-surface flex items-center gap-2 transition"
          >
            <Binary className="w-3.5 h-3.5 text-editor-cyan" />
            <span>Export COM Binary (.com)</span>
          </button>

          <div className="my-1 border-t border-editor-border/60" />

          {/* Share Link */}
          <button
            onClick={() => { setIsOpen(false); handleShareLink(); }}
            className="w-full text-left px-3 py-1.5 text-xs text-editor-text hover:bg-editor-surface flex items-center justify-between group transition"
          >
            <div className="flex items-center gap-2">
              <Copy className="w-3.5 h-3.5 text-editor-blue" />
              <span>Copy Share Link</span>
            </div>
            <span className="text-[10px] text-editor-subtext">URL Hash</span>
          </button>
        </div>
      )}
    </div>
  );
}

