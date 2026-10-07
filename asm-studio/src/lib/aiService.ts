import type { CpuState, AsmError } from './emulator';
import { useSettingsStore, type AiProvider } from '../store/settingsStore';

export interface AiContext {
  source: string;
  cpuSnapshot: CpuState | null;
  asmErrors: AsmError[];
  currentLine: number;
}

export const SYSTEM_INSTRUCTION = `You are the Intel 8086 Assembly Tutor inside ASM Studio, an interactive educational 8086 IDE.
Your students are computer science undergraduates learning 16-bit x86 architecture.
Rules for your answers:
1. Be concise, clear, and pedagogical. Avoid unnecessary fluff.
2. When explaining errors or crashes, pinpoint the exact instruction, register, or addressing mode.
3. Explain real-mode segmentation (DS:offset, SS:SP) and status flags (CF, ZF, SF, OF, AF, PF) whenever relevant.
4. Format assembly code nicely in markdown code blocks with comments.
5. If suggesting fixes, provide the corrected assembly snippet ready to paste.`;

export function formatAiContextPrompt(prompt: string, context: AiContext): string {
  let contextInfo = `--- CURRENT 8086 PROGRAM SOURCE ---\n\`\`\`asm\n${context.source}\n\`\`\`\n\n`;

  if (context.asmErrors.length > 0) {
    contextInfo += `--- ASSEMBLER ERRORS ---\n${context.asmErrors.map(e => `Line ${e.line}: [${e.type}] ${e.msg}`).join('\n')}\n\n`;
  }

  if (context.cpuSnapshot) {
    const c = context.cpuSnapshot;
    contextInfo += `--- CURRENT CPU STATE ---\n`;
    contextInfo += `AX=${c.regs.AX.toString(16).toUpperCase().padStart(4, '0')}h BX=${c.regs.BX.toString(16).toUpperCase().padStart(4, '0')}h CX=${c.regs.CX.toString(16).toUpperCase().padStart(4, '0')}h DX=${c.regs.DX.toString(16).toUpperCase().padStart(4, '0')}h\n`;
    contextInfo += `SI=${c.regs.SI.toString(16).toUpperCase().padStart(4, '0')}h DI=${c.regs.DI.toString(16).toUpperCase().padStart(4, '0')}h SP=${c.regs.SP.toString(16).toUpperCase().padStart(4, '0')}h BP=${c.regs.BP.toString(16).toUpperCase().padStart(4, '0')}h IP=${c.regs.IP.toString(16).toUpperCase().padStart(4, '0')}h\n`;
    contextInfo += `Flags: CF=${c.flags.CF ? 1 : 0} ZF=${c.flags.ZF ? 1 : 0} SF=${c.flags.SF ? 1 : 0} OF=${c.flags.OF ? 1 : 0} PF=${c.flags.PF ? 1 : 0} DF=${c.flags.DF ? 1 : 0}\n`;
    if (c.output.length > 0) {
      contextInfo += `Console Output: "${c.output.join('')}"\n`;
    }
  }

  return `${contextInfo}Student Question: ${prompt}`;
}

/** Main dispatcher to query AI based on user's chosen provider */
export async function askAi(prompt: string, context: AiContext): Promise<string> {
  const settings = useSettingsStore.getState();
  const provider: AiProvider = settings.aiProvider || 'gemini';

  switch (provider) {
    case 'gemini': {
      const apiKey = settings.geminiApiKey || '';
      if (!apiKey.trim()) return generateOfflineAnalysis(prompt, context, 'gemini');
      return askGeminiInternal(prompt, context, apiKey.trim(), settings.geminiModel);
    }
    case 'openai': {
      const apiKey = settings.openaiApiKey || '';
      if (!apiKey.trim()) return generateOfflineAnalysis(prompt, context, 'openai');
      return askOpenAiInternal(prompt, context, apiKey.trim(), settings.openaiModel || 'gpt-4o', settings.openaiBaseUrl);
    }
    case 'anthropic': {
      const apiKey = settings.anthropicApiKey || '';
      if (!apiKey.trim()) return generateOfflineAnalysis(prompt, context, 'anthropic');
      return askAnthropicInternal(prompt, context, apiKey.trim(), settings.anthropicModel || 'claude-3-5-sonnet-20241022');
    }
    default:
      return generateOfflineAnalysis(prompt, context, 'gemini');
  }
}

/** Google Gemini API call with automatic model cascade */
async function askGeminiInternal(prompt: string, context: AiContext, apiKey: string, preferredModel: string): Promise<string> {
  const candidateModels = Array.from(new Set([
    preferredModel?.trim() || 'gemini-3.8-flash',
    'gemini-3.8-flash',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ]));

  let lastError = '';
  const fullUserPrompt = formatAiContextPrompt(prompt, context);

  for (const model of candidateModels) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }]
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: fullUserPrompt }]
            }
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1200,
          }
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `HTTP ${response.status} ${response.statusText}`;
        lastError = errMsg;

        if (
          errMsg.includes('not found') || 
          errMsg.includes('no longer available') || 
          errMsg.includes('not supported') ||
          response.status === 404
        ) {
          continue; // cascade to next model
        }

        if (response.status === 400 || response.status === 403) {
          return `⚠️ **Gemini API Error:** ${errMsg}\n\nPlease verify that your Gemini API key is valid. Click the ⚙️ Key or Settings button to update your key.`;
        }
        return `⚠️ **Gemini Request Failed:** ${errMsg}`;
      }

      const data = await response.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) return reply;
    } catch (err: any) {
      lastError = err.message || String(err);
      continue;
    }
  }

  return `⚠️ **Gemini Request Failed:** ${lastError}\n\n${generateOfflineAnalysis(prompt, context, 'gemini')}`;
}

/** OpenAI API call with customizable Base URL and open model string */
async function askOpenAiInternal(prompt: string, context: AiContext, apiKey: string, model: string, baseUrl?: string): Promise<string> {
  const fullUserPrompt = formatAiContextPrompt(prompt, context);
  const trimmedModel = model?.trim() || 'gpt-4o';
  const isReasoningModel = trimmedModel.startsWith('o1') || trimmedModel.startsWith('o3') || trimmedModel.startsWith('o4');

  const payload: any = {
    model: trimmedModel,
    messages: [
      { role: isReasoningModel ? 'user' : 'system', content: isReasoningModel ? `${SYSTEM_INSTRUCTION}\n\n${fullUserPrompt}` : SYSTEM_INSTRUCTION },
    ],
  };

  if (!isReasoningModel) {
    payload.messages.push({ role: 'user', content: fullUserPrompt });
    payload.temperature = 0.4;
    payload.max_tokens = 1200;
  } else {
    payload.max_completion_tokens = 1200;
  }

  const endpointBase = (baseUrl?.trim() || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const url = endpointBase.endsWith('/chat/completions') ? endpointBase : `${endpointBase}/chat/completions`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const errMsg = errJson?.error?.message || `HTTP ${response.status} ${response.statusText}`;
      if (response.status === 401) {
        return `⚠️ **OpenAI Authentication Error:** Invalid API Key.\n\nPlease check your OpenAI API key in **Settings (Ctrl+,) → AI Co-Pilot**.`;
      }
      return `⚠️ **OpenAI API Error (${response.status}):** ${errMsg}`;
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (text) return text;
    return `⚠️ OpenAI returned an empty response.`;
  } catch (err: any) {
    return `⚠️ **OpenAI Network Request Failed:** ${err.message || String(err)}\n\n${generateOfflineAnalysis(prompt, context, 'openai')}`;
  }
}

/** Anthropic Claude API call with direct browser access header */
async function askAnthropicInternal(prompt: string, context: AiContext, apiKey: string, model: string): Promise<string> {
  const fullUserPrompt = formatAiContextPrompt(prompt, context);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: model || 'claude-3-5-sonnet-20241022',
        system: SYSTEM_INSTRUCTION,
        messages: [
          { role: 'user', content: fullUserPrompt }
        ],
        max_tokens: 1200,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const errMsg = errJson?.error?.message || `HTTP ${response.status} ${response.statusText}`;
      if (response.status === 401) {
        return `⚠️ **Anthropic Authentication Error:** Invalid API Key.\n\nPlease update your Claude API key in **Settings (Ctrl+,) → AI Co-Pilot**.`;
      }
      return `⚠️ **Anthropic API Error (${response.status}):** ${errMsg}`;
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text;
    if (text) return text;
    return `⚠️ Anthropic returned an empty response.`;
  } catch (err: any) {
    return `⚠️ **Anthropic Request Failed:** ${err.message || String(err)}\n\n${generateOfflineAnalysis(prompt, context, 'anthropic')}`;
  }
}

/** Offline Rule-Based Fallback Analysis when no API key is provided */
export function generateOfflineAnalysis(prompt: string, context: AiContext, provider: AiProvider = 'gemini'): string {
  const code = context.source.toUpperCase();
  const notes: string[] = [];

  // Check 1: Assembler errors
  if (context.asmErrors.length > 0) {
    notes.push(`### ❌ Assembler Diagnostics Found:`);
    context.asmErrors.forEach(e => {
      notes.push(`- **Line ${e.line}**: \`${e.msg}\``);
    });
    return `${notes.join('\n')}\n\n> 💡 *Set your **${getProviderDisplayName(provider)} API Key** in Settings (Ctrl+,) to receive real-time answers.*`;
  }

  // Check 2: Missing DS initialization
  if (code.includes('.DATA') && !code.includes('@DATA') && !code.includes('MOV DS')) {
    notes.push(`- ⚠️ **Data Segment (DS) Not Initialized:** Your code declares variables in \`.DATA\`, but doesn't initialize \`DS\`. Add this at the beginning of \`main proc\`:\n\`\`\`asm\nMOV AX, @data\nMOV DS, AX\n\`\`\``);
  }

  // Check 3: String termination for INT 21h AH=09h
  if (code.includes('09H') || code.includes('9H')) {
    if (!code.includes('$') && !code.includes("'$'")) {
      notes.push(`- ⚠️ **Missing DOS String Terminator:** DOS Service \`INT 21h / AH=09h\` prints until it encounters a \`$\` character. Ensure your string ends with \`'$'\` (e.g. \`msg DB 'Hello World$'\`).`);
    }
  }

  // Check 4: Missing DOS exit
  if (!code.includes('4CH') && !code.includes('4C00H')) {
    notes.push(`- 💡 **Program Termination:** Remember to exit cleanly to DOS using:\n\`\`\`asm\nMOV AH, 4Ch\nMOV AL, 0\nINT 21h\n\`\`\``);
  }

  // Check 5: Stack Balance
  const pushCount = (code.match(/\bPUSH\b/g) || []).length;
  const popCount = (code.match(/\bPOP\b/g) || []).length;
  if (pushCount !== popCount) {
    notes.push(`- ⚠️ **Stack Imbalance Warning:** Found **${pushCount} PUSH** operations and **${popCount} POP** operations. Unmatched stack operations will corrupt the return address when calling \`RET\`.`);
  }

  let intro = `### 🎓 ASM Studio Offline Inspection\n\n`;
  if (notes.length > 0) {
    intro += notes.join('\n\n') + '\n\n';
  } else {
    intro += `Your assembly code syntax is well-structured! You have initialized segments and standard directives.\n\n`;
  }

  const providerName = getProviderDisplayName(provider);
  intro += `> 🔑 **Connect ${providerName}:** Open **Settings (Ctrl+,) → AI Co-Pilot** and enter your ${providerName} API Key to activate interactive multi-turn tutoring and optimizations!`;

  return intro;
}

export function getProviderDisplayName(provider: AiProvider): string {
  switch (provider) {
    case 'gemini': return 'Google Gemini';
    case 'openai': return 'OpenAI';
    case 'anthropic': return 'Anthropic Claude';
    default: return 'AI Tutor';
  }
}
