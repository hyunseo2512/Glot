import { editor } from "monaco-editor";

// Use 'any' cast because Monaco standalone's IStandaloneThemeData
// doesn't expose 'semanticHighlighting', but it IS supported at runtime.
export const gluonNeonTheme: editor.IStandaloneThemeData = {
    base: 'vs-dark',
    inherit: true,
    rules: [
        // Base
        { token: '', foreground: 'd4d4d4' },
        { token: 'comment', foreground: '546E7A', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'C792EA', fontStyle: 'italic' }, // Purple Italic
        { token: 'operator', foreground: '89DDFF' }, // Cyan
        { token: 'delimiter', foreground: '89DDFF' }, // Cyan
        { token: 'delimiter.bracket', foreground: '89DDFF' },

        // Identifiers & Variables (Monarch fallback)
        { token: 'identifier', foreground: 'BEC5D4' }, // Light Grey-Blue (Default)

        // Semantic Tokens (from TS language worker)
        // These token names match what the TS semantic token provider emits
        { token: 'variable', foreground: 'BEC5D4' },
        { token: 'variable.readonly', foreground: '82AAFF' },    // console, window, document
        { token: 'variable.defaultLibrary', foreground: '82AAFF' },
        { token: 'property', foreground: 'BEC5D4' },
        { token: 'property.readonly', foreground: '82AAFF' },
        { token: 'property.defaultLibrary', foreground: '82AAFF' },
        { token: 'function', foreground: '82AAFF' }, // Blue (Functions)
        { token: 'function.defaultLibrary', foreground: '82AAFF' },
        { token: 'method', foreground: '82AAFF' }, // Blue (Methods like .log)
        { token: 'method.defaultLibrary', foreground: '82AAFF' },
        { token: 'member', foreground: '82AAFF' },
        { token: 'parameter', foreground: 'FF9800' }, // Orange
        { token: 'enumMember', foreground: 'F78C6C' },

        // Types & Classes (Semantic)
        { token: 'type', foreground: 'FFCB6B' }, // Yellow-Orange
        { token: 'type.defaultLibrary', foreground: 'FFCB6B' },
        { token: 'class', foreground: 'FFCB6B' },
        { token: 'class.defaultLibrary', foreground: 'FFCB6B' },
        { token: 'interface', foreground: 'FFCB6B' },
        { token: 'interface.defaultLibrary', foreground: 'FFCB6B' },
        { token: 'namespace', foreground: 'FFCB6B' },
        { token: 'enum', foreground: 'FFCB6B' },

        // Primitives
        { token: 'number', foreground: 'F78C6C' }, // Orange
        { token: 'string', foreground: 'C3E88D' }, // Green
        { token: 'string.escape', foreground: '89DDFF' },

        // Regex
        { token: 'regexp', foreground: 'F78C6C' },

        // HTML/CSS in JS (JSX/TSX)
        { token: 'tag', foreground: 'FF5572' }, // Red-Pink
        { token: 'attribute.name', foreground: 'C792EA' }, // Purple
        { token: 'attribute.value', foreground: 'C3E88D' }, // Green
        { token: 'metatag', foreground: '80CBC4' }, // Teal
    ],
    colors: {
        'editor.background': '#0B0C15', // Deep Space Void
        'editor.foreground': '#d4d4d4',
        'editorLineNumber.foreground': '#4A5568',
        'editorCursor.foreground': '#58a6ff',
        'editor.selectionBackground': '#264F78',
        'editor.lineHighlightBackground': '#1A1E29',
        'editorIndentGuide.background': '#1f2937',
        'editorIndentGuide.activeBackground': '#374151'
    },
} as any;

// Patch: force semanticHighlighting flag (not in TS types but supported at runtime)
(gluonNeonTheme as any).semanticHighlighting = true;
