export interface EditorSettings {
    fontSize: number;
    fontFamily: string;
    fontLigatures: boolean;
    tabSize: number;
    insertSpaces: boolean;
    wordWrap: boolean;
    minimap: boolean;
    lineNumbers: boolean;
    theme: 'tokyo-night' | 'modern-dark' | 'modern-white' | string;
    formatOnSave: boolean;
    defaultFormatter: string;
}

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
    fontSize: 14,
    fontFamily: "'Fira Code', 'Consolas', monospace",
    fontLigatures: true,
    tabSize: 2,
    insertSpaces: true,
    wordWrap: false,
    minimap: false,
    lineNumbers: true,
    theme: 'modern-dark',
    formatOnSave: false,
    defaultFormatter: 'none',
};
