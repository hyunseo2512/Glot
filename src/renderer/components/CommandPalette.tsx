import React, { useEffect, useState, useRef } from 'react';
import { useCommandStore, Command } from '../store/commandStore';
import { getIconForFile } from './Icons';
import '../styles/CommandPalette.css';

interface CommandPaletteProps {
    onFileSelect?: (filePath: string) => void;
    workspaceDir?: string | null;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ onFileSelect, workspaceDir }) => {
    const { isOpen, mode, searchQuery, commands, actions } = useCommandStore();
    const inputRef = useRef<HTMLInputElement>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [fileResults, setFileResults] = useState<string[]>([]);

    // Filter commands
    const queryToFilter = (mode === 'command' && searchQuery.startsWith('>'))
        ? searchQuery.slice(1).trim()
        : searchQuery;

    const filteredCommands = mode === 'command'
        ? commands.filter(cmd => cmd.title.toLowerCase().includes(queryToFilter.toLowerCase()))
        : [];

    const items = mode === 'command' ? filteredCommands : fileResults;

    // File Search Logic
    useEffect(() => {
        if (mode === 'file' && isOpen) {
            if (!workspaceDir) {
                setFileResults([]);
                return;
            }

            const timer = setTimeout(async () => {
                try {
                    // If query is empty, maybe don't search everything? Or maybe search text: '' returns all?
                    // Our implementation: (!query || ...includes(query))
                    // But listing all files recursively might be heavy if not debounced.
                    // Debounce 200ms
                    const result = await window.electron.search.files(workspaceDir, searchQuery);
                    if (result.success && result.files) {
                        setFileResults(result.files);
                        setSelectedIndex(0);
                    }
                } catch (e) {
                    console.error(e);
                }
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [searchQuery, mode, isOpen, workspaceDir]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setSelectedIndex(0);
        }
    }, [isOpen, mode]); // Reset index on open or mode switch

    // Auto-scroll to selected item
    useEffect(() => {
        const list = document.querySelector('.command-palette-list');
        const selected = list?.children[selectedIndex] as HTMLElement;
        if (selected && list) {
            const listElement = list as HTMLElement;
            const listHeight = listElement.clientHeight;
            const itemTop = selected.offsetTop - listElement.offsetTop;
            const itemHeight = selected.clientHeight;
            const scrollTop = listElement.scrollTop;

            if (itemTop < scrollTop) {
                listElement.scrollTop = itemTop;
            } else if (itemTop + itemHeight > scrollTop + listHeight) {
                listElement.scrollTop = itemTop + itemHeight - listHeight;
            }
        }
    }, [selectedIndex, items]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % items.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + items.length) % items.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();

            // Go To Line Special Handling
            if (searchQuery.startsWith(':')) {
                const line = parseInt(searchQuery.slice(1), 10);
                if (!isNaN(line)) {
                    const event = new CustomEvent('gluon:goto-line', { detail: line });
                    window.dispatchEvent(event);
                    actions.closePalette();
                }
                return;
            }

            if (items.length > 0) {
                if (mode === 'command') {
                    executeCommand(items[selectedIndex] as Command);
                } else {
                    // File Mode
                    if (onFileSelect && workspaceDir) {
                        // items[selectedIndex] is relative path string
                        // Construct full path? handleFileOpen expects absolute path usually
                        // but let's check App.tsx. It usually works with absolute paths.
                        // fs:searchFiles returns relative paths.
                        // We need to join with workspaceDir.
                        // But we don't have 'path' module in renderer.
                        // Use simple string concat if linux.
                        const separator = workspaceDir.includes('\\') ? '\\' : '/'; // Simple guess or assume forward slash for Linux
                        const fullPath = `${workspaceDir}${workspaceDir.endsWith(separator) ? '' : separator}${items[selectedIndex]}`;
                        onFileSelect(fullPath);
                        actions.closePalette();
                    }
                }
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            actions.closePalette();
        } else if (e.key === 'Backspace' && searchQuery === '' && mode === 'file') {
            // Go back to command mode?
            // Only if it was triggered by > ?
            // Let's implement this for better UX
            actions.setMode('command');
        }
    };

    const executeCommand = (command: Command) => {
        if (command) {
            command.handler();
            actions.closePalette();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (mode === 'file' && value.startsWith('>')) {
            actions.setMode('command');
            actions.setSearchQuery(value);
        } else if (mode === 'command' && !value.startsWith('>')) {
            actions.setMode('file');
            actions.setSearchQuery(value);
        } else {
            actions.setSearchQuery(value);
        }
    };

    // Go To Line Logic
    const isGoToLine = searchQuery.startsWith(':');
    const goToLineNumber = isGoToLine ? parseInt(searchQuery.slice(1), 10) : null;

    if (!isOpen) return null;

    return (
        <div className="command-palette-overlay" onMouseDown={() => actions.closePalette()}>
            <div className="command-palette-container" onMouseDown={e => e.stopPropagation()}>
                <div className="command-palette-input-wrapper">
                    <input
                        ref={inputRef}
                        type="text"
                        className="command-palette-input"
                        placeholder={mode === 'command' ? "Search commands..." : "Search files (types > for commands, : for line)..."}
                        value={searchQuery}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                    />
                </div>
                <ul className="command-palette-list">
                    {isGoToLine ? (
                        <li
                            className={`command-item selected`}
                            onClick={() => {
                                if (goToLineNumber && !isNaN(goToLineNumber)) {
                                    const event = new CustomEvent('gluon:goto-line', { detail: goToLineNumber });
                                    window.dispatchEvent(event);
                                    actions.closePalette();
                                }
                            }}
                        >
                            <span className="command-item-title">Go to line: {isNaN(goToLineNumber!) ? '' : goToLineNumber}</span>
                            <span className="command-item-shortcut">Jump</span>
                        </li>
                    ) : items.length > 0 ? (
                        items.map((item, index) => (
                            mode === 'command' ? (
                                <li
                                    key={(item as Command).id}
                                    className={`command-item ${index === selectedIndex ? 'selected' : ''}`}
                                    onClick={() => executeCommand(item as Command)}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                >
                                    <span className="command-item-title">{(item as Command).title}</span>
                                    {(item as Command).shortcut && <span className="command-item-shortcut">{(item as Command).shortcut}</span>}
                                </li>
                            ) : (
                                <li
                                    key={item as string}
                                    className={`command-item ${index === selectedIndex ? 'selected' : ''}`}
                                    onClick={() => {
                                        if (onFileSelect && workspaceDir) {
                                            const separator = workspaceDir.includes('\\') ? '\\' : '/';
                                            const fullPath = `${workspaceDir}${workspaceDir.endsWith(separator) ? '' : separator}${item}`;
                                            onFileSelect(fullPath);
                                            actions.closePalette();
                                        }
                                    }}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                >
                                    <div className="command-item-left">
                                        <span className="command-item-icon">
                                            {getIconForFile(item as string, 16)}
                                        </span>
                                        <span className="command-item-title">{item as string}</span>
                                    </div>
                                    <span className="command-item-shortcut">File</span>
                                </li>
                            )
                        ))
                    ) : (
                        <div className="command-empty">{mode === 'command' ? 'No commands found' : 'No files found'}</div>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default CommandPalette;
