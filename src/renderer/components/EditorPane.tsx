import { OpenFile } from '../types/file';
import { EditorSettings } from '../types/settings';
import CodeEditor from './CodeEditor';
import '../styles/CodeEditor.css'; // Assuming custom styles for pane might be added

interface EditorPaneProps {
    files: OpenFile[];
    activeIndex: number;
    onFileSelect: (index: number) => void;
    onContentChange: (content: string) => void;
    onCloseTab: (index: number) => void;
    onCloseOthers?: (index: number) => void;
    onCloseToRight?: (index: number) => void;
    onCloseAll?: () => void;
    onSave: (index?: number) => void;
    settings: EditorSettings;
    onReorderTabs?: (fromIndex: number, toIndex: number) => void;
    onDiagnosticsChange?: (errors: number, warnings: number, markers: any[]) => void;
    workspaceDir?: string;
    isActive: boolean;
    onFocus: () => void;
    onMoveToOtherGroup?: () => void;
    moveDirection?: 'left' | 'right';
    isSplitView?: boolean;
    onToggleSplit?: () => void;
    extraBottomPadding?: number;
}

/**
 * EditorPane: A container for a CodeEditor instance with its own file set.
 */
function EditorPane({
    files,
    activeIndex,
    onFileSelect,
    onContentChange,
    onCloseTab,
    onCloseOthers,
    onCloseToRight,
    onCloseAll,
    onSave,
    settings,
    onReorderTabs,
    onDiagnosticsChange,
    workspaceDir,
    isActive,
    onFocus,
    onMoveToOtherGroup,
    moveDirection,
    isSplitView,
    onToggleSplit,
    extraBottomPadding = 0
}: EditorPaneProps) {

    // If pane is active, add a visual indicator?
    // Currently CodeEditor has its own focus style, but maybe border color?
    const containerStyle: React.CSSProperties = {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        position: 'relative',
        outline: isActive ? '1px solid var(--accent-color)' : 'none',
        transition: 'outline 0.1s ease',
        zIndex: isActive ? 1 : 0
    };

    return (
        <div className="editor-pane" style={containerStyle} onClick={onFocus} onFocus={onFocus} tabIndex={-1}>
            <CodeEditor
                openFiles={files}
                activeFileIndex={activeIndex}
                onFileSelect={onFileSelect}
                onContentChange={onContentChange}
                onCloseTab={onCloseTab}
                onCloseOthers={onCloseOthers}
                onCloseToRight={onCloseToRight}
                onCloseAll={onCloseAll}
                onSave={onSave}
                settings={settings}
                onReorderTabs={onReorderTabs}
                onDiagnosticsChange={onDiagnosticsChange}
                workspaceDir={workspaceDir}
                onMoveToOtherGroup={onMoveToOtherGroup}
                moveDirection={moveDirection}
                isSplitView={isSplitView}
                onToggleSplit={onToggleSplit}
                isActive={isActive}
                extraBottomPadding={extraBottomPadding}
            />
        </div>
    );
}

export default EditorPane;
