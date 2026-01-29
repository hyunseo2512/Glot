
import React, { useEffect, useState } from 'react';
import { DiffEditor, useMonaco } from '@monaco-editor/react';

interface DiffViewProps {
    original: string;
    modified: string;
    language?: string;
    theme?: string;
    height?: string | number;
    width?: string | number;
    readOnly?: boolean;
}

const DiffView: React.FC<DiffViewProps> = ({
    original,
    modified,
    language = 'typescript',
    theme = 'gluon',
    height = '100%',
    width = '100%',
    readOnly = true,
}) => {
    const monaco = useMonaco();
    const [isEditorReady, setIsEditorReady] = useState(false);

    useEffect(() => {
        if (monaco) {
            // Define custom theme if not already defined
            monaco.editor.defineTheme('gluon', {
                base: 'vs-dark',
                inherit: true,
                rules: [],
                colors: {
                    'editor.background': '#1e1e1e', // Match app background
                    'editor.lineHighlightBackground': '#ffffff0a',
                },
            });
            setIsEditorReady(true);
        }
    }, [monaco]);

    const editorOptions = {
        readOnly: readOnly,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        renderSideBySide: true, // Split view
        originalEditable: false,
        automaticLayout: true,
        fontFamily: "'Fira Code', monospace",
        fontSize: 13,
        lineHeight: 20,
    };

    if (!isEditorReady) {
        return <div style={{ height, width, background: '#1e1e1e', color: '#fff' }}>Loading Diff Editor...</div>;
    }

    return (
        <div style={{ height, width, overflow: 'hidden', borderRadius: '8px', border: '1px solid #333' }}>
            <DiffEditor
                height={height}
                width={width}
                language={language}
                original={original}
                modified={modified}
                theme={theme}
                options={editorOptions}
            />
        </div>
    );
};

export default DiffView;
