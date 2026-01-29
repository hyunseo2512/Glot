import { editor } from 'monaco-editor';

/**
 * Gluon Markdown Theme (gluon-markdown)
 * 마크다운 전용 테마 - 읽기 쉽고 깔끔한 문서 편집 환경
 * 특징: 부드러운 색상, 헤딩 강조, 링크/코드 블록 구분
 */
export const gluonMarkdownTheme: editor.IStandaloneThemeData = {
    base: 'vs-dark',
    inherit: true,
    rules: [
        { token: '', foreground: 'D4D4D4', background: '1A1B26' }, // 기본 텍스트

        // 헤딩 (Headings) - 골드 계열, 크기별 구분
        { token: 'markup.heading.1.markdown', foreground: 'FFD700', fontStyle: 'bold' }, // # H1 - 골드
        { token: 'markup.heading.2.markdown', foreground: 'FFC107', fontStyle: 'bold' }, // ## H2 - 앰버
        { token: 'markup.heading.3.markdown', foreground: 'FFAB40', fontStyle: 'bold' }, // ### H3 - 오렌지
        { token: 'markup.heading.4.markdown', foreground: 'FF9800' }, // #### H4
        { token: 'markup.heading.5.markdown', foreground: 'FB8C00' }, // ##### H5
        { token: 'markup.heading.6.markdown', foreground: 'F57C00' }, // ###### H6
        { token: 'markup.heading', foreground: 'FFD700', fontStyle: 'bold' }, // 기본 헤딩

        // 강조 (Bold/Italic)
        { token: 'markup.bold', foreground: 'FFFFFF', fontStyle: 'bold' }, // **bold**
        { token: 'markup.italic', foreground: 'C792EA', fontStyle: 'italic' }, // *italic*
        { token: 'strong', foreground: 'FFFFFF', fontStyle: 'bold' },
        { token: 'emphasis', foreground: 'C792EA', fontStyle: 'italic' },

        // 링크 (Links) - 시안/블루
        { token: 'string.link', foreground: '00BFFF' }, // [text](url)
        { token: 'markup.underline.link', foreground: '00BFFF' },
        { token: 'string.link.markdown', foreground: '00BFFF' },

        // 코드 (Code) - 그린 계열
        { token: 'markup.inline.raw', foreground: '89DDFF', background: '2D2D3D' }, // `inline code`
        { token: 'markup.fenced_code.block', foreground: '89DDFF' }, // ```code block```
        { token: 'markup.raw', foreground: 'C3E88D' },
        { token: 'variable.source', foreground: 'C3E88D' },

        // 리스트 (Lists)
        { token: 'punctuation.definition.list', foreground: '82AAFF' }, // - item, * item
        { token: 'markup.list', foreground: '82AAFF' },
        { token: 'keyword.list', foreground: '82AAFF' },

        // 인용 (Blockquote) - 회색 기울임
        { token: 'markup.quote', foreground: '9E9E9E', fontStyle: 'italic' }, // > quote

        // 수평선 (Horizontal Rule)
        { token: 'punctuation.definition.thematic-break', foreground: '4A5668' }, // ---

        // 이미지
        { token: 'string.other.link', foreground: 'FF79C6' }, // ![alt](url)

        // 키워드/특수문자
        { token: 'keyword.md', foreground: '89DDFF' },
        { token: 'keyword', foreground: 'C792EA' },

        // 체크박스
        { token: 'meta.task-list', foreground: '82AAFF' }, // - [ ] / - [x]

        // 테이블
        { token: 'markup.table', foreground: 'E0E0E0' },

        // ── Embedded Language Tokens (for fenced code blocks) ──
        // Python tokens → match gluon-quantum theme exactly
        { token: 'keyword.python', foreground: 'C792EA', fontStyle: 'bold' },
        { token: 'keyword.control.python', foreground: 'FF5370', fontStyle: 'bold' },
        { token: 'identifier.python', foreground: '82AAFF' },
        { token: 'type.identifier.python', foreground: 'FFCB6B' },
        { token: 'function.python', foreground: '82AAFF', fontStyle: 'bold' },
        { token: 'string.python', foreground: 'C3E88D' },
        { token: 'string.escape.python', foreground: '89DDFF' },
        { token: 'comment.python', foreground: '546E7A', fontStyle: 'italic' },
        { token: 'number.python', foreground: 'F78C6C' },
        { token: 'constant.python', foreground: 'F78C6C' },
        { token: 'operator.python', foreground: '89DDFF' },
        { token: 'delimiter.python', foreground: '89DDFF' },
        { token: 'type.python', foreground: 'FFCB6B' },

        // JS/TS tokens → match gluon-neon theme exactly
        { token: 'keyword.javascript', foreground: 'C792EA', fontStyle: 'italic' },
        { token: 'keyword.typescript', foreground: 'C792EA', fontStyle: 'italic' },
        { token: 'identifier.javascript', foreground: 'BEC5D4' },
        { token: 'identifier.typescript', foreground: 'BEC5D4' },
        { token: 'function.javascript', foreground: '82AAFF' },
        { token: 'function.typescript', foreground: '82AAFF' },
        { token: 'string.javascript', foreground: 'C3E88D' },
        { token: 'string.typescript', foreground: 'C3E88D' },
        { token: 'string.escape.javascript', foreground: '89DDFF' },
        { token: 'string.escape.typescript', foreground: '89DDFF' },
        { token: 'comment.javascript', foreground: '546E7A', fontStyle: 'italic' },
        { token: 'comment.typescript', foreground: '546E7A', fontStyle: 'italic' },
        { token: 'number.javascript', foreground: 'F78C6C' },
        { token: 'number.typescript', foreground: 'F78C6C' },
        { token: 'operator.javascript', foreground: '89DDFF' },
        { token: 'operator.typescript', foreground: '89DDFF' },
        { token: 'delimiter.javascript', foreground: '89DDFF' },
        { token: 'delimiter.typescript', foreground: '89DDFF' },
        { token: 'type.javascript', foreground: 'FFCB6B' },
        { token: 'type.typescript', foreground: 'FFCB6B' },
        { token: 'tag.javascript', foreground: 'FF5572' },
        { token: 'tag.typescript', foreground: 'FF5572' },
        { token: 'attribute.name.javascript', foreground: 'C792EA' },
        { token: 'attribute.name.typescript', foreground: 'C792EA' },
        { token: 'attribute.value.javascript', foreground: 'C3E88D' },
        { token: 'attribute.value.typescript', foreground: 'C3E88D' },

        // C/C++ tokens → match gluon-carbon theme
        { token: 'keyword.c', foreground: 'C792EA' },
        { token: 'keyword.cpp', foreground: 'C792EA' },
        { token: 'identifier.c', foreground: 'BEC5D4' },
        { token: 'identifier.cpp', foreground: 'BEC5D4' },
        { token: 'string.c', foreground: 'C3E88D' },
        { token: 'string.cpp', foreground: 'C3E88D' },
        { token: 'comment.c', foreground: '546E7A', fontStyle: 'italic' },
        { token: 'comment.cpp', foreground: '546E7A', fontStyle: 'italic' },
        { token: 'number.c', foreground: 'F78C6C' },
        { token: 'number.cpp', foreground: 'F78C6C' },
        { token: 'operator.c', foreground: '89DDFF' },
        { token: 'operator.cpp', foreground: '89DDFF' },
        { token: 'delimiter.c', foreground: '89DDFF' },
        { token: 'delimiter.cpp', foreground: '89DDFF' },
        { token: 'type.c', foreground: 'FFCB6B' },
        { token: 'type.cpp', foreground: 'FFCB6B' },

        // Other languages (common colors)
        { token: 'keyword.java', foreground: 'C792EA' },
        { token: 'keyword.go', foreground: 'C792EA' },
        { token: 'keyword.rust', foreground: 'C792EA' },
        { token: 'keyword.sql', foreground: 'C792EA' },
        { token: 'keyword.css', foreground: 'C792EA' },
        { token: 'keyword.html', foreground: 'FF5572' },
        { token: 'keyword.json', foreground: 'C792EA' },
        { token: 'keyword.yaml', foreground: 'C792EA' },
        { token: 'keyword.shell', foreground: 'C792EA' },
        { token: 'keyword.bash', foreground: 'C792EA' },
        { token: 'string.java', foreground: 'C3E88D' },
        { token: 'string.go', foreground: 'C3E88D' },
        { token: 'string.rust', foreground: 'C3E88D' },
        { token: 'string.sql', foreground: 'C3E88D' },
        { token: 'string.css', foreground: 'C3E88D' },
        { token: 'string.html', foreground: 'C3E88D' },
        { token: 'string.json', foreground: 'C3E88D' },
        { token: 'string.yaml', foreground: 'C3E88D' },
        { token: 'string.shell', foreground: 'C3E88D' },
        { token: 'string.bash', foreground: 'C3E88D' },
        { token: 'comment.java', foreground: '546E7A', fontStyle: 'italic' },
        { token: 'comment.go', foreground: '546E7A', fontStyle: 'italic' },
        { token: 'comment.rust', foreground: '546E7A', fontStyle: 'italic' },
        { token: 'comment.sql', foreground: '546E7A', fontStyle: 'italic' },
        { token: 'comment.css', foreground: '546E7A', fontStyle: 'italic' },
        { token: 'comment.html', foreground: '546E7A', fontStyle: 'italic' },
        { token: 'number.java', foreground: 'F78C6C' },
        { token: 'number.go', foreground: 'F78C6C' },
        { token: 'number.rust', foreground: 'F78C6C' },
        { token: 'number.sql', foreground: 'F78C6C' },
        { token: 'type.java', foreground: 'FFCB6B' },
        { token: 'type.rust', foreground: 'FFCB6B' },
        { token: 'tag.html', foreground: 'FF5572' },
        { token: 'attribute.name.html', foreground: 'C792EA' },
        { token: 'attribute.value.html', foreground: 'C3E88D' },
        { token: 'predefined.sql', foreground: '82AAFF' },
    ],
    colors: {
        'editor.background': '#0B0C15', // Gluon 공통 배경색 (Deep Space Void)
        'editor.foreground': '#D4D4D4',
        'editorCursor.foreground': '#00BFFF', // Neon Blue Cursor
        'editor.lineHighlightBackground': '#00000000', // Disabled
        'editor.lineHighlightBorder': '#00000000', // Disabled
        'editor.selectionBackground': '#3E445180',
        'editorLineNumber.foreground': '#4A5668',
        'editorLineNumber.activeForeground': '#FFFFFF', // 흰색
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
        // Widget
        'editorWidget.background': '#1E1E2E',
        'editorWidget.border': '#3B4252',
        'editorSuggestWidget.background': '#1E1E2E',
        'editorSuggestWidget.border': '#3B4252',
        'editorSuggestWidget.selectedBackground': '#0078D4',
    }
};
