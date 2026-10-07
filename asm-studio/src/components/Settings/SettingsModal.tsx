import { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, X, Sliders, Cpu, 
  Sparkles, Keyboard, RotateCcw, Check, Eye, EyeOff, ExternalLink,
  Palette, Type, Coffee
} from 'lucide-react';
import { useSettingsStore, type AiProvider } from '../../store/settingsStore';
import { THEME_PRESETS, FONT_FAMILIES, type EditorThemeId } from '../../lib/themeManager';

type SettingsTab = 'editor' | 'emulator' | 'ai' | 'shortcuts';

export default function SettingsModal() {
  const isOpen          = useSettingsStore(s => s.isSettingsOpen);
  const close           = useSettingsStore(s => s.closeSettings);
  const reset           = useSettingsStore(s => s.resetToDefaults);
  const update          = useSettingsStore(s => s.updateSettings);

  const fontSize        = useSettingsStore(s => s.fontSize);
  const tabSize         = useSettingsStore(s => s.tabSize);
  const minimap         = useSettingsStore(s => s.minimap);
  const wordWrap        = useSettingsStore(s => s.wordWrap);
  const lineNumbers     = useSettingsStore(s => s.lineNumbers);
  const editorTheme     = useSettingsStore(s => s.editorTheme);
  const fontFamily      = useSettingsStore(s => s.fontFamily);
  const customBgColor   = useSettingsStore(s => s.customBgColor);
  const customTextColor = useSettingsStore(s => s.customTextColor);

  const maxStepLimit    = useSettingsStore(s => s.maxStepLimit);
  const historySize     = useSettingsStore(s => s.historySize);
  const highlightRegs   = useSettingsStore(s => s.highlightRegs);

  const aiProvider      = useSettingsStore(s => s.aiProvider);
  const geminiApiKey    = useSettingsStore(s => s.geminiApiKey);
  const geminiModel     = useSettingsStore(s => s.geminiModel);
  const openaiApiKey    = useSettingsStore(s => s.openaiApiKey);
  const openaiModel     = useSettingsStore(s => s.openaiModel);
  const openaiBaseUrl   = useSettingsStore(s => s.openaiBaseUrl);
  const anthropicApiKey = useSettingsStore(s => s.anthropicApiKey);
  const anthropicModel  = useSettingsStore(s => s.anthropicModel);
  const tutorStyle      = useSettingsStore(s => s.tutorStyle);

  const [activeTab, setActiveTab] = useState<SettingsTab>('editor');
  const [showKey, setShowKey]     = useState(false);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, close]);

  if (!isOpen) return null;

  const currentPreset = THEME_PRESETS.find(p => p.id === editorTheme);

  const handleThemeChange = (themeId: EditorThemeId) => {
    const targetPreset = THEME_PRESETS.find(p => p.id === themeId);
    if (targetPreset && themeId !== 'custom') {
      update({
        editorTheme: themeId,
        customBgColor: targetPreset.defaultBg,
        customTextColor: targetPreset.defaultFg,
      });
    } else {
      update({ editorTheme: themeId });
    }
  };

  const handleColorChange = (key: 'customBgColor' | 'customTextColor', val: string) => {
    update({
      [key]: val,
      editorTheme: 'custom',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div 
        className="bg-editor-panel border border-editor-border rounded-xl shadow-2xl w-full max-w-2xl h-[560px] flex flex-col overflow-hidden text-editor-text select-none"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-editor-border flex items-center justify-between bg-editor-bg/40">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-editor-accent" />
            <h2 className="text-sm font-bold text-editor-text tracking-wide">Settings & Preferences</h2>
          </div>
          <button
            onClick={close}
            className="text-editor-subtext hover:text-editor-text p-1 hover:bg-editor-surface rounded-md transition"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body (Sidebar + Content) */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Settings Tabs Sidebar */}
          <div className="w-44 bg-editor-bg/50 border-r border-editor-border p-2 space-y-1 shrink-0">
            <TabButton 
              active={activeTab === 'editor'} 
              icon={<Sliders className="w-3.5 h-3.5 text-editor-blue" />}
              label="Editor" 
              onClick={() => setActiveTab('editor')} 
            />
            <TabButton 
              active={activeTab === 'emulator'} 
              icon={<Cpu className="w-3.5 h-3.5 text-editor-amber" />}
              label="Emulator" 
              onClick={() => setActiveTab('emulator')} 
            />
            <TabButton 
              active={activeTab === 'ai'} 
              icon={<Sparkles className="w-3.5 h-3.5 text-editor-mauve" />}
              label="AI Co-Pilot" 
              onClick={() => setActiveTab('ai')} 
            />
            <TabButton 
              active={activeTab === 'shortcuts'} 
              icon={<Keyboard className="w-3.5 h-3.5 text-editor-green" />}
              label="Shortcuts & Info" 
              onClick={() => setActiveTab('shortcuts')} 
            />
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-5 text-xs space-y-5">
            {/* ── EDITOR TAB ────────────────────────────────────────── */}
            {activeTab === 'editor' && (
              <div className="space-y-4">
                <SectionHeader title="Editor Theme & Typography" />

                {/* Theme Selector */}
                <SettingRow label="Theme Preset" description="Syntax color scheme and editor ambiance.">
                  <select
                    value={editorTheme}
                    onChange={e => handleThemeChange(e.target.value as EditorThemeId)}
                    className="bg-editor-bg border border-editor-border rounded px-2.5 py-1 text-editor-text outline-none focus:border-editor-accent"
                  >
                    {THEME_PRESETS.map(preset => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name}
                      </option>
                    ))}
                  </select>
                </SettingRow>

                {/* Font Family */}
                <SettingRow label="Font Family" description="Monospace font family used in the code editor.">
                  <select
                    value={fontFamily}
                    onChange={e => update({ fontFamily: e.target.value })}
                    className="bg-editor-bg border border-editor-border rounded px-2.5 py-1 text-editor-text outline-none focus:border-editor-accent"
                  >
                    {FONT_FAMILIES.map(font => (
                      <option key={font.id} value={font.id}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </SettingRow>

                {/* Custom Color Pickers */}
                <div className="p-3 rounded-lg bg-editor-bg/70 border border-editor-border/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-semibold text-editor-text">
                      <Palette className="w-3.5 h-3.5 text-editor-accent" />
                      <span>Custom Color Overrides</span>
                    </div>
                    {editorTheme === 'custom' && (
                      <span className="text-[10px] text-editor-accent bg-editor-accent/10 px-1.5 py-0.5 rounded border border-editor-accent/20">
                        Custom Active
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Background Color */}
                    <div>
                      <label className="text-[11px] text-editor-subtext block mb-1">Editor Background:</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customBgColor}
                          onChange={e => handleColorChange('customBgColor', e.target.value)}
                          className="w-7 h-7 rounded border border-editor-border cursor-pointer bg-transparent p-0"
                          title="Choose background color"
                        />
                        <input
                          type="text"
                          value={customBgColor}
                          onChange={e => handleColorChange('customBgColor', e.target.value)}
                          className="w-24 bg-editor-surface border border-editor-border rounded px-2 py-1 font-mono text-[11px] text-editor-text outline-none focus:border-editor-accent uppercase"
                        />
                      </div>
                    </div>

                    {/* Text Foreground Color */}
                    <div>
                      <label className="text-[11px] text-editor-subtext block mb-1">Default Text Color:</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customTextColor}
                          onChange={e => handleColorChange('customTextColor', e.target.value)}
                          className="w-7 h-7 rounded border border-editor-border cursor-pointer bg-transparent p-0"
                          title="Choose text color"
                        />
                        <input
                          type="text"
                          value={customTextColor}
                          onChange={e => handleColorChange('customTextColor', e.target.value)}
                          className="w-24 bg-editor-surface border border-editor-border rounded px-2 py-1 font-mono text-[11px] text-editor-text outline-none focus:border-editor-accent uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Real-time Theme Preview Swatch */}
                  <div 
                    className="mt-2 p-2.5 rounded border border-editor-border font-mono text-[11px] leading-relaxed transition-colors shadow-inner"
                    style={{ 
                      backgroundColor: customBgColor, 
                      color: customTextColor,
                      fontFamily: FONT_FAMILIES.find(f => f.id === fontFamily)?.css || 'monospace'
                    }}
                  >
                    <span style={{ opacity: 0.6 }}>; Live Preview ({currentPreset?.name || 'Custom'})</span><br />
                    <span style={{ color: '#cba6f7', fontWeight: 'bold' }}>MOV</span> AX, @data<br />
                    <span style={{ color: '#cba6f7', fontWeight: 'bold' }}>MOV</span> DS, AX<br />
                    <span style={{ color: '#f9e2af' }}>msg</span> <span style={{ color: '#fab387' }}>DB</span> <span style={{ color: '#a6e3a1' }}>'Hello 8086!$'</span>
                  </div>
                </div>

                <SectionHeader title="Editor Layout & Scrolling" />

                {/* Font Size */}
                <SettingRow label="Font Size" description="Controls the editor code font size in pixels.">
                  <select
                    value={fontSize}
                    onChange={e => update({ fontSize: Number(e.target.value) })}
                    className="bg-editor-bg border border-editor-border rounded px-2.5 py-1 text-editor-text outline-none focus:border-editor-accent"
                  >
                    <option value={12}>12 px</option>
                    <option value={13}>13 px</option>
                    <option value={14}>14 px (Default)</option>
                    <option value={16}>16 px</option>
                    <option value={18}>18 px</option>
                  </select>
                </SettingRow>

                {/* Tab Size */}
                <SettingRow label="Tab Size" description="Number of spaces equivalent to one tab press.">
                  <select
                    value={tabSize}
                    onChange={e => update({ tabSize: Number(e.target.value) })}
                    className="bg-editor-bg border border-editor-border rounded px-2.5 py-1 text-editor-text outline-none focus:border-editor-accent"
                  >
                    <option value={2}>2 spaces</option>
                    <option value={4}>4 spaces (Default)</option>
                    <option value={8}>8 spaces</option>
                  </select>
                </SettingRow>

                {/* Minimap */}
                <SettingToggle
                  label="Code Minimap"
                  description="Displays the vertical miniature code overview scrollbar on the right."
                  checked={minimap}
                  onChange={v => update({ minimap: v })}
                />

                {/* Word Wrap */}
                <SettingToggle
                  label="Word Wrap"
                  description="Wrap long comment lines to fit within editor width."
                  checked={wordWrap}
                  onChange={v => update({ wordWrap: v })}
                />

                {/* Line Numbers */}
                <SettingToggle
                  label="Line Numbers"
                  description="Show line numbers along the left editor gutter."
                  checked={lineNumbers}
                  onChange={v => update({ lineNumbers: v })}
                />
              </div>
            )}

            {/* ── EMULATOR TAB ──────────────────────────────────────── */}
            {activeTab === 'emulator' && (
              <div className="space-y-4">
                <SectionHeader title="CPU & Emulation Engine" />

                {/* Max Step Limit */}
                <SettingRow 
                  label="Infinite Loop Step Limit" 
                  description="Maximum instructions executed in Run mode before halting to protect against infinite loops."
                >
                  <select
                    value={maxStepLimit}
                    onChange={e => update({ maxStepLimit: Number(e.target.value) })}
                    className="bg-editor-bg border border-editor-border rounded px-2.5 py-1 text-editor-text outline-none focus:border-editor-accent"
                  >
                    <option value={10000}>10,000 steps</option>
                    <option value={50000}>50,000 steps</option>
                    <option value={100000}>100,000 steps (Default)</option>
                    <option value={500000}>500,000 steps</option>
                  </select>
                </SettingRow>

                {/* Time-Travel Stack */}
                <SettingRow 
                  label="Time-Travel History Buffer" 
                  description="Number of instruction steps recorded for backward stepping (Undo Step)."
                >
                  <select
                    value={historySize}
                    onChange={e => update({ historySize: Number(e.target.value) })}
                    className="bg-editor-bg border border-editor-border rounded px-2.5 py-1 text-editor-text outline-none focus:border-editor-accent"
                  >
                    <option value={50}>50 steps</option>
                    <option value={100}>100 steps</option>
                    <option value={150}>150 steps (Default)</option>
                    <option value={300}>300 steps</option>
                  </select>
                </SettingRow>

                {/* Highlight Regs */}
                <SettingToggle
                  label="Animate Register Modifications"
                  description="Registers glow amber when their value is mutated during execution."
                  checked={highlightRegs}
                  onChange={v => update({ highlightRegs: v })}
                />
              </div>
            )}

            {/* ── AI CO-PILOT TAB ──────────────────────────────────── */}
            {activeTab === 'ai' && (
              <div className="space-y-4">
                <SectionHeader title="AI Provider & Intelligence Model" />

                {/* Provider Selector */}
                <div>
                  <label className="font-semibold text-editor-text block mb-1.5">Active AI Provider</label>
                  <div className="grid grid-cols-3 gap-2">
                    <ProviderCard
                      id="gemini"
                      name="Google Gemini"
                      desc="Gemini 3.8 / 2.5 Flash"
                      active={aiProvider === 'gemini'}
                      onClick={() => update({ aiProvider: 'gemini' })}
                    />
                    <ProviderCard
                      id="openai"
                      name="OpenAI"
                      desc="GPT-4o / GPT-4o-mini"
                      active={aiProvider === 'openai'}
                      onClick={() => update({ aiProvider: 'openai' })}
                    />
                    <ProviderCard
                      id="anthropic"
                      name="Anthropic"
                      desc="Claude 3.5 Sonnet / Haiku"
                      active={aiProvider === 'anthropic'}
                      onClick={() => update({ aiProvider: 'anthropic' })}
                    />
                  </div>
                </div>

                {/* Active Provider Configuration */}
                {aiProvider === 'gemini' && (
                  <div className="p-3.5 rounded-lg bg-editor-bg/60 border border-editor-border/80 space-y-3.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-editor-text">Gemini API Key</label>
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-editor-blue hover:underline flex items-center gap-1"
                        >
                          Get free key from Google AI Studio <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="relative flex items-center">
                        <input
                          type={showKey ? 'text' : 'password'}
                          value={geminiApiKey}
                          onChange={e => update({ geminiApiKey: e.target.value })}
                          placeholder="Paste AIzaSy... key here"
                          className="w-full bg-editor-bg border border-editor-border rounded px-2.5 py-1.5 font-mono text-xs text-editor-text outline-none focus:border-editor-accent pr-10"
                        />
                        <button
                          onClick={() => setShowKey(!showKey)}
                          className="absolute right-1.5 text-editor-subtext hover:text-editor-text p-1 rounded"
                          title={showKey ? 'Hide key' : 'Show key'}
                        >
                          {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Gemini Model */}
                    <div className="space-y-1.5 pt-1 border-t border-editor-border/40">
                      <div className="flex items-center justify-between">
                        <label className="font-semibold text-editor-text">Gemini Model ID</label>
                        <span className="text-[10px] text-editor-subtext">Type any model or pick a preset</span>
                      </div>
                      <input
                        type="text"
                        value={geminiModel}
                        onChange={e => update({ geminiModel: e.target.value })}
                        placeholder="e.g. gemini-3.8-flash, gemini-3.0-pro, gemini-4.0"
                        className="w-full bg-editor-bg border border-editor-border rounded px-2.5 py-1.5 font-mono text-xs text-editor-text outline-none focus:border-editor-accent"
                      />
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[10px] text-editor-subtext">Presets:</span>
                        {['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-3.0-pro'].map(m => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => update({ geminiModel: m })}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition cursor-pointer ${
                              geminiModel === m 
                                ? 'bg-editor-accent/20 border-editor-accent text-editor-accent font-semibold' 
                                : 'bg-editor-surface border-editor-border text-editor-subtext hover:text-editor-text'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {aiProvider === 'openai' && (
                  <div className="p-3.5 rounded-lg bg-editor-bg/60 border border-editor-border/80 space-y-3.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-editor-text">OpenAI API Key</label>
                        <a
                          href="https://platform.openai.com/api-keys"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-editor-blue hover:underline flex items-center gap-1"
                        >
                          Get key from OpenAI Platform <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="relative flex items-center">
                        <input
                          type={showKey ? 'text' : 'password'}
                          value={openaiApiKey}
                          onChange={e => update({ openaiApiKey: e.target.value })}
                          placeholder="Paste sk-... key here"
                          className="w-full bg-editor-bg border border-editor-border rounded px-2.5 py-1.5 font-mono text-xs text-editor-text outline-none focus:border-editor-accent pr-10"
                        />
                        <button
                          onClick={() => setShowKey(!showKey)}
                          className="absolute right-1.5 text-editor-subtext hover:text-editor-text p-1 rounded"
                          title={showKey ? 'Hide key' : 'Show key'}
                        >
                          {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* OpenAI Model ID */}
                    <div className="space-y-1.5 pt-1 border-t border-editor-border/40">
                      <div className="flex items-center justify-between">
                        <label className="font-semibold text-editor-text">OpenAI Model ID</label>
                        <span className="text-[10px] text-editor-subtext">Type any model (GPT-5, GPT-5.5, GPT-6, o3-mini...)</span>
                      </div>
                      <input
                        type="text"
                        value={openaiModel}
                        onChange={e => update({ openaiModel: e.target.value })}
                        placeholder="e.g. gpt-4o, gpt-5, gpt-5.5, gpt-6, o3-mini"
                        className="w-full bg-editor-bg border border-editor-border rounded px-2.5 py-1.5 font-mono text-xs text-editor-text outline-none focus:border-editor-accent"
                      />
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[10px] text-editor-subtext">Presets:</span>
                        {['gpt-4o', 'gpt-4o-mini', 'gpt-5', 'gpt-5.5', 'gpt-6', 'o3-mini'].map(m => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => update({ openaiModel: m })}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition cursor-pointer ${
                              openaiModel === m 
                                ? 'bg-editor-accent/20 border-editor-accent text-editor-accent font-semibold' 
                                : 'bg-editor-surface border-editor-border text-editor-subtext hover:text-editor-text'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* OpenAI Base URL */}
                    <div className="space-y-1.5 pt-1 border-t border-editor-border/40">
                      <div className="flex items-center justify-between">
                        <label className="font-semibold text-editor-text">API Base URL</label>
                        <span className="text-[10px] text-editor-subtext">Custom proxy, OpenRouter, Ollama, LM Studio</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={openaiBaseUrl || 'https://api.openai.com/v1'}
                          onChange={e => update({ openaiBaseUrl: e.target.value })}
                          placeholder="https://api.openai.com/v1"
                          className="w-full bg-editor-bg border border-editor-border rounded px-2.5 py-1.5 font-mono text-xs text-editor-text outline-none focus:border-editor-accent"
                        />
                        <button
                          type="button"
                          onClick={() => update({ openaiBaseUrl: 'https://api.openai.com/v1' })}
                          className="px-2 py-1.5 rounded bg-editor-surface border border-editor-border text-[10px] text-editor-subtext hover:text-editor-text shrink-0 cursor-pointer"
                          title="Reset to default OpenAI endpoint"
                        >
                          Default
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[10px] text-editor-subtext">Endpoints:</span>
                        <button
                          type="button"
                          onClick={() => update({ openaiBaseUrl: 'https://api.openai.com/v1' })}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-editor-surface border border-editor-border text-editor-subtext hover:text-editor-text cursor-pointer"
                        >
                          Official OpenAI
                        </button>
                        <button
                          type="button"
                          onClick={() => update({ openaiBaseUrl: 'https://openrouter.ai/api/v1' })}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-editor-surface border border-editor-border text-editor-subtext hover:text-editor-text cursor-pointer"
                        >
                          OpenRouter
                        </button>
                        <button
                          type="button"
                          onClick={() => update({ openaiBaseUrl: 'http://localhost:11434/v1' })}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-editor-surface border border-editor-border text-editor-subtext hover:text-editor-text cursor-pointer"
                        >
                          Local Ollama
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {aiProvider === 'anthropic' && (
                  <div className="p-3.5 rounded-lg bg-editor-bg/60 border border-editor-border/80 space-y-3.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-editor-text">Anthropic API Key</label>
                        <a
                          href="https://console.anthropic.com/settings/keys"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-editor-blue hover:underline flex items-center gap-1"
                        >
                          Get key from Anthropic Console <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="relative flex items-center">
                        <input
                          type={showKey ? 'text' : 'password'}
                          value={anthropicApiKey}
                          onChange={e => update({ anthropicApiKey: e.target.value })}
                          placeholder="Paste sk-ant-... key here"
                          className="w-full bg-editor-bg border border-editor-border rounded px-2.5 py-1.5 font-mono text-xs text-editor-text outline-none focus:border-editor-accent pr-10"
                        />
                        <button
                          onClick={() => setShowKey(!showKey)}
                          className="absolute right-1.5 text-editor-subtext hover:text-editor-text p-1 rounded"
                          title={showKey ? 'Hide key' : 'Show key'}
                        >
                          {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Claude Model ID */}
                    <div className="space-y-1.5 pt-1 border-t border-editor-border/40">
                      <div className="flex items-center justify-between">
                        <label className="font-semibold text-editor-text">Claude Model ID</label>
                        <span className="text-[10px] text-editor-subtext">Type any model or pick a preset</span>
                      </div>
                      <input
                        type="text"
                        value={anthropicModel}
                        onChange={e => update({ anthropicModel: e.target.value })}
                        placeholder="e.g. claude-3-5-sonnet-20241022, claude-3-7-sonnet, claude-4"
                        className="w-full bg-editor-bg border border-editor-border rounded px-2.5 py-1.5 font-mono text-xs text-editor-text outline-none focus:border-editor-accent"
                      />
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[10px] text-editor-subtext">Presets:</span>
                        {['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-7-sonnet', 'claude-4'].map(m => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => update({ anthropicModel: m })}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition cursor-pointer ${
                              anthropicModel === m 
                                ? 'bg-editor-accent/20 border-editor-accent text-editor-accent font-semibold' 
                                : 'bg-editor-surface border-editor-border text-editor-subtext hover:text-editor-text'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tutor Verbosity */}
                <SettingRow label="Tutor Style" description="Length and depth of assembly explanations.">
                  <select
                    value={tutorStyle}
                    onChange={e => update({ tutorStyle: e.target.value as any })}
                    className="bg-editor-bg border border-editor-border rounded px-2.5 py-1 text-editor-text outline-none focus:border-editor-accent"
                  >
                    <option value="detailed">Detailed & Educational (Best for Students)</option>
                    <option value="concise">Concise & Direct (Quick Answers)</option>
                  </select>
                </SettingRow>

                <p className="text-[11px] text-editor-subtext bg-editor-bg/40 p-2.5 rounded border border-editor-border/60">
                  🔒 <strong>Privacy Guaranteed:</strong> API keys are kept exclusively in your client-side browser storage and sent directly to the official provider endpoint via HTTPS.
                </p>
              </div>
            )}

            {/* ── SHORTCUTS & INFO TAB ─────────────────────────────── */}
            {activeTab === 'shortcuts' && (
              <div className="space-y-4">
                <SectionHeader title="Keyboard Shortcuts" />

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <ShortcutItem keys="F5" label="Assemble & Load Program" />
                  <ShortcutItem keys="F6" label="Toggle Animate / Pause" />
                  <ShortcutItem keys="F7" label="Fast Run to Halt / Breakpoint" />
                  <ShortcutItem keys="F10" label="Step One Instruction Forward" />
                  <ShortcutItem keys="Shift + F10" label="Step Back (Time-Travel Undo)" />
                  <ShortcutItem keys="Ctrl + O" label="Open .asm File from Disk" />
                  <ShortcutItem keys="Ctrl + S" label="Save .asm File to Disk" />
                  <ShortcutItem keys="Ctrl + ," label="Open Settings Modal" />
                  <ShortcutItem keys="Click Gutter" label="Toggle Breakpoint on Line" />
                  <ShortcutItem keys="Double-Click RAM" label="Edit Memory Byte in RAM" />
                </div>

                <div className="pt-2 border-t border-editor-border/60">
                  <SectionHeader title="System Architecture" />
                  <p className="text-[11px] text-editor-subtext leading-relaxed mt-1">
                    <strong>ASM Studio</strong> emulates the Intel 8086 microprocessor in 16-bit Real Mode with a 64 KB flat addressable memory space (0000h–FFFFh), 14 general, index, pointer and segment registers, 9 status flags, and standard DOS <code className="text-editor-cyan font-mono">INT 21h</code> service interrupts.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-editor-border flex items-center justify-between bg-editor-bg/40">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (confirm('Reset all settings to default values?')) {
                  reset();
                }
              }}
              className="flex items-center gap-1.5 text-editor-subtext hover:text-editor-red text-xs transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Defaults</span>
            </button>

            <a
              href="https://buymeacoffee.com/MMHT2000"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 text-xs transition"
              title="Support development of ASM Studio"
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>Support on Buy Me a Coffee</span>
            </a>
          </div>

          <button
            onClick={close}
            className="px-4 py-1.5 rounded-md bg-editor-accent text-editor-bg text-xs font-semibold hover:bg-editor-accent/90 transition shadow-sm cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 text-xs font-medium transition cursor-pointer ${
        active 
          ? 'bg-editor-surface text-editor-text shadow-xs' 
          : 'text-editor-subtext hover:text-editor-text hover:bg-editor-surface/40'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ProviderCard({ id, name, desc, active, onClick }: { id: string; name: string; desc: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
        active 
          ? 'bg-editor-accent/10 border-editor-accent text-editor-accent' 
          : 'bg-editor-bg/50 border-editor-border text-editor-subtext hover:text-editor-text hover:border-editor-border/80'
      }`}
    >
      <div className="font-semibold text-xs flex items-center justify-between">
        <span>{name}</span>
        {active && <Check className="w-3 h-3 text-editor-accent" />}
      </div>
      <div className="text-[10px] opacity-80 mt-0.5">{desc}</div>
    </button>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-wider text-editor-accent pb-1 border-b border-editor-border/60">
      {title}
    </h3>
  );
}

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div>
        <div className="font-semibold text-editor-text">{label}</div>
        <div className="text-[11px] text-editor-subtext">{description}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SettingToggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div>
        <div className="font-semibold text-editor-text">{label}</div>
        <div className="text-[11px] text-editor-subtext">{description}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
          checked ? 'bg-editor-accent justify-end' : 'bg-editor-surface justify-start'
        }`}
      >
        <span className={`w-4 h-4 rounded-full bg-white shadow-md block transition-transform ${checked ? 'bg-editor-bg' : ''}`} />
      </button>
    </div>
  );
}

function ShortcutItem({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-center justify-between p-2 rounded bg-editor-bg/60 border border-editor-border/50">
      <span className="text-editor-subtext">{label}</span>
      <kbd className="bg-editor-surface text-editor-text font-mono px-1.5 py-0.5 rounded text-[10px] border border-editor-border/70">
        {keys}
      </kbd>
    </div>
  );
}
