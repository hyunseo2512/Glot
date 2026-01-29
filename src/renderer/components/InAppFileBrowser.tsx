import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FolderIcon, FolderPlusIcon, XIcon, ChevronUpIcon, getIconForFile } from './Icons';
import '../styles/InAppFileBrowser.css';

export type FileBrowserMode = 'selectFolder' | 'selectFile' | 'saveFile';

interface FileEntry {
    name: string;
    path: string;
    isDirectory: boolean;
}

interface InAppFileBrowserProps {
    mode: FileBrowserMode;
    remote?: boolean;
    initialPath?: string;
    onSelect: (path: string) => void;
    onCancel: () => void;
}

const TITLES: Record<FileBrowserMode, string> = {
    selectFolder: '폴더 열기',
    selectFile: '파일 열기',
    saveFile: '파일 저장',
};

const InAppFileBrowser: React.FC<InAppFileBrowserProps> = ({ mode, remote = false, initialPath, onSelect, onCancel }) => {
    const [currentPath, setCurrentPath] = useState('');
    const [pathInput, setPathInput] = useState('');
    const [entries, setEntries] = useState<FileEntry[]>([]);
    const [allEntries, setAllEntries] = useState<FileEntry[]>([]);
    const [showHidden, setShowHidden] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [saveFileName, setSaveFileName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const listRef = useRef<HTMLDivElement>(null);
    const newFolderInputRef = useRef<HTMLInputElement>(null);

    // 초기 디렉토리 로드
    useEffect(() => {
        (async () => {
            try {
                if (initialPath) {
                    navigateTo(initialPath);
                } else if (remote) {
                    navigateTo('/');
                } else {
                    const result = await window.electron.fs.getHomePath();
                    if (result.success && result.path) {
                        navigateTo(result.path);
                    }
                }
            } catch {
                setError('디렉토리를 가져올 수 없습니다');
                setLoading(false);
            }
        })();
    }, []);

    // 디렉토리 읽기
    const navigateTo = useCallback(async (dirPath: string) => {
        setLoading(true);
        setError('');
        setSelectedIndex(-1);
        setIsCreatingFolder(false);
        try {
            const result = remote
                ? await window.electron.sftp.list(dirPath)
                : await window.electron.fs.readDir(dirPath);
            if (result.success && result.files) {
                // 정렬: 폴더 우선, 이름순
                const sorted = result.files
                    .sort((a: FileEntry, b: FileEntry) => {
                        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
                        return a.name.localeCompare(b.name);
                    });
                setAllEntries(sorted);
                setCurrentPath(dirPath);
                setPathInput(dirPath);
            } else {
                setError(result.error || '디렉토리를 읽을 수 없습니다');
            }
        } catch {
            setError('디렉토리를 읽을 수 없습니다');
        }
        setLoading(false);
    }, []);

    // showHidden에 따라 entries 필터링
    useEffect(() => {
        if (showHidden) {
            setEntries(allEntries);
        } else {
            setEntries(allEntries.filter(f => !f.name.startsWith('.')));
        }
        setSelectedIndex(-1);
    }, [showHidden, allEntries]);

    // 뒤로가기
    const goUp = useCallback(() => {
        const parent = currentPath.replace(/\/[^/]+\/?$/, '') || '/';
        navigateTo(parent);
    }, [currentPath, navigateTo]);

    // 경로 입력 Enter
    const handlePathSubmit = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            navigateTo(pathInput);
        }
    };

    // 아이템 클릭
    const handleItemClick = (index: number) => {
        setSelectedIndex(index);
    };

    // 아이템 더블클릭
    const handleItemDoubleClick = (entry: FileEntry) => {
        if (entry.isDirectory) {
            navigateTo(entry.path);
        } else if (mode === 'selectFile') {
            onSelect(entry.path);
        } else if (mode === 'saveFile') {
            setSaveFileName(entry.name);
        }
    };

    // 확인 버튼
    const handleConfirm = () => {
        if (mode === 'selectFolder') {
            // 리스트에서 폴더를 선택했으면 그 폴더, 아니면 현재 경로
            if (selectedIndex >= 0 && entries[selectedIndex]?.isDirectory) {
                onSelect(entries[selectedIndex].path);
            } else {
                onSelect(currentPath);
            }
        } else if (mode === 'selectFile') {
            if (selectedIndex >= 0 && !entries[selectedIndex].isDirectory) {
                onSelect(entries[selectedIndex].path);
            }
        } else if (mode === 'saveFile') {
            if (saveFileName.trim()) {
                const savePath = currentPath + '/' + saveFileName.trim();
                onSelect(savePath);
            }
        }
    };

    // 확인 가능 여부
    const canConfirm = () => {
        if (mode === 'selectFolder') return !!currentPath;
        if (mode === 'selectFile') return selectedIndex >= 0 && !entries[selectedIndex]?.isDirectory;
        if (mode === 'saveFile') return !!saveFileName.trim();
        return false;
    };

    // 새 폴더 생성
    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        const newPath = currentPath + '/' + newFolderName.trim();
        try {
            const result = remote
                ? await window.electron.sftp.mkdir(newPath)
                : await window.electron.fs.createDir(newPath);
            if (result.success) {
                setIsCreatingFolder(false);
                setNewFolderName('');
                await navigateTo(currentPath); // 새로고침
            } else {
                setError(result.error || '폴더 생성 실패');
            }
        } catch {
            setError('폴더 생성 실패');
        }
    };

    // 새 폴더 입력 포커스
    useEffect(() => {
        if (isCreatingFolder && newFolderInputRef.current) {
            newFolderInputRef.current.focus();
        }
    }, [isCreatingFolder]);

    // 키보드 네비게이션
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // 폴더 생성 중이면 키보드 네비게이션 비활성화
            if (isCreatingFolder) {
                if (e.key === 'Escape') {
                    setIsCreatingFolder(false);
                    setNewFolderName('');
                }
                return;
            }

            if (e.key === 'Escape') {
                onCancel();
            } else if (e.key === 'Enter' && canConfirm()) {
                handleConfirm();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, entries.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
            } else if (e.key === 'Backspace' && document.activeElement?.tagName !== 'INPUT') {
                goUp();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [entries, selectedIndex, onCancel, currentPath, saveFileName, isCreatingFolder]);

    // 선택된 아이템 스크롤
    useEffect(() => {
        if (selectedIndex >= 0 && listRef.current) {
            const items = listRef.current.querySelectorAll('.file-browser-item');
            items[selectedIndex]?.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedIndex]);

    return (
        <div className="file-browser-overlay" onClick={(e) => {
            if (e.target === e.currentTarget) onCancel();
        }}>
            <div className="file-browser-modal">
                {/* Header */}
                <div className="file-browser-header">
                    <h3>{TITLES[mode]}</h3>
                    <div className="file-browser-header-actions">
                        <button
                            className={`file-browser-action-btn${showHidden ? ' active' : ''}`}
                            onClick={() => setShowHidden(!showHidden)}
                            title={showHidden ? '숨김 파일 숨기기' : '숨김 파일 보기'}
                            style={showHidden ? { color: '#89b4fa' } : {}}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                {showHidden ? (
                                    <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
                                ) : (
                                    <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>
                                )}
                            </svg>
                        </button>
                        <button
                            className="file-browser-action-btn"
                            onClick={() => { setIsCreatingFolder(true); setNewFolderName(''); }}
                            title="새 폴더"
                        >
                            <FolderPlusIcon size={16} />
                        </button>
                        <button className="file-browser-close" onClick={onCancel}>
                            <XIcon size={16} />
                        </button>
                    </div>
                </div>

                {/* Path bar */}
                <div className="file-browser-pathbar">
                    <button
                        className="file-browser-back"
                        onClick={goUp}
                        disabled={currentPath === '/'}
                        title="상위 폴더"
                    >
                        <ChevronUpIcon size={16} />
                    </button>
                    <input
                        className="file-browser-path-input"
                        value={pathInput}
                        onChange={(e) => setPathInput(e.target.value)}
                        onKeyDown={handlePathSubmit}
                        placeholder="경로를 입력하세요..."
                    />
                </div>

                {/* New folder input */}
                {isCreatingFolder && (
                    <div className="file-browser-new-folder">
                        <FolderIcon size={16} />
                        <input
                            ref={newFolderInputRef}
                            className="file-browser-new-folder-input"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreateFolder();
                                if (e.key === 'Escape') { setIsCreatingFolder(false); setNewFolderName(''); }
                            }}
                        />
                        <button
                            className="file-browser-new-folder-confirm"
                            onClick={handleCreateFolder}
                            disabled={!newFolderName.trim()}
                        >
                            생성
                        </button>
                    </div>
                )}

                {/* File list */}
                <div className="file-browser-list" ref={listRef}>
                    {loading ? (
                        <div className="file-browser-loading">로딩 중...</div>
                    ) : entries.length === 0 ? (
                        <div className="file-browser-empty">빈 디렉토리</div>
                    ) : (
                        entries.map((entry, index) => (
                            <div
                                key={entry.path}
                                className={`file-browser-item ${index === selectedIndex ? 'selected' : ''}`}
                                onClick={() => handleItemClick(index)}
                                onDoubleClick={() => handleItemDoubleClick(entry)}
                            >
                                <span className="file-browser-item-icon">
                                    {entry.isDirectory
                                        ? <FolderIcon size={16} />
                                        : getIconForFile(entry.name, 16)
                                    }
                                </span>
                                <span className="file-browser-item-name">{entry.name}</span>
                            </div>
                        ))
                    )}
                </div>

                {/* Save filename input */}
                {mode === 'saveFile' && (
                    <div className="file-browser-save-bar">
                        <label>파일명:</label>
                        <input
                            className="file-browser-save-input"
                            value={saveFileName}
                            onChange={(e) => setSaveFileName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && saveFileName.trim()) handleConfirm();
                            }}
                            placeholder="저장할 파일명을 입력하세요..."
                            autoFocus
                        />
                    </div>
                )}

                {/* Error */}
                {error && <div className="file-browser-error">{error}</div>}

                {/* Footer */}
                <div className="file-browser-footer">
                    <button className="file-browser-btn cancel" onClick={onCancel}>
                        취소
                    </button>
                    <button
                        className="file-browser-btn confirm"
                        onClick={handleConfirm}
                        disabled={!canConfirm()}
                    >
                        {mode === 'saveFile' ? '저장' : '선택'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InAppFileBrowser;
