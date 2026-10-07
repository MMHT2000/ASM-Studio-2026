import { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Send, Key, Trash2, Loader2, 
  HelpCircle, Zap, AlertTriangle, Flag, Check, Copy, Settings, ExternalLink
} from 'lucide-react';
import { useEmulatorStore } from '../../store/emulatorStore';
import { useSettingsStore } from '../../store/settingsStore';
import { askAi, getProviderDisplayName } from '../../lib/aiService';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export default function AiTutorPanel() {
  const [messages, setMessages]       = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "👋 **Hi, I'm your 8086 AI Tutor!**\n\nI can explain your code, debug crashes, explain status flags, and suggest 8086 assembly optimizations. Choose a quick action below or ask me any question!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [copiedId, setCopiedId]       = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const source          = useEmulatorStore(s => s.source);
  const cpuSnapshot     = useEmulatorStore(s => s.cpuSnapshot);
  const asmErrors       = useEmulatorStore(s => s.asmErrors);
  const currentLine     = useEmulatorStore(s => s.currentLine);

  const aiProvider      = useSettingsStore(s => s.aiProvider);
  const geminiApiKey    = useSettingsStore(s => s.geminiApiKey);
  const geminiModel     = useSettingsStore(s => s.geminiModel);
  const openaiApiKey    = useSettingsStore(s => s.openaiApiKey);
  const openaiModel     = useSettingsStore(s => s.openaiModel);
  const anthropicApiKey = useSettingsStore(s => s.anthropicApiKey);
  const anthropicModel  = useSettingsStore(s => s.anthropicModel);
  const openSettings    = useSettingsStore(s => s.openSettings);

  const activeKey = aiProvider === 'openai' 
    ? openaiApiKey 
    : aiProvider === 'anthropic' 
      ? anthropicApiKey 
      : (geminiApiKey || localStorage.getItem('asm_studio_gemini_key') || '');

  const activeModel = aiProvider === 'openai' 
    ? openaiModel 
    : aiProvider === 'anthropic' 
      ? anthropicModel 
      : geminiModel;

  const providerName = getProviderDisplayName(aiProvider);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input.trim();
    if (!textToSend || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInput('');
    setLoading(true);

    try {
      const reply = await askAi(textToSend, {
        source,
        cpuSnapshot,
        asmErrors,
        currentLine,
      });

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `⚠️ Error: ${err.message || 'Failed to generate response'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-editor-panel text-editor-text select-text text-xs">
      {/* Header */}
      <div className="px-3 py-1.5 border-b border-editor-border flex items-center justify-between bg-editor-bg/30">
        <div className="flex items-center gap-1.5 font-semibold text-editor-accent">
          <Sparkles className="w-4 h-4 text-editor-accent" />
          <span>{providerName} 8086 Tutor</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Key & Provider status button */}
          <button
            onClick={openSettings}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border transition cursor-pointer ${
              activeKey
                ? 'bg-editor-green/10 text-editor-green border-editor-green/30 hover:bg-editor-green/20'
                : 'bg-editor-amber/10 text-editor-amber border-editor-amber/30 hover:bg-editor-amber/20'
            }`}
            title={`Configure ${providerName} Key & Model in Settings`}
          >
            <Key className="w-3 h-3" />
            <span>{activeKey ? `${activeModel}` : 'Set Key'}</span>
          </button>

          {/* Quick Settings shortcut */}
          <button
            onClick={openSettings}
            className="text-editor-subtext hover:text-editor-text p-1 hover:bg-editor-surface rounded cursor-pointer"
            title="Configure AI Provider & Settings (Ctrl+,)"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* Clear chat */}
          <button
            onClick={() => setMessages([messages[0]])}
            className="text-editor-subtext hover:text-editor-text p-1 hover:bg-editor-surface rounded cursor-pointer"
            title="Clear chat history"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-2.5 py-1.5 border-b border-editor-border/60 bg-editor-surface/30 flex items-center gap-1.5 overflow-x-auto select-none">
        <QuickPromptButton 
          icon={<HelpCircle className="w-3 h-3 text-editor-blue" />}
          label="Explain My Code"
          onClick={() => handleSend("Explain my current 8086 assembly program. Detail what each procedure does and how registers and memory are used.")}
        />
        <QuickPromptButton 
          icon={<AlertTriangle className="w-3 h-3 text-editor-amber" />}
          label="Why Did It Crash?"
          onClick={() => handleSend("Analyze why my code encountered an error or unexpected state. Point out any invalid instructions, infinite loops, or uninitialized segments.")}
        />
        <QuickPromptButton 
          icon={<Zap className="w-3 h-3 text-editor-green" />}
          label="Optimize Code"
          onClick={() => handleSend("Review my assembly instructions and suggest idiomatic 8086 optimizations to reduce clock cycles or code size (e.g. XOR vs MOV 0).")}
        />
        <QuickPromptButton 
          icon={<Flag className="w-3 h-3 text-editor-mauve" />}
          label="Explain Flags"
          onClick={() => handleSend("Explain the current state of the CPU status flags (CF, ZF, SF, OF, AF, PF) in relation to the instructions being executed.")}
        />
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 font-sans">
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div key={m.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-1 text-[10px] text-editor-subtext mb-0.5 px-1">
                <span>{isUser ? 'You' : `${providerName} Tutor`}</span>
                <span>•</span>
                <span>{m.timestamp}</span>
              </div>
              
              <div 
                className={`max-w-[90%] rounded-lg px-3 py-2 leading-relaxed text-xs relative group ${
                  isUser
                    ? 'bg-editor-accent text-editor-bg font-medium'
                    : 'bg-editor-bg border border-editor-border text-editor-text'
                }`}
              >
                <div className="whitespace-pre-wrap selection:bg-editor-surface">
                  {formatMarkdown(m.text)}
                </div>

                {!isUser && (
                  <button
                    onClick={() => copyMessage(m.id, m.text)}
                    className="absolute top-1.5 right-1.5 p-1 rounded bg-editor-surface/80 opacity-0 group-hover:opacity-100 transition text-editor-subtext hover:text-editor-text cursor-pointer"
                    title="Copy response"
                  >
                    {copiedId === m.id ? <Check className="w-3 h-3 text-editor-green" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-editor-subtext text-xs p-2 bg-editor-bg/50 border border-editor-border/60 rounded-md w-fit">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-editor-accent" />
            <span>{providerName} is analyzing your 8086 program…</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-2 border-t border-editor-border bg-editor-panel flex gap-1.5 items-end">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={`Ask ${providerName} a question about your 8086 code… (Enter to send)`}
          rows={1}
          className="flex-1 bg-editor-bg text-editor-text text-xs px-2.5 py-1.5 rounded border border-editor-border outline-none focus:border-editor-accent resize-none max-h-24 min-h-[32px]"
        />

        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          className="bg-editor-accent text-editor-bg p-2 rounded hover:bg-editor-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0 cursor-pointer"
          title="Send message"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function QuickPromptButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2 py-1 rounded bg-editor-bg hover:bg-editor-surface text-editor-subtext hover:text-editor-text border border-editor-border/60 text-[11px] font-medium transition shrink-0 cursor-pointer"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/** Simple Markdown Formatter for Code and Bold Elements */
function formatMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const codeLines = part.slice(3, -3).trim().split('\n');
      const lang = codeLines[0].trim();
      const code = (lang === 'asm' || lang === 'assembly' || lang === 'x86' || lang === 'text')
        ? codeLines.slice(1).join('\n')
        : codeLines.join('\n');

      return (
        <pre key={index} className="my-2 p-2.5 bg-editor-panel/90 border border-editor-border/80 rounded font-mono text-[11px] overflow-x-auto text-editor-text leading-tight">
          <code>{code}</code>
        </pre>
      );
    }

    // Handle inline code `code`
    const inlineParts = part.split(/(`[^`]+`)/g);
    return (
      <span key={index}>
        {inlineParts.map((sub, i) => {
          if (sub.startsWith('`') && sub.endsWith('`')) {
            return (
              <code key={i} className="px-1 py-0.5 rounded bg-editor-surface text-editor-cyan font-mono text-[11px]">
                {sub.slice(1, -1)}
              </code>
            );
          }
          return sub;
        })}
      </span>
    );
  });
}
