import { create } from 'zustand';
import type { EditorThemeId } from '../lib/themeManager';

export type AiProvider = 'gemini' | 'openai' | 'anthropic';

export interface AppSettings {
  // Editor Appearance & Behavior
  fontSize: number;
  tabSize: number;
  minimap: boolean;
  wordWrap: boolean;
  lineNumbers: boolean;
  editorTheme: EditorThemeId;
  fontFamily: string;
  customBgColor: string;
  customTextColor: string;

  // Emulator Execution
  maxStepLimit: number;
  historySize: number;
  highlightRegs: boolean;
  defaultAnimSpeedMs: number;

  // AI Co-Pilot Multi-Provider
  aiProvider: AiProvider;
  geminiApiKey: string;
  geminiModel: string;
  openaiApiKey: string;
  openaiModel: string;
  openaiBaseUrl: string;
  anthropicApiKey: string;
  anthropicModel: string;
  geminiTemperature: number;
  tutorStyle: 'concise' | 'detailed';
}

const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 14,
  tabSize: 4,
  minimap: true,
  wordWrap: false,
  lineNumbers: true,
  editorTheme: 'catppuccin',
  fontFamily: 'JetBrains Mono',
  customBgColor: '#1e1e2e',
  customTextColor: '#cdd6f4',

  maxStepLimit: 100000,
  historySize: 150,
  highlightRegs: true,
  defaultAnimSpeedMs: 100,

  aiProvider: 'gemini',
  geminiApiKey: '',
  geminiModel: 'gemini-3.8-flash',
  openaiApiKey: '',
  openaiModel: 'gpt-4o',
  openaiBaseUrl: 'https://api.openai.com/v1',
  anthropicApiKey: '',
  anthropicModel: 'claude-3-5-sonnet-20241022',
  geminiTemperature: 0.4,
  tutorStyle: 'detailed',
};

const STORAGE_KEY = 'asm_studio_settings_v2';
const LEGACY_STORAGE_KEY = 'asm_studio_settings_v1';

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
        return localStorage.getItem(key);
      }
    } catch {}
    return null;
  },
  setItem: (key: string, val: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, val);
      } else if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
        localStorage.setItem(key, val);
      }
    } catch {}
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      } else if (typeof localStorage !== 'undefined' && typeof localStorage.removeItem === 'function') {
        localStorage.removeItem(key);
      }
    } catch {}
  }
};

function loadSettings(): AppSettings {
  try {
    const raw = safeStorage.getItem(STORAGE_KEY) || safeStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

interface SettingsStore extends AppSettings {
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;

  updateSettings: (partial: Partial<AppSettings>) => void;
  resetToDefaults: () => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => {
  const initial = loadSettings();

  return {
    ...initial,
    isSettingsOpen: false,

    openSettings: () => set({ isSettingsOpen: true }),
    closeSettings: () => set({ isSettingsOpen: false }),
    toggleSettings: () => set(state => ({ isSettingsOpen: !state.isSettingsOpen })),

    updateSettings: (partial) => {
      set(state => {
        const next = { ...state, ...partial };
        try {
          const toSave: AppSettings = {
            fontSize: next.fontSize,
            tabSize: next.tabSize,
            minimap: next.minimap,
            wordWrap: next.wordWrap,
            lineNumbers: next.lineNumbers,
            editorTheme: next.editorTheme,
            fontFamily: next.fontFamily,
            customBgColor: next.customBgColor,
            customTextColor: next.customTextColor,

            maxStepLimit: next.maxStepLimit,
            historySize: next.historySize,
            highlightRegs: next.highlightRegs,
            defaultAnimSpeedMs: next.defaultAnimSpeedMs,

            aiProvider: next.aiProvider,
            geminiApiKey: next.geminiApiKey,
            geminiModel: next.geminiModel,
            openaiApiKey: next.openaiApiKey,
            openaiModel: next.openaiModel,
            openaiBaseUrl: next.openaiBaseUrl,
            anthropicApiKey: next.anthropicApiKey,
            anthropicModel: next.anthropicModel,
            geminiTemperature: next.geminiTemperature,
            tutorStyle: next.tutorStyle,
          };
          safeStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
          // Keep legacy gemini key in sync
          if (partial.geminiApiKey !== undefined) {
            safeStorage.setItem('asm_studio_gemini_key', partial.geminiApiKey);
          }
        } catch (e) {
          console.error('Failed to save settings', e);
        }
        return partial;
      });
    },

    resetToDefaults: () => {
      set({ ...DEFAULT_SETTINGS });
      try {
        safeStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        console.error(e);
      }
    },
  };
});


