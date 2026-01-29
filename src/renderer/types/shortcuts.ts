export interface KeyBinding {
    id: string;
    command: string;
    description: string;
    defaultKey: string;
    currentKey: string;
}

export const DEFAULT_SHORTCUTS: KeyBinding[] = [
    // === Panel Toggle ===
    {
        id: 'sidebar.toggle',
        command: 'toggleSidebar',
        description: 'Toggle Side Panel',
        defaultKey: 'Ctrl+B',
        currentKey: 'Ctrl+B'
    },
    {
        id: 'terminal.toggle',
        command: 'toggleTerminal',
        description: 'Toggle Terminal',
        defaultKey: 'Ctrl+J',
        currentKey: 'Ctrl+J'
    },
    {
        id: 'ai.toggle',
        command: 'toggleAIPanel',
        description: 'Toggle AI Panel',
        defaultKey: 'Ctrl+L',
        currentKey: 'Ctrl+L'
    },
    // === File Operations ===
    {
        id: 'file.save',
        command: 'saveFile',
        description: 'Save File',
        defaultKey: 'Ctrl+S',
        currentKey: 'Ctrl+S'
    },
    {
        id: 'file.saveAll',
        command: 'saveAllFiles',
        description: 'Save All Files',
        defaultKey: 'Ctrl+Shift+S',
        currentKey: 'Ctrl+Shift+S'
    },
    {
        id: 'file.new',
        command: 'newFile',
        description: 'New File',
        defaultKey: 'Ctrl+N',
        currentKey: 'Ctrl+N'
    },
    {
        id: 'file.newWindow',
        command: 'newWindow',
        description: 'New Window',
        defaultKey: 'Ctrl+Shift+N',
        currentKey: 'Ctrl+Shift+N'
    },
    {
        id: 'file.open',
        command: 'openFile',
        description: 'Open File',
        defaultKey: 'Ctrl+O',
        currentKey: 'Ctrl+O'
    },
    {
        id: 'file.openFolder',
        command: 'openFolder',
        description: 'Open Folder',
        defaultKey: 'Ctrl+Shift+O',
        currentKey: 'Ctrl+Shift+O'
    },
    // === Zoom ===
    {
        id: 'view.zoomIn',
        command: 'zoomIn',
        description: 'Zoom In',
        defaultKey: 'Ctrl+=',
        currentKey: 'Ctrl+='
    },
    {
        id: 'view.zoomOut',
        command: 'zoomOut',
        description: 'Zoom Out',
        defaultKey: 'Ctrl+-',
        currentKey: 'Ctrl+-'
    },
    {
        id: 'view.zoomReset',
        command: 'zoomReset',
        description: 'Reset Zoom',
        defaultKey: 'Ctrl+0',
        currentKey: 'Ctrl+0'
    },
    // === Search & Replace ===
    {
        id: 'editor.find',
        command: 'find',
        description: 'Find',
        defaultKey: 'Ctrl+F',
        currentKey: 'Ctrl+F'
    },
    {
        id: 'editor.replace',
        command: 'replace',
        description: 'Find and Replace',
        defaultKey: 'Ctrl+H',
        currentKey: 'Ctrl+H'
    },

    // === Line Operations ===
    {
        id: 'editor.copyLineUp',
        command: 'copyLineUp',
        description: 'Copy Line Up',
        defaultKey: 'Ctrl+Alt+ArrowUp',
        currentKey: 'Ctrl+Alt+ArrowUp'
    },
    {
        id: 'editor.copyLineDown',
        command: 'copyLineDown',
        description: 'Copy Line Down',
        defaultKey: 'Ctrl+Alt+ArrowDown',
        currentKey: 'Ctrl+Alt+ArrowDown'
    },
    {
        id: 'editor.moveLineUp',
        command: 'moveLineUp',
        description: 'Move Line Up',
        defaultKey: 'Alt+ArrowUp',
        currentKey: 'Alt+ArrowUp'
    },
    {
        id: 'editor.moveLineDown',
        command: 'moveLineDown',
        description: 'Move Line Down',
        defaultKey: 'Alt+ArrowDown',
        currentKey: 'Alt+ArrowDown'
    },
    {
        id: 'editor.deleteLine',
        command: 'deleteLine',
        description: 'Delete Line',
        defaultKey: 'Ctrl+Shift+K',
        currentKey: 'Ctrl+Shift+K'
    },
    // === Multi-Cursor ===
    {
        id: 'editor.addCursorAbove',
        command: 'addCursorAbove',
        description: 'Add Cursor Above',
        defaultKey: 'Ctrl+Shift+ArrowUp',
        currentKey: 'Ctrl+Shift+ArrowUp'
    },
    {
        id: 'editor.addCursorBelow',
        command: 'addCursorBelow',
        description: 'Add Cursor Below',
        defaultKey: 'Ctrl+Shift+ArrowDown',
        currentKey: 'Ctrl+Shift+ArrowDown'
    },
    // === Code Actions ===
    {
        id: 'editor.format',
        command: 'formatDocument',
        description: 'Format Document',
        defaultKey: 'Shift+Alt+F',
        currentKey: 'Shift+Alt+F'
    },
    {
        id: 'editor.commentLine',
        command: 'commentLine',
        description: 'Toggle Line Comment',
        defaultKey: 'Ctrl+/',
        currentKey: 'Ctrl+/'
    },
    {
        id: 'editor.blockComment',
        command: 'blockComment',
        description: 'Toggle Block Comment',
        defaultKey: 'Shift+Alt+A',
        currentKey: 'Shift+Alt+A'
    },
    // === Navigation ===
    {
        id: 'editor.goToLine',
        command: 'goToLine',
        description: 'Go to Line',
        defaultKey: 'Ctrl+G',
        currentKey: 'Ctrl+G'
    },
    {
        id: 'editor.goToDefinition',
        command: 'goToDefinition',
        description: 'Go to Definition',
        defaultKey: 'F12',
        currentKey: 'F12'
    },

    {
        id: 'explorer.revealFile',
        command: 'revealInExplorer',
        description: 'Reveal Active File in Explorer',
        defaultKey: 'Ctrl+E',
        currentKey: 'Ctrl+E'
    },

    // === Selection ===
    {
        id: 'editor.selectAll',
        command: 'selectAll',
        description: 'Select All',
        defaultKey: 'Ctrl+A',
        currentKey: 'Ctrl+A'
    },
    // === Undo/Redo ===
    {
        id: 'editor.undo',
        command: 'undo',
        description: 'Undo',
        defaultKey: 'Ctrl+Z',
        currentKey: 'Ctrl+Z'
    },
    {
        id: 'editor.redo',
        command: 'redo',
        description: 'Redo',
        defaultKey: 'Ctrl+Y',
        currentKey: 'Ctrl+Y'
    },
    // === Tab Navigation ===
    {
        id: 'editor.closeTab',
        command: 'closeTab',
        description: 'Close Tab',
        defaultKey: 'Ctrl+W',
        currentKey: 'Ctrl+W'
    },
    {
        id: 'editor.prevTab',
        command: 'prevTab',
        description: 'Previous Editor Tab',
        defaultKey: 'Ctrl+ArrowLeft',
        currentKey: 'Ctrl+ArrowLeft'
    },
    {
        id: 'editor.nextTab',
        command: 'nextTab',
        description: 'Next Editor Tab',
        defaultKey: 'Ctrl+ArrowRight',
        currentKey: 'Ctrl+ArrowRight'
    },
    {
        id: 'terminal.prevTab',
        command: 'terminalPrevTab',
        description: 'Previous Terminal Tab',
        defaultKey: 'Ctrl+Shift+ArrowLeft',
        currentKey: 'Ctrl+Shift+ArrowLeft'
    },
    {
        id: 'terminal.nextTab',
        command: 'terminalNextTab',
        description: 'Next Terminal Tab',
        defaultKey: 'Ctrl+Shift+ArrowRight',
        currentKey: 'Ctrl+Shift+ArrowRight'
    },
    // === Markdown ===
    {
        id: 'editor.markdownPreview',
        command: 'markdownPreview',
        description: 'Toggle Markdown Preview',
        defaultKey: 'Ctrl+Shift+V',
        currentKey: 'Ctrl+Shift+V'
    },

    // === File Explorer ===
    {
        id: 'explorer.newFile',
        command: 'explorerNewFile',
        description: 'New File in Explorer',
        defaultKey: 'Insert',
        currentKey: 'Insert'
    },
    {
        id: 'explorer.rename',
        command: 'explorerRename',
        description: 'Rename in Explorer',
        defaultKey: 'F2',
        currentKey: 'F2'
    },
    {
        id: 'explorer.delete',
        command: 'explorerDelete',
        description: 'Delete in Explorer',
        defaultKey: 'Delete',
        currentKey: 'Delete'
    },
];
