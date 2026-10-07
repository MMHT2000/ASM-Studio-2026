import MonacoEditor, { loader, OnMount } from '@monaco-editor/react';
import { useRef, useEffect } from 'react';
import { useEmulatorStore } from '../../store/emulatorStore';
import { useSettingsStore } from '../../store/settingsStore';
import { ASM_LANGUAGE_ID, registerAsmLanguage } from './asmLanguage';
import { registerAndApplyTheme, FONT_FAMILIES, isColorDark } from '../../lib/themeManager';

// Use CDN for Monaco to avoid Vite worker bundling complexity
loader.config({
  paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs' },
});

export default function AsmEditor() {
  const source          = useEmulatorStore(s => s.source);
  const setSource       = useEmulatorStore(s => s.setSource);
  const asmErrors       = useEmulatorStore(s => s.asmErrors);
  const currentLine     = useEmulatorStore(s => s.currentLine);
  const breakpoints     = useEmulatorStore(s => s.breakpoints);
  const program         = useEmulatorStore(s => s.program);
  const toggleBP        = useEmulatorStore(s => s.toggleBreakpoint);
  const assemble        = useEmulatorStore(s => s.assemble);

  const fontSize        = useSettingsStore(s => s.fontSize);
  const tabSize         = useSettingsStore(s => s.tabSize);
  const minimap         = useSettingsStore(s => s.minimap);
  const wordWrap        = useSettingsStore(s => s.wordWrap);
  const lineNumbers     = useSettingsStore(s => s.lineNumbers);
  const editorTheme     = useSettingsStore(s => s.editorTheme);
  const fontFamily      = useSettingsStore(s => s.fontFamily);
  const customBgColor   = useSettingsStore(s => s.customBgColor);
  const customTextColor = useSettingsStore(s => s.customTextColor);

  const editorRef   = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef   = useRef<typeof import('monaco-editor') | null>(null);
  const decorations = useRef<string[]>([]);

  // Resolve font CSS
  const fontCss = FONT_FAMILIES.find(f => f.id === fontFamily)?.css || 
    (fontFamily ? `${fontFamily}, monospace` : 'JetBrains Mono, Fira Code, monospace');

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current  = editor;
    monacoRef.current  = monaco as unknown as typeof import('monaco-editor');
    registerAsmLanguage(monaco as unknown as typeof import('monaco-editor'));
    registerAndApplyTheme(monaco as unknown as typeof import('monaco-editor'), editorTheme, customBgColor, customTextColor);

    // Gutter click → toggle breakpoint
    editor.onMouseDown((e) => {
      if (e.target.type === 2 /* GUTTER_GLYPH_MARGIN */ || e.target.type === 3 /* GUTTER_LINE_NUMBERS */) {
        const lineNum = e.target.position?.lineNumber;
        if (lineNum === undefined || !program) return;
        // Find instruction at this line
        const instrIdx = program.instructions.findIndex(i => i.line === lineNum);
        if (instrIdx !== -1) toggleBP(instrIdx);
      }
    });

    // F5 → assemble
    editor.addCommand(monaco.KeyCode.F5, () => assemble());
  };

  // Re-apply theme and colors whenever settings change
  useEffect(() => {
    if (monacoRef.current) {
      registerAndApplyTheme(monacoRef.current, editorTheme, customBgColor, customTextColor);
    }
  }, [editorTheme, customBgColor, customTextColor]);

  // Update error markers
  useEffect(() => {
    const editor  = editorRef.current;
    const monaco  = monacoRef.current;
    if (!editor || !monaco) return;

    const model = editor.getModel();
    if (!model) return;

    const markers = asmErrors.map(e => ({
      severity: e.type === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
      startLineNumber: e.line,
      startColumn: 1,
      endLineNumber: e.line,
      endColumn: 999,
      message: e.msg,
    }));
    monaco.editor.setModelMarkers(model, 'assembler', markers);
  }, [asmErrors]);

  // Update decorations: current-line highlight + breakpoints
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const newDecs: import('monaco-editor').editor.IModelDeltaDecoration[] = [];

    // Breakpoints
    if (program) {
      for (const instrIdx of breakpoints) {
        const line = program.instructions[instrIdx]?.line;
        if (line !== undefined) {
          newDecs.push({
            range: new monaco.Range(line, 1, line, 1),
            options: {
              isWholeLine: false,
              glyphMarginClassName: 'breakpoint-glyph',
              overviewRuler: { color: '#f38ba8', position: monaco.editor.OverviewRulerLane.Left },
            },
          });
        }
      }
    }

    // Current line (execution pointer)
    if (currentLine > 0) {
      newDecs.push({
        range: new monaco.Range(currentLine, 1, currentLine, 1),
        options: {
          isWholeLine: true,
          className: 'current-line-highlight',
          glyphMarginClassName: 'arrow-glyph',
          overviewRuler: { color: '#f9e2af', position: monaco.editor.OverviewRulerLane.Center },
        },
      });
      editor.revealLineInCenterIfOutsideViewport(currentLine);
    }

    decorations.current = editor.deltaDecorations(decorations.current, newDecs);
  }, [currentLine, breakpoints, program]);

  return (
    <div className="h-full flex flex-col">
      <MonacoEditor
        height="100%"
        language={ASM_LANGUAGE_ID}
        theme="asm-catppuccin"
        value={source}
        onChange={(v) => setSource(v ?? '')}
        onMount={handleMount}
        options={{
          fontFamily: fontCss,
          fontSize,
          lineHeight: Math.round(fontSize * 1.55),
          minimap: { enabled: minimap },
          glyphMargin: true,
          lineNumbers: lineNumbers ? 'on' : 'off',
          renderLineHighlight: 'all',
          scrollBeyondLastLine: false,
          folding: true,
          wordWrap: wordWrap ? 'on' : 'off',
          automaticLayout: true,
          tabSize,
          insertSpaces: true,
          overviewRulerLanes: 3,
          suggestOnTriggerCharacters: true,
          quickSuggestions: { other: true, comments: false, strings: false },
          parameterHints: { enabled: false },
          autoClosingBrackets: 'always',
          formatOnPaste: false,
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
        }}
        loading={
          <div className="h-full flex items-center justify-center bg-editor-bg text-editor-subtext">
            Loading Monaco Editor…
          </div>
        }
      />

      {/* Inline CSS for glyph decorations */}
      <style>{`
        .breakpoint-glyph {
          background: #f38ba8;
          border-radius: 50%;
          width: 10px !important;
          height: 10px !important;
          margin-left: 3px;
          margin-top: 4px;
        }
        .arrow-glyph::before {
          content: '▶';
          color: #f9e2af;
          font-size: 10px;
          padding-left: 2px;
        }
        .current-line-highlight {
          background: rgba(249, 226, 175, 0.08) !important;
          border-left: 2px solid #f9e2af;
        }
      `}</style>
    </div>
  );
}

