import type * as Monaco from 'monaco-editor';

export type EditorThemeId = 
  | 'catppuccin' 
  | 'vscode-dark' 
  | 'one-dark' 
  | 'monokai' 
  | 'dracula' 
  | 'github-light' 
  | 'custom';

export interface ThemePreset {
  id: EditorThemeId;
  name: string;
  description: string;
  base: 'vs-dark' | 'vs';
  defaultBg: string;
  defaultFg: string;
  isDark: boolean;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'catppuccin',
    name: 'Catppuccin Mocha',
    description: 'Soothing pastel dark theme (Default)',
    base: 'vs-dark',
    defaultBg: '#1e1e2e',
    defaultFg: '#cdd6f4',
    isDark: true,
  },
  {
    id: 'vscode-dark',
    name: 'VS Code Dark+',
    description: 'Classic Visual Studio Code dark appearance',
    base: 'vs-dark',
    defaultBg: '#1e1e1e',
    defaultFg: '#d4d4d4',
    isDark: true,
  },
  {
    id: 'one-dark',
    name: 'One Dark Pro',
    description: 'Atom-inspired iconic dark theme',
    base: 'vs-dark',
    defaultBg: '#282c34',
    defaultFg: '#abb2bf',
    isDark: true,
  },
  {
    id: 'monokai',
    name: 'Monokai',
    description: 'High-contrast vibrant retro syntax',
    base: 'vs-dark',
    defaultBg: '#272822',
    defaultFg: '#f8f8f2',
    isDark: true,
  },
  {
    id: 'dracula',
    name: 'Dracula',
    description: 'Vampire-themed purple aesthetic',
    base: 'vs-dark',
    defaultBg: '#282a36',
    defaultFg: '#f8f8f2',
    isDark: true,
  },
  {
    id: 'github-light',
    name: 'GitHub Light',
    description: 'Clean bright daylight theme for high ambient light',
    base: 'vs',
    defaultBg: '#ffffff',
    defaultFg: '#24292e',
    isDark: false,
  },
  {
    id: 'custom',
    name: 'Custom Palette',
    description: 'Custom background and foreground text colors',
    base: 'vs-dark',
    defaultBg: '#131826',
    defaultFg: '#f1f5f9',
    isDark: true,
  },
];

export const FONT_FAMILIES = [
  { id: 'JetBrains Mono', label: 'JetBrains Mono (Recommended)', css: "'JetBrains Mono', 'Fira Code', monospace" },
  { id: 'Fira Code', label: 'Fira Code', css: "'Fira Code', 'JetBrains Mono', monospace" },
  { id: 'Cascadia Code', label: 'Cascadia Code', css: "'Cascadia Code', Consolas, monospace" },
  { id: 'Consolas', label: 'Consolas', css: "Consolas, 'Courier New', monospace" },
  { id: 'Courier New', label: 'Courier New (Retro Classic)', css: "'Courier New', Courier, monospace" },
  { id: 'Monospace', label: 'System Default Monospace', css: "monospace" },
];

/** Computes approximate luminance to decide whether color is dark or light */
export function isColorDark(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (clean.length !== 6 && clean.length !== 3) return true;
  const r = parseInt(clean.length === 3 ? clean[0] + clean[0] : clean.slice(0, 2), 16);
  const g = parseInt(clean.length === 3 ? clean[1] + clean[1] : clean.slice(2, 4), 16);
  const b = parseInt(clean.length === 3 ? clean[2] + clean[2] : clean.slice(4, 6), 16);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum < 128;
}

/** Slightly darken or lighten a hex color */
function adjustHex(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  let num = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
  let r = Math.min(255, Math.max(0, (num >> 16) + amount));
  let g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  let b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/** Register and apply active theme into Monaco */
export function registerAndApplyTheme(
  monaco: typeof Monaco,
  themeId: EditorThemeId,
  customBg?: string,
  customFg?: string
): void {
  // 1. Define standard presets
  monaco.editor.defineTheme('asm-catppuccin', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'cba6f7', fontStyle: 'bold' },
      { token: 'keyword.directive', foreground: 'f9e2af' },
      { token: 'keyword.type', foreground: 'f9e2af' },
      { token: 'variable.name', foreground: '89dceb' },
      { token: 'type.identifier', foreground: 'a6e3a1', fontStyle: 'bold' },
      { token: 'number', foreground: 'fab387' },
      { token: 'number.hex', foreground: 'fab387' },
      { token: 'string', foreground: 'a6e3a1' },
      { token: 'comment', foreground: '6c7086', fontStyle: 'italic' },
      { token: 'identifier', foreground: 'cdd6f4' },
      { token: 'delimiter', foreground: '89b4fa' },
    ],
    colors: {
      'editor.background': '#1e1e2e',
      'editor.foreground': '#cdd6f4',
      'editor.lineHighlightBackground': '#313244',
      'editor.selectionBackground': '#45475a',
      'editorLineNumber.foreground': '#585b70',
      'editorLineNumber.activeForeground': '#cdd6f4',
      'editorCursor.foreground': '#f5c2e7',
      'editorGutter.background': '#181825',
      'editorGlyphMargin.background': '#181825',
    },
  });

  monaco.editor.defineTheme('asm-vscode-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '569cd6', fontStyle: 'bold' },
      { token: 'keyword.directive', foreground: '4ec9b0' },
      { token: 'keyword.type', foreground: '4ec9b0' },
      { token: 'variable.name', foreground: '9cdcfe' },
      { token: 'type.identifier', foreground: 'dcdcaa', fontStyle: 'bold' },
      { token: 'number', foreground: 'b5cea8' },
      { token: 'number.hex', foreground: 'b5cea8' },
      { token: 'string', foreground: 'ce9178' },
      { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
      { token: 'identifier', foreground: 'd4d4d4' },
      { token: 'delimiter', foreground: 'd4d4d4' },
    ],
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
      'editor.lineHighlightBackground': '#2a2d2e',
      'editor.selectionBackground': '#264f78',
      'editorLineNumber.foreground': '#858585',
      'editorLineNumber.activeForeground': '#c6c6c6',
      'editorCursor.foreground': '#aeafad',
      'editorGutter.background': '#1e1e1e',
      'editorGlyphMargin.background': '#1e1e1e',
    },
  });

  monaco.editor.defineTheme('asm-one-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'c678dd', fontStyle: 'bold' },
      { token: 'keyword.directive', foreground: 'e5c07b' },
      { token: 'keyword.type', foreground: 'e5c07b' },
      { token: 'variable.name', foreground: '56b6c2' },
      { token: 'type.identifier', foreground: '98c379', fontStyle: 'bold' },
      { token: 'number', foreground: 'd19a66' },
      { token: 'number.hex', foreground: 'd19a66' },
      { token: 'string', foreground: '98c379' },
      { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
      { token: 'identifier', foreground: 'abb2bf' },
      { token: 'delimiter', foreground: 'abb2bf' },
    ],
    colors: {
      'editor.background': '#282c34',
      'editor.foreground': '#abb2bf',
      'editor.lineHighlightBackground': '#2c313a',
      'editor.selectionBackground': '#3e4451',
      'editorLineNumber.foreground': '#4b5263',
      'editorLineNumber.activeForeground': '#abb2bf',
      'editorCursor.foreground': '#528bff',
      'editorGutter.background': '#21252b',
      'editorGlyphMargin.background': '#21252b',
    },
  });

  monaco.editor.defineTheme('asm-monokai', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'f92672', fontStyle: 'bold' },
      { token: 'keyword.directive', foreground: 'e6db74' },
      { token: 'keyword.type', foreground: '66d9ef' },
      { token: 'variable.name', foreground: 'fd971f' },
      { token: 'type.identifier', foreground: 'a6e22e', fontStyle: 'bold' },
      { token: 'number', foreground: 'ae81ff' },
      { token: 'number.hex', foreground: 'ae81ff' },
      { token: 'string', foreground: 'e6db74' },
      { token: 'comment', foreground: '75715e', fontStyle: 'italic' },
      { token: 'identifier', foreground: 'f8f8f2' },
      { token: 'delimiter', foreground: 'f8f8f2' },
    ],
    colors: {
      'editor.background': '#272822',
      'editor.foreground': '#f8f8f2',
      'editor.lineHighlightBackground': '#3e3d32',
      'editor.selectionBackground': '#49483e',
      'editorLineNumber.foreground': '#90908a',
      'editorLineNumber.activeForeground': '#f8f8f2',
      'editorCursor.foreground': '#f8f8f0',
      'editorGutter.background': '#1e1f1c',
      'editorGlyphMargin.background': '#1e1f1c',
    },
  });

  monaco.editor.defineTheme('asm-dracula', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'ff79c6', fontStyle: 'bold' },
      { token: 'keyword.directive', foreground: 'f1fa8c' },
      { token: 'keyword.type', foreground: '8be9fd' },
      { token: 'variable.name', foreground: 'bd93f9' },
      { token: 'type.identifier', foreground: '50fa7b', fontStyle: 'bold' },
      { token: 'number', foreground: 'bd93f9' },
      { token: 'number.hex', foreground: 'bd93f9' },
      { token: 'string', foreground: 'f1fa8c' },
      { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
      { token: 'identifier', foreground: 'f8f8f2' },
      { token: 'delimiter', foreground: 'ff79c6' },
    ],
    colors: {
      'editor.background': '#282a36',
      'editor.foreground': '#f8f8f2',
      'editor.lineHighlightBackground': '#44475a50',
      'editor.selectionBackground': '#44475a',
      'editorLineNumber.foreground': '#6272a4',
      'editorLineNumber.activeForeground': '#f8f8f2',
      'editorCursor.foreground': '#f8f8f2',
      'editorGutter.background': '#21222c',
      'editorGlyphMargin.background': '#21222c',
    },
  });

  monaco.editor.defineTheme('asm-github-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'd73a49', fontStyle: 'bold' },
      { token: 'keyword.directive', foreground: '6f42c1' },
      { token: 'keyword.type', foreground: '005cc5' },
      { token: 'variable.name', foreground: 'e36209' },
      { token: 'type.identifier', foreground: '22863a', fontStyle: 'bold' },
      { token: 'number', foreground: '005cc5' },
      { token: 'number.hex', foreground: '005cc5' },
      { token: 'string', foreground: '032f62' },
      { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
      { token: 'identifier', foreground: '24292e' },
      { token: 'delimiter', foreground: '24292e' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#24292e',
      'editor.lineHighlightBackground': '#f6f8fa',
      'editor.selectionBackground': '#c8e1ff',
      'editorLineNumber.foreground': '#959da5',
      'editorLineNumber.activeForeground': '#24292e',
      'editorCursor.foreground': '#044289',
      'editorGutter.background': '#f6f8fa',
      'editorGlyphMargin.background': '#f6f8fa',
    },
  });

  // 2. Custom dynamic theme
  const bg = customBg || '#131826';
  const fg = customFg || '#f1f5f9';
  const isDark = isColorDark(bg);

  const gutterBg = isDark ? adjustHex(bg, -10) : adjustHex(bg, -8);
  const lineHighlightBg = isDark ? adjustHex(bg, 16) : adjustHex(bg, -12);
  const selectionBg = isDark ? adjustHex(bg, 40) : adjustHex(bg, -25);
  const lineNumColor = isDark ? adjustHex(bg, 60) : adjustHex(bg, -80);

  monaco.editor.defineTheme('asm-custom', {
    base: isDark ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: isDark ? 'c084fc' : '9333ea', fontStyle: 'bold' },
      { token: 'keyword.directive', foreground: isDark ? 'fde047' : 'd97706' },
      { token: 'keyword.type', foreground: isDark ? '38bdf8' : '0284c7' },
      { token: 'variable.name', foreground: isDark ? '67e8f9' : '0891b2' },
      { token: 'type.identifier', foreground: isDark ? '4ade80' : '16a34a', fontStyle: 'bold' },
      { token: 'number', foreground: isDark ? 'fb923c' : 'ea580c' },
      { token: 'number.hex', foreground: isDark ? 'fb923c' : 'ea580c' },
      { token: 'string', foreground: isDark ? '4ade80' : '15803d' },
      { token: 'comment', foreground: isDark ? '94a3b8' : '64748b', fontStyle: 'italic' },
      { token: 'identifier', foreground: fg.replace('#', '') },
      { token: 'delimiter', foreground: isDark ? '60a5fa' : '2563eb' },
    ],
    colors: {
      'editor.background': bg,
      'editor.foreground': fg,
      'editor.lineHighlightBackground': lineHighlightBg,
      'editor.selectionBackground': selectionBg,
      'editorLineNumber.foreground': lineNumColor,
      'editorLineNumber.activeForeground': fg,
      'editorCursor.foreground': fg,
      'editorGutter.background': gutterBg,
      'editorGlyphMargin.background': gutterBg,
    },
  });

  // 3. Set the active theme
  const themeMap: Record<EditorThemeId, string> = {
    'catppuccin': 'asm-catppuccin',
    'vscode-dark': 'asm-vscode-dark',
    'one-dark': 'asm-one-dark',
    'monokai': 'asm-monokai',
    'dracula': 'asm-dracula',
    'github-light': 'asm-github-light',
    'custom': 'asm-custom',
  };

  const chosenTheme = themeMap[themeId] || 'asm-catppuccin';
  monaco.editor.setTheme(chosenTheme);
}

