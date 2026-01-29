import { editor } from 'monaco-editor';

export const gluonJavaTheme: editor.IStandaloneThemeData = {
    base: 'vs-dark',
    inherit: true,
    semanticHighlighting: true, // Enable semantic highlighting explicitly
    rules: [
        { token: '', foreground: 'ABB2BF', background: '0B0C15' }, // 기본 텍스트 (Soft Grey)

        // 주석 (은은한 회색)
        { token: 'comment', foreground: '5C6370', fontStyle: 'italic' },
        { token: 'comment.doc', foreground: '5C6370', fontStyle: 'italic' },

        // 키워드 (소프트 퍼플/바이올렛) - 기존 오렌지 제거
        { token: 'keyword', foreground: 'C678DD', fontStyle: 'bold' },
        { token: 'keyword.control', foreground: 'C678DD', fontStyle: 'bold' },

        // 식별자
        { token: 'identifier', foreground: 'ABB2BF' }, // 기본 변수 회색

        // 클래스/인터페이스 (시원한 시안/청록색) - 기존 노랑 제거
        { token: 'type.identifier', foreground: '56B6C2' },
        { token: 'class', foreground: '56B6C2' },
        { token: 'type', foreground: '56B6C2' },

        // 메서드 호출 (스카이 블루) - 기존 노랑 제거
        { token: 'function', foreground: '61AFEF' },

        // 변수
        { token: 'variable', foreground: 'E06C75' }, // 붉은 계열 (One Dark 스타일) or just Grey? Let's try Red accent for vars usually
        { token: 'variable.predefined', foreground: 'E5C07B' }, // this, super (Soft Gold - 포인트)

        // 어노테이션 (밝은 노랑/골드 - 포인트로 유지하거나 변경)
        { token: 'annotation', foreground: 'E5C07B' },

        // 문자열 (그린)
        { token: 'string', foreground: '98C379' },

        // 숫자 (오렌지/브라운 -> 귤색)
        { token: 'number', foreground: 'D19A66' },

        // 상수 (시안 또는 퍼플)
        { token: 'constant', foreground: '56B6C2' },

        // 연산자
        { token: 'operator', foreground: '56B6C2' },

        // 구분자
        { token: 'delimiter', foreground: 'ABB2BF' },
    ],
    colors: {
        'editor.background': '#0B0C15',
        'editor.foreground': '#ABB2BF',
        'editorCursor.foreground': '#528BFF', // Blue Cursor
        'editor.lineHighlightBackground': '#2C313C',
        'editor.selectionBackground': '#3E4451',
        'editorLineNumber.foreground': '#495162',
        'editorLineNumber.activeForeground': '#ABB2BF',
        'editorIndentGuide.background': '#3B4048',
        'editorIndentGuide.activeBackground': '#C8C8C8',
        'editorWhitespace.foreground': '#3B4048',
    }
};
