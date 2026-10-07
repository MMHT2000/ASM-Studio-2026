import type { CpuState, AsmError } from './emulator';
import { useSettingsStore } from '../store/settingsStore';
import { askAi, generateOfflineAnalysis as generateOfflineAnalysisService } from './aiService';

export type { AiContext } from './aiService';
export { askAi } from './aiService';

const STORAGE_KEY = 'asm_studio_gemini_key';

export function getSavedApiKey(): string {
  try {
    const s = useSettingsStore.getState?.();
    if (s?.aiProvider === 'openai') return s.openaiApiKey || '';
    if (s?.aiProvider === 'anthropic') return s.anthropicApiKey || '';
    return s?.geminiApiKey || '';
  } catch {
    return '';
  }
}

export function saveApiKey(key: string): void {
  try {
    const trimmed = key.trim();
    const s = useSettingsStore.getState?.();
    if (s?.aiProvider === 'openai') {
      s.updateSettings({ openaiApiKey: trimmed });
    } else if (s?.aiProvider === 'anthropic') {
      s.updateSettings({ anthropicApiKey: trimmed });
    } else {
      s?.updateSettings({ geminiApiKey: trimmed });
    }
  } catch (err) {
    console.error('Failed to save API key', err);
  }
}

export function clearApiKey(): void {
  try {
    const s = useSettingsStore.getState?.();
    if (s?.aiProvider === 'openai') {
      s.updateSettings({ openaiApiKey: '' });
    } else if (s?.aiProvider === 'anthropic') {
      s.updateSettings({ anthropicApiKey: '' });
    } else {
      s?.updateSettings({ geminiApiKey: '' });
    }
  } catch (err) {
    console.error('Failed to clear API key', err);
  }
}

/** Legacy wrapper for askGemini - delegates to askAi */
export async function askGemini(prompt: string, context: { source: string; cpuSnapshot: CpuState | null; asmErrors: AsmError[]; currentLine: number }): Promise<string> {
  return askAi(prompt, context);
}

export function generateOfflineAnalysis(prompt: string, context: any): string {
  return generateOfflineAnalysisService(prompt, context, useSettingsStore.getState?.().aiProvider || 'gemini');
}


