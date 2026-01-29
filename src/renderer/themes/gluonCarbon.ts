import { editor } from 'monaco-editor';

/**
 * Gluon Carbon - C/C++ 전용 테마
 * 네온 SF 스타일 with 시스템 프로그래밍 감성
 */
export const gluonCarbonTheme: editor.IStandaloneThemeData = {
    base: 'vs-dark',
    inherit: true,
    rules: [
        { token: '', foreground: 'D4D4D4', background: '0B0C15' }, // 기본 텍스트

        // C 키워드 (시스템 레벨 - 전기 블루)
        { token: 'keyword', foreground: '00BFFF', fontStyle: 'bold' }, // int, void, struct
        { token: 'keyword.control', foreground: 'FF6B6B', fontStyle: 'bold' }, // if, else, return, for, while
        { token: 'keyword.operator', foreground: '00BFFF' }, // sizeof, typeof

        // 타입 (메탈릭 골드)
        { token: 'type', foreground: 'FFD700' },
        { token: 'type.identifier', foreground: 'FFD700' },

        // 함수 (네온 시안)
        { token: 'function', foreground: '4EC9B0', fontStyle: 'bold' },
        { token: 'function.declaration', foreground: '4EC9B0', fontStyle: 'bold' },

        // 변수/식별자 (밝은 회색-청색)
        { token: 'identifier', foreground: '9CDCFE' },
        { token: 'variable', foreground: '9CDCFE' },

        // 전처리기 (자주색 - 메타 레벨)
        { token: 'meta.preprocessor', foreground: 'C586C0' },
        { token: 'keyword.directive', foreground: 'C586C0' },
        { token: 'meta', foreground: 'C586C0' },

        // 문자열 (네온 그린)
        { token: 'string', foreground: 'A8FF60' },
        { token: 'string.escape', foreground: 'D7BA7D' },

        // 주석 (희미한 회색 - Python과 통일)
        { token: 'comment', foreground: '546E7A', fontStyle: 'italic' },

        // 숫자 및 상수 (오렌지)
        { token: 'number', foreground: 'F78C6C' },
        { token: 'constant', foreground: 'F78C6C' },
        { token: 'number.hex', foreground: 'FF9E64' },

        // 연산자 (밝은 시안)
        { token: 'operator', foreground: '89DDFF' },
        { token: 'delimiter', foreground: '89DDFF' },
        { token: 'delimiter.bracket', foreground: 'FFD700' },

        // 포인터/참조 강조
        { token: 'operator.pointer', foreground: 'FF6B6B' },
    ],
    colors: {
        'editor.background': '#0B0C15', // Deep Space Void
        'editor.foreground': '#D4D4D4',
        'editorCursor.foreground': '#00BFFF', // Neon Blue Cursor
        'editor.lineHighlightBackground': '#00000000', // Disabled line highlight
        'editor.lineHighlightBorder': '#00000000', // Disabled line highlight border
        'editor.selectionBackground': '#264F7880',
        'editorLineNumber.foreground': '#4A5668',
        'editorLineNumber.activeForeground': '#00BFFF',
        'editorIndentGuide.background': '#2C323C',
        'editorIndentGuide.activeBackground': '#00BFFF',
        'editorWhitespace.foreground': '#3B4252',
        // Context Menu Colors
        'menu.background': '#1E1E2E',
        'menu.foreground': '#D4D4D4',
        'menu.selectionBackground': '#0078D4',
        'menu.selectionForeground': '#FFFFFF',
        'menu.separatorBackground': '#3B4252',
        'menu.border': '#3B4252',
        // Dropdown
        'dropdown.background': '#1E1E2E',
        'dropdown.foreground': '#D4D4D4',
        'dropdown.border': '#3B4252',
        // Widget
        'editorWidget.background': '#1E1E2E',
        'editorWidget.border': '#3B4252',
        'editorSuggestWidget.background': '#1E1E2E',
        'editorSuggestWidget.border': '#3B4252',
        'editorSuggestWidget.selectedBackground': '#0078D4',
    }
};
