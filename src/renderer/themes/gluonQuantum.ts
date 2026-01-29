import { editor } from 'monaco-editor';

export const gluonQuantumTheme: editor.IStandaloneThemeData = {
    base: 'vs-dark',
    inherit: true,
    rules: [
        { token: '', foreground: 'E0E0E0', background: '0B0C15' }, // 기본 텍스트 (밝은 회색) & 더 깊은 우주색 배경

        // 파이썬 및 주요 키워드 (양자 요동 - 네온 바이올렛/블루)
        { token: 'keyword', foreground: 'C792EA', fontStyle: 'bold' }, // import, def, class (보라색)
        { token: 'keyword.control', foreground: 'FF5370', fontStyle: 'bold' }, // if, else, return (붉은색 - 에너지)

        // 식별자 및 함수 (관찰자 - 네온 블루)
        { token: 'identifier', foreground: '82AAFF' },
        { token: 'type.identifier', foreground: 'FFCB6B' }, // 클래스/타입 (골드 - 별)
        { token: 'function', foreground: '82AAFF', fontStyle: 'bold' }, // 함수명

        // 문자열 (광자 - 글로잉 시안/그린)
        { token: 'string', foreground: 'C3E88D' },
        { token: 'string.escape', foreground: '89DDFF' },

        // 주석 (배경 복사 - 희미한 신호)
        { token: 'comment', foreground: '546E7A', fontStyle: 'italic' },

        // 숫자 및 상수 (정량적 값 - 오렌지)
        { token: 'number', foreground: 'F78C6C' },
        { token: 'constant', foreground: 'F78C6C' },

        // 연산자 (상호작용 - 시안)
        { token: 'operator', foreground: '89DDFF' },
        { token: 'delimiter', foreground: '89DDFF' },
    ],
    colors: {
        'editor.background': '#0B0C15', // Deep Space Void (더 어둡고 푸른 기운)
        'editor.foreground': '#E0E0E0',
        'editorCursor.foreground': '#00FFF0', // Neon Cyan Cursor (양자 관측기)
        'editor.lineHighlightBackground': '#00000000', // Disabled line highlight
        'editor.lineHighlightBorder': '#00000000', // Disabled line highlight border
        'editor.selectionBackground': '#3e445180',
        'editorLineNumber.foreground': '#4A5668',
        'editorLineNumber.activeForeground': '#FFD700', // 골드 노란색
        'editorIndentGuide.background': '#2C323C',
        'editorIndentGuide.activeBackground': '#89DDFF',
        'editorWhitespace.foreground': '#3B4252',
        // Context Menu Colors
        'menu.background': '#1E1E2E',
        'menu.foreground': '#E0E0E0',
        'menu.selectionBackground': '#0078D4',
        'menu.selectionForeground': '#FFFFFF',
        'menu.separatorBackground': '#3B4252',
        'menu.border': '#3B4252',
        // Dropdown (Command Palette, etc.)
        'dropdown.background': '#1E1E2E',
        'dropdown.foreground': '#E0E0E0',
        'dropdown.border': '#3B4252',
        // Widget (Hover, Suggest, etc.)
        'editorWidget.background': '#1E1E2E',
        'editorWidget.border': '#3B4252',
        'editorSuggestWidget.background': '#1E1E2E',
        'editorSuggestWidget.border': '#3B4252',
        'editorSuggestWidget.selectedBackground': '#0078D4',
    }
};

