import { useState, useEffect, useRef } from 'react';
import { KeyBinding, DEFAULT_SHORTCUTS } from './types/shortcuts';
import { OpenFile } from './types/file';
import Sidebar from './components/Sidebar';
import FileExplorer from './components/FileExplorer';
import TerminalPanel from './components/TerminalPanel';
import AIPanel from './components/AIPanel';
import SettingsPanel from './components/SettingsPanel';

import GitPanel from './components/GitPanel';
import SearchPanel from './components/SearchPanel';
import DebugPanel from './components/DebugPanel';
import Resizer from './components/Resizer';
import {
  SearchIcon, GitIcon, SettingsIcon, ZoomInIcon, PlusIcon, MinusIcon, ActivityIcon,
  SidebarLeftIcon, LayoutBottomIcon, SidebarRightIcon,
  RotateCcwIcon,
  RotateCwIcon,
  ErrorIcon,
  WarningIcon,
  BugIcon,
  PlayIcon,
  HomeIcon,
  UpdateIcon
} from './components/Icons';
import glotLogo from '/icons/glot-512.svg';
import './styles/App.css';
import SSHConnectionModal from './components/SSHConnectionModal';
import WelcomeScreen from './components/WelcomeScreen';
import UnsavedChangesModal from './components/UnsavedChangesModal';
import InAppFileBrowser, { FileBrowserMode } from './components/InAppFileBrowser';

/**
 * Glot 메인 애플리케이션 컴포넌트 - VS Code 스타일 레이아웃
 */
// OpenFile interface moved to types/file.ts

import { EditorSettings, DEFAULT_EDITOR_SETTINGS } from './types/settings';

// ... (existing imports)

import { GlobalTooltip } from './components/GlobalTooltip';
import CommandPalette from './components/CommandPalette';
import { useCommandStore } from './store/commandStore'; // Added this import for useAuthStore


import EditorPane from './components/EditorPane';
import UpdateBanner from './components/UpdateBanner';

function App() {
  const [sidebarView, setSidebarView] = useState<'explorer' | 'search' | 'git' | 'debug'>('explorer');
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);

  // Split View State
  const [editorSplitRatio, setEditorSplitRatio] = useState(0.5); // 0.5 = 50% split


  const [isSSHModalOpen, setIsSSHModalOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isWindowMaximized, setIsWindowMaximized] = useState(false);

  const [editorSettings, setEditorSettings] = useState<EditorSettings>(DEFAULT_EDITOR_SETTINGS);

  // 설정 로드 함수 - settings.json에서 읽어옴
  const loadEditorSettings = async () => {
    try {
      const result = await window.electron.settings.read();
      if (result.success && result.data) {
        const jsonSettings = result.data as Record<string, unknown>;
        // JSON 키 형식 (editor.fontSize)을 EditorSettings 객체로 변환
        const settings: Partial<EditorSettings> = {};
        if (jsonSettings['editor.fontSize'] !== undefined) settings.fontSize = jsonSettings['editor.fontSize'] as number;
        if (jsonSettings['editor.fontFamily'] !== undefined) settings.fontFamily = jsonSettings['editor.fontFamily'] as string;
        if (jsonSettings['editor.fontLigatures'] !== undefined) settings.fontLigatures = jsonSettings['editor.fontLigatures'] as boolean;
        if (jsonSettings['editor.tabSize'] !== undefined) settings.tabSize = jsonSettings['editor.tabSize'] as number;
        if (jsonSettings['editor.insertSpaces'] !== undefined) settings.insertSpaces = jsonSettings['editor.insertSpaces'] as boolean;
        if (jsonSettings['editor.wordWrap'] !== undefined) settings.wordWrap = jsonSettings['editor.wordWrap'] as boolean;
        if (jsonSettings['editor.minimap'] !== undefined) settings.minimap = jsonSettings['editor.minimap'] as boolean;
        if (jsonSettings['editor.lineNumbers'] !== undefined) settings.lineNumbers = jsonSettings['editor.lineNumbers'] as boolean;
        if (jsonSettings['editor.formatOnSave'] !== undefined) settings.formatOnSave = jsonSettings['editor.formatOnSave'] as boolean;
        if (jsonSettings['editor.theme'] !== undefined) settings.theme = jsonSettings['editor.theme'] as string;
        if (jsonSettings['editor.defaultFormatter'] !== undefined) settings.defaultFormatter = jsonSettings['editor.defaultFormatter'] as string;
        setEditorSettings({ ...DEFAULT_EDITOR_SETTINGS, ...settings });
      }
    } catch (error) {
      console.error('Failed to load editor settings:', error);
    }
  };

  // 초기 설정 로드
  useEffect(() => {
    loadEditorSettings();
  }, []);

  // Update Global Theme Class on document.documentElement
  useEffect(() => {
    const root = document.documentElement;
    // Remove previous theme classes
    root.classList.remove('theme-tokyo-night', 'theme-modern-dark', 'theme-modern-white');

    // Add current theme class
    const currentTheme = editorSettings.theme || 'modern-dark';
    root.classList.add(`theme-${currentTheme}`);
  }, [editorSettings.theme]);

  // 윈도우 최대화 상태 추적
  useEffect(() => {
    const cleanup = (window.electron as any).window.onMaximizedChanged?.((maximized: boolean) => {
      setIsWindowMaximized(maximized);
    });
    return () => cleanup?.();
  }, []);

  // 여러 파일 관리 (Primary / Secondary Split View)
  const [primaryFiles, setPrimaryFiles] = useState<OpenFile[]>([]);
  const [primaryActiveIndex, setPrimaryActiveIndex] = useState<number>(-1);

  const [secondaryFiles, setSecondaryFiles] = useState<OpenFile[]>([]);
  const [secondaryActiveIndex, setSecondaryActiveIndex] = useState<number>(-1);

  const [activeGroup, setActiveGroup] = useState<'primary' | 'secondary'>('primary');
  const [isSplitView, setIsSplitView] = useState(false);

  // Helper to get current active file based on group
  const activeFileIndex = activeGroup === 'primary' ? primaryActiveIndex : secondaryActiveIndex;
  const openFiles = activeGroup === 'primary' ? primaryFiles : secondaryFiles;
  const setOpenFiles = (files: OpenFile[] | ((prev: OpenFile[]) => OpenFile[])) => {
    if (activeGroup === 'primary') {
      setPrimaryFiles(files);
    } else {
      setSecondaryFiles(files);
    }
  };
  const setActiveFileIndex = (index: number | ((prev: number) => number)) => {
    if (activeGroup === 'primary') {
      setPrimaryActiveIndex(index);
    } else {
      setSecondaryActiveIndex(index);
    }
  };

  const [workspaceDir, setWorkspaceDir] = useState<string | null>(null);

  // File System Refresh Trigger (Agent -> App -> FileExplorer)
  const [refreshKey, setRefreshKey] = useState(0);
  const handleForceRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Reveal file in explorer
  const [revealFilePath, setRevealFilePath] = useState<string | null>(null);

  // Ctrl+L 4단계 사이클 추적: 열기 → 포커스 → 블러 → 닫기
  const aiPromptVisited = useRef(false);

  // Unsaved Modal State
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [unsavedFilesForModal, setUnsavedFilesForModal] = useState<OpenFile[]>([]);
  const unsavedChangesResolveRef = useRef<(value: boolean) => void>(() => { });

  // Diagnostics (Errors/Warnings)
  const [diagnostics, setDiagnostics] = useState<{ errors: number; warnings: number; markers: any[] }>({ errors: 0, warnings: 0, markers: [] });

  // Current Git Branch
  const [currentBranch, setCurrentBranch] = useState<string>('');

  // Clone Modal State
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneUrl, setCloneUrl] = useState('');
  const [isCloning, setIsCloning] = useState(false);

  // 인앱 파일 브라우저 상태
  const [fileBrowserOpen, setFileBrowserOpen] = useState(false);
  const [fileBrowserMode, setFileBrowserMode] = useState<FileBrowserMode>('selectFolder');
  const [fileBrowserRemote, setFileBrowserRemote] = useState(false);
  const [fileBrowserInitialPath, setFileBrowserInitialPath] = useState<string | undefined>(undefined);
  const fileBrowserResolveRef = useRef<(value: string | null) => void>(() => { });

  // 원격 워크스페이스 상태
  const [isRemoteWorkspace, setIsRemoteWorkspace] = useState(false);
  const [remoteUser, setRemoteUser] = useState('');

  // 인앱 알림 모달
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [disconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false);

  // Promise 기반 인앱 파일 브라우저 호출 래퍼
  const showFileBrowser = (mode: FileBrowserMode, remote = false, initialPath?: string): Promise<string | null> => {
    return new Promise((resolve) => {
      fileBrowserResolveRef.current = resolve;
      setFileBrowserMode(mode);
      setFileBrowserRemote(remote);
      setFileBrowserInitialPath(initialPath);
      setFileBrowserOpen(true);
    });
  };

  const handleFileBrowserSelect = (path: string) => {
    setFileBrowserOpen(false);
    fileBrowserResolveRef.current(path);
  };

  const handleFileBrowserCancel = () => {
    setFileBrowserOpen(false);
    fileBrowserResolveRef.current(null);
  };

  const handleCloneRepo = () => {
    setShowCloneModal(true);
  };

  const executeClone = async () => {
    if (!cloneUrl) {
      setAlertMessage('Please enter a repository URL');
      return;
    }

    try {
      const selectedPath = await showFileBrowser('selectFolder');
      if (!selectedPath) return;
      const dirResult = { path: selectedPath };

      setIsCloning(true);

      // 저장소 이름 추출 (예: https://github.com/user/repo.git -> repo)
      const repoName = cloneUrl.split('/').pop()?.replace('.git', '') || 'repository';
      const targetDir = `${dirResult.path}/${repoName}`;

      const result = await window.electron.git.clone(cloneUrl, targetDir);

      if (result.success) {
        setWorkspaceDir(targetDir);
        setPrimaryFiles([]);
        setPrimaryActiveIndex(-1);
        setSecondaryFiles([]);
        setSecondaryActiveIndex(-1);
        setIsSplitView(false);
        setActiveGroup('primary');
        setShowCloneModal(false);
        setCloneUrl('');
      } else {
        setAlertMessage(`Clone failed: ${result.error}`);
      }
    } catch (err: any) {
      setAlertMessage(`Error: ${err.message}`);
    } finally {
      setIsCloning(false);
    }
  };

  // Git 변경 파일 클릭 시 (Diff 보기) - 자동 스플릿
  const handleGitFileClick = async (filePath: string) => {
    if (!workspaceDir) return;

    try {
      // 1. 원본 파일 내용 가져오기 (HEAD)
      const originalResult = await window.electron.git.show(workspaceDir, filePath);
      const originalContent = originalResult.success ? originalResult.content : '';

      // 2. 현재 작업 파일 내용 가져오기 (Local)
      const modifiedResult = await window.electron.fs.readFile(`${workspaceDir}/${filePath}`);
      const modifiedContent = modifiedResult.success ? modifiedResult.content : '';

      // 3. Diff Editor 열기 (자동 스플릿)
      const diffFile: OpenFile = {
        path: filePath,
        content: modifiedContent || '',
        isDirty: false,
        isDiff: true,
        originalContent: originalContent || '',
        modifiedContent: modifiedContent || ''
      };

      // 원본 파일도 준비
      const originalFile: OpenFile = {
        path: filePath,
        content: modifiedContent || '',
        isDirty: false
      };

      // 이미 secondary에 diff로 열려있는지 확인
      const existingDiffIndex = secondaryFiles.findIndex(f => f.path === filePath && f.isDiff);

      if (existingDiffIndex !== -1) {
        // 이미 열려있으면 업데이트
        const updatedFiles = [...secondaryFiles];
        updatedFiles[existingDiffIndex] = diffFile;
        setSecondaryFiles(updatedFiles);
        setSecondaryActiveIndex(existingDiffIndex);
      } else {
        // 새로 열기: secondary에 diff 추가
        setSecondaryFiles(prev => [...prev, diffFile]);
        setSecondaryActiveIndex(secondaryFiles.length);
      }

      // Primary에 원본 파일이 없으면 열기
      const existingPrimaryIndex = primaryFiles.findIndex(f => f.path === filePath && !f.isDiff);
      if (existingPrimaryIndex !== -1) {
        setPrimaryActiveIndex(existingPrimaryIndex);
      } else {
        setPrimaryFiles(prev => [...prev, originalFile]);
        setPrimaryActiveIndex(primaryFiles.length);
      }

      // 자동 스플릿 활성화
      if (!isSplitView) {
        setIsSplitView(true);
        if (editorSplitRatio < 0.1 || editorSplitRatio > 0.9) {
          setEditorSplitRatio(0.5);
        }
      }
      setActiveGroup('secondary');
    } catch (error) {
      console.error('Failed to open diff:', error);
      setAlertMessage('Failed to open diff view');
    }
  };

  // 메뉴 드롭다운 상태
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [editMenuOpen, setEditMenuOpen] = useState(false);
  const [runMenuOpen, setRunMenuOpen] = useState(false);
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [forceShowWelcome, setForceShowWelcome] = useState(false);
  const [showCloseProjectModal, setShowCloseProjectModal] = useState(false);

  // 줌 메뉴 상태
  const [zoomMenuOpen, setZoomMenuOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.1);
  const [shortcuts, setShortcuts] = useState<KeyBinding[]>(DEFAULT_SHORTCUTS);

  // Load Shortcuts
  const loadShortcuts = async () => {
    const saved = await window.electron.store.get('key_bindings');
    if (saved.success && Array.isArray(saved.value)) {
      const merged = DEFAULT_SHORTCUTS.map(def => {
        const s = (saved.value as KeyBinding[]).find((k: KeyBinding) => k.id === def.id);
        return s ? { ...def, currentKey: s.currentKey } : def;
      });
      setShortcuts(merged);
    }
  };

  useEffect(() => {
    loadShortcuts();
  }, []);



  // Monitor workspace existence (every 3 seconds) — Skip in remote mode
  useEffect(() => {
    if (!workspaceDir || isRemoteWorkspace) return;

    const checkWorkspaceExists = async () => {
      try {
        const result = await window.electron.fs.exists(workspaceDir);
        if (result.success && !result.exists) {
          setAlertMessage(`Project directory '${workspaceDir}' not found.\nIt may have been deleted or moved.`);
          setTimeout(() => window.location.reload(), 3000);
        }
      } catch (error) {
        console.error('Workspace check failed:', error);
      }
    };

    const interval = setInterval(checkWorkspaceExists, 3000);
    return () => clearInterval(interval);
  }, [workspaceDir, isRemoteWorkspace]);

  // Close on click outside menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check for top menu dropdowns
      if (fileMenuOpen || editMenuOpen || runMenuOpen || helpMenuOpen || viewMenuOpen) {
        if (!target.closest('.menu-dropdown')) {
          setFileMenuOpen(false);
          setEditMenuOpen(false);
          setRunMenuOpen(false);
          setHelpMenuOpen(false);
          setViewMenuOpen(false);
        }
      }

      // Check for zoom menu
      if (zoomMenuOpen) {
        if (!target.closest('.zoom-container')) {
          setZoomMenuOpen(false);
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [fileMenuOpen, editMenuOpen, runMenuOpen, helpMenuOpen, viewMenuOpen, zoomMenuOpen]);

  // Size State
  const [sidePanelWidth, setSidePanelWidth] = useState(300);
  const [aiPanelWidth, setAIPanelWidth] = useState(400);
  const [terminalHeight, setTerminalHeight] = useState(250);
  const [isTerminalMaximized, setIsTerminalMaximized] = useState(false);
  const prevTerminalHeightRef = useRef<number>(250);

  // Sidebar Toggle Handler (common for button and shortcut)
  const toggleSidebar = () => {
    console.log('🔄 Executing sidebar toggle');
    setIsSidePanelOpen((prev) => {
      console.log('Sidebar state:', prev, '→', !prev);
      return !prev;
    });
  };

  // Responsive handling: Auto close AI panel if window size is small
  useEffect(() => {
    const handleResize = () => {
      // If less than 1000px and AI panel is open, close it
      if (window.innerWidth < 1000 && isAIPanelOpen) {
        setIsAIPanelOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isAIPanelOpen]);

  // Command Palette Logic
  const { actions: commandActions } = useCommandStore();

  useEffect(() => {
    // Global Keyboard Shortcuts for Command Palette
    const handleGlobalKeydown = (e: KeyboardEvent) => {
      // Ctrl+Shift+P or F1 -> Command Mode
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') || e.key === 'F1') {
        e.preventDefault();
        commandActions.openPalette('command');
      }
      // Ctrl+P -> File Mode
      else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        commandActions.openPalette('file');
      }
    };

    window.addEventListener('keydown', handleGlobalKeydown);

    // Register Core Commands
    commandActions.registerCommand({
      id: 'window.reload',
      title: 'Reload Window',
      handler: () => window.location.reload(),
      shortcut: 'Ctrl+R'
    });
    commandActions.registerCommand({
      id: 'settings.open',
      title: 'Open Settings',
      handler: () => setSettingsOpen(true),
      shortcut: 'Ctrl+,'
    });
    commandActions.registerCommand({
      id: 'sidebar.toggle',
      title: 'Toggle Sidebar',
      handler: () => toggleSidebar(),
      shortcut: 'Ctrl+B'
    });
    commandActions.registerCommand({
      id: 'terminal.toggle',
      title: 'Toggle Terminal',
      handler: () => setIsTerminalOpen(prev => !prev),
      shortcut: 'Ctrl+J'
    });
    commandActions.registerCommand({
      id: 'ai.toggle',
      title: 'Toggle AI Panel',
      handler: () => setIsAIPanelOpen(prev => !prev),
      shortcut: 'Ctrl+L'
    });
    commandActions.registerCommand({
      id: 'file.new',
      title: 'New File',
      handler: () => handleNewFile(),
      shortcut: 'Ctrl+N'
    });
    commandActions.registerCommand({
      id: 'file.save',
      title: 'Save File',
      handler: () => handleFileSave(activeFileIndex),
      shortcut: 'Ctrl+S'
    });

    commandActions.registerCommand({
      id: 'view.splitEditor',
      title: 'Split Editor',
      handler: () => {
        if (!isSplitView) {
          // Open current file in secondary group
          if (activeGroup === 'primary' && primaryActiveIndex !== -1) {
            const currentFile = primaryFiles[primaryActiveIndex];
            if (currentFile) {
              setSecondaryFiles([currentFile]);
              setSecondaryActiveIndex(0);
            }
          }
          setIsSplitView(true);
          setActiveGroup('secondary');
        } else {
          // Already split, maybe focus next group?
          setActiveGroup(prev => prev === 'primary' ? 'secondary' : 'primary');
        }
      },
      shortcut: 'Ctrl+\\'
    });
    commandActions.registerCommand({
      id: 'view.toggleSplit',
      title: 'Toggle Split View',
      handler: () => setIsSplitView(prev => !prev),
      shortcut: 'Ctrl+Shift+\\'
    });

    return () => window.removeEventListener('keydown', handleGlobalKeydown);
  }, [activeFileIndex, openFiles, activeGroup, isSplitView, primaryFiles, secondaryFiles, primaryActiveIndex, secondaryActiveIndex]);

  // File Open Handler (add tab)
  const handleFileOpen = async (filePath: string) => {
    // Disable force show welcome screen on file open
    setForceShowWelcome(false);

    if (!window.electron?.fs?.readFile) {
      console.error('❌ Electron fs API not available');
      return;
    }

    try {
      const result = isRemoteWorkspace
        ? await window.electron.sftp.read(filePath)
        : await window.electron.fs.readFile(filePath);

      if (result.success && result.content !== undefined) {
        const newFile: OpenFile = {
          path: filePath,
          content: result.content,
          isDirty: false
        };

        if (activeGroup === 'primary') {
          const existingIndex = primaryFiles.findIndex(f => f.path === filePath);
          if (existingIndex !== -1) {
            setPrimaryActiveIndex(existingIndex);
          } else {
            setPrimaryFiles([...primaryFiles, newFile]);
            setPrimaryActiveIndex(primaryFiles.length);
          }
        } else {
          const existingIndex = secondaryFiles.findIndex(f => f.path === filePath);
          if (existingIndex !== -1) {
            setSecondaryActiveIndex(existingIndex);
          } else {
            setSecondaryFiles([...secondaryFiles, newFile]);
            setSecondaryActiveIndex(secondaryFiles.length);
          }
        }

        console.log('✅ File open successful:', filePath);
      } else {
        console.error('File read failed:', result.error);
      }
    } catch (error) {
      console.error('Failed to read file:', error);
    }
  };



  // Helper for internal handlers
  const handleCloseTabInternal = async (index: number, group: 'primary' | 'secondary') => {
    // Logic duplicated from old handleCloseTab but explicit
    const files = group === 'primary' ? primaryFiles : secondaryFiles;
    const setFiles = group === 'primary' ? setPrimaryFiles : setSecondaryFiles;
    const activeIdx = group === 'primary' ? primaryActiveIndex : secondaryActiveIndex;
    const setIdx = group === 'primary' ? setPrimaryActiveIndex : setSecondaryActiveIndex;

    const fileToClose = files[index];
    if (!fileToClose) return;

    if (fileToClose.isDirty) {
      const proceed = await checkUnsavedChanges([fileToClose]);
      if (!proceed) return;
    }

    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    if (activeIdx >= index) {
      setIdx(Math.max(0, Math.min(activeIdx - (activeIdx > index ? 1 : 0), newFiles.length - 1)));
    }
    if (newFiles.length === 0) setIdx(-1);
  };

  const handleFileSaveInternal = (index: number | undefined, group: 'primary' | 'secondary') => {
    const files = group === 'primary' ? primaryFiles : secondaryFiles;
    const activeIdx = group === 'primary' ? primaryActiveIndex : secondaryActiveIndex;
    const targetIndex = index ?? activeIdx;

    if (targetIndex === -1) return;
    const file = files[targetIndex];
    if (file) {
      saveSingleFile(file).then(success => {
        if (success) {
          const setFiles = group === 'primary' ? setPrimaryFiles : setSecondaryFiles;
          const newFiles = [...files];
          newFiles[targetIndex] = { ...file, isDirty: false };
          setFiles(newFiles);
        }
      });
    }
  };

  // File Save Handler (Legacy wrapper for commands)
  const handleFileSave = async (index: number = activeFileIndex) => {
    if (index === -1) {
      console.warn('No file selected to save');
      return;
    }

    const fileToSave = openFiles[index];
    if (!fileToSave) return;

    if (!window.electron?.fs?.writeFile) {
      console.error('Electron fs API not available');
      return;
    }

    try {
      let filePath = fileToSave.path;

      // If untitled file, show save dialog
      if (filePath.startsWith('untitled-')) {
        const savePath = await showFileBrowser('saveFile');
        if (!savePath) {
          return; // User cancelled
        }
        filePath = savePath;
      }

      const result = isRemoteWorkspace
        ? await window.electron.sftp.write(filePath, fileToSave.content)
        : await window.electron.fs.writeFile(filePath, fileToSave.content);

      if (result.success) {
        // Remove isDirty flag and update path
        const updatedFiles = [...openFiles];
        updatedFiles[index] = {
          ...fileToSave,
          path: filePath, // Update to new path
          isDirty: false
        };
        setOpenFiles(updatedFiles);
        console.log('✅ File save successful:', filePath);
      } else {
        console.error('❌ File save failed:', result.error);
      }
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  };

  // Save All Modified Files (Primary & Secondary)
  const handleSaveAll = async () => {
    let hasChanges = false;
    let newPrimaryFiles = [...primaryFiles];
    let newSecondaryFiles = [...secondaryFiles];

    // Primary Group
    for (let i = 0; i < newPrimaryFiles.length; i++) {
      if (newPrimaryFiles[i].isDirty) {
        const file = newPrimaryFiles[i];
        if (await saveSingleFile(file)) {
          newPrimaryFiles[i] = { ...file, isDirty: false };
          hasChanges = true;
        }
      }
    }
    // Secondary Group
    for (let i = 0; i < newSecondaryFiles.length; i++) {
      if (newSecondaryFiles[i].isDirty) {
        const file = newSecondaryFiles[i];
        if (await saveSingleFile(file)) {
          newSecondaryFiles[i] = { ...file, isDirty: false };
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      setPrimaryFiles(newPrimaryFiles);
      setSecondaryFiles(newSecondaryFiles);
      if (workspaceDir) handleForceRefresh();
    }
  };

  const saveSingleFile = async (file: OpenFile): Promise<boolean> => {
    try {
      let filePath = file.path;
      if (filePath.startsWith('untitled-')) {
        const savePath = await showFileBrowser('saveFile');
        if (!savePath) return false;
        filePath = savePath;
      }
      const writeFn = isRemoteWorkspace ? window.electron?.sftp?.write : window.electron?.fs?.writeFile;
      if (writeFn) {
        const res = await writeFn(filePath, file.content);
        if (res.success) {
          console.log('✅ Save All Success:', filePath);
          return true;
        } else {
          console.error('❌ Save All Failed:', res.error);
        }
      }
    } catch (err) {
      console.error('Error in saveSingleFile', err);
    }
    return false;
  };

  // New File Creation Handler
  const handleNewFile = () => {
    if (fileMenuOpen) setFileMenuOpen(false);

    // Generate untitled name (avoiding overlap with existing files)
    let counter = 1;
    while (openFiles.some(f => f.path === `untitled-${counter}`)) {
      counter++;
    }
    const untitledPath = `untitled-${counter}`;

    const newFile: OpenFile = {
      path: untitledPath,
      content: '',
      isDirty: true // Mark as unsaved
    };

    const targetSetFiles = activeGroup === 'primary' ? setPrimaryFiles : setSecondaryFiles;
    const targetSetActiveIndex = activeGroup === 'primary' ? setPrimaryActiveIndex : setSecondaryActiveIndex;
    const targetFiles = activeGroup === 'primary' ? primaryFiles : secondaryFiles;

    targetSetFiles([...targetFiles, newFile]);
    targetSetActiveIndex(targetFiles.length);
  };

  // New Window Creation Handler
  const handleNewWindow = async () => {
    if (fileMenuOpen) setFileMenuOpen(false);
    if (!window.electron?.window?.create) {
      console.error('Window create API not available');
      return;
    }
    await window.electron.window.create();
  };







  // File Content Change Handler
  const handlePrimaryContentChange = (content: string) => {
    if (primaryActiveIndex === -1) return;
    const newFiles = [...primaryFiles];
    newFiles[primaryActiveIndex] = { ...newFiles[primaryActiveIndex], content, isDirty: true };
    setPrimaryFiles(newFiles);
  };

  const handleSecondaryContentChange = (content: string) => {
    if (secondaryActiveIndex === -1) return;
    const newFiles = [...secondaryFiles];
    newFiles[secondaryActiveIndex] = { ...newFiles[secondaryActiveIndex], content, isDirty: true };
    setSecondaryFiles(newFiles);
  };



  // Check for changes and ask to save
  const checkUnsavedChanges = async (filesToCheck: OpenFile[]): Promise<boolean> => {
    const dirtyFiles = filesToCheck.filter(f => f.isDirty);
    if (dirtyFiles.length === 0) return true;

    setUnsavedFilesForModal(dirtyFiles);
    setShowUnsavedModal(true);

    return new Promise<boolean>((resolve) => {
      unsavedChangesResolveRef.current = resolve;
    });
  };

  const handleUnsavedModalAction = async (action: 'save' | 'dontsave' | 'cancel') => {
    setShowUnsavedModal(false);

    if (action === 'save') {
      // Save all dirty files sequentially
      for (const file of unsavedFilesForModal) {
        // Find index in current openFiles to handle saving correctly
        const index = openFiles.findIndex(f => f.path === file.path);
        if (index !== -1) {
          await handleFileSave(index);
        }
      }
      unsavedChangesResolveRef.current(true);
    } else if (action === 'dontsave') {
      unsavedChangesResolveRef.current(true);
    } else {
      unsavedChangesResolveRef.current(false);
    }
  };

  // Close Tab
  const handleCloseTab = async (index: number) => {
    // Determine which group's files to operate on
    const currentFiles = activeGroup === 'primary' ? primaryFiles : secondaryFiles;
    const currentActiveIndex = activeGroup === 'primary' ? primaryActiveIndex : secondaryActiveIndex;
    const setFiles = activeGroup === 'primary' ? setPrimaryFiles : setSecondaryFiles;
    const setActiveIndex = activeGroup === 'primary' ? setPrimaryActiveIndex : setSecondaryActiveIndex;

    const fileToClose = currentFiles[index];
    if (!fileToClose) return; // Should not happen, but for safety

    if (fileToClose.isDirty) {
      const proceed = await checkUnsavedChanges([fileToClose]);
      if (!proceed) return;
    }

    const newFiles = currentFiles.filter((_, i) => i !== index);
    setFiles(newFiles);

    // Adjust active index for the current group
    if (currentActiveIndex === index) {
      // If the active tab is closed, set active to the new last tab or -1 if no tabs left
      setActiveIndex(newFiles.length > 0 ? Math.min(index, newFiles.length - 1) : -1);
    } else if (currentActiveIndex > index) {
      // If a tab before the active tab is closed, shift active index left
      setActiveIndex(currentActiveIndex - 1);
    }
    // If a tab after the active tab is closed, active index remains the same
  };

  // Close Other Tabs
  // Internal close helpers
  const handleCloseOthersInternal = async (index: number, group: 'primary' | 'secondary') => {
    const files = group === 'primary' ? primaryFiles : secondaryFiles;
    const setFiles = group === 'primary' ? setPrimaryFiles : setSecondaryFiles;
    const setActiveIndex = group === 'primary' ? setPrimaryActiveIndex : setSecondaryActiveIndex;

    const filesToClose = files.filter((_, i) => i !== index);
    const proceed = await checkUnsavedChanges(filesToClose);
    if (!proceed) return;

    const targetFile = files[index];
    setFiles([targetFile]);
    setActiveIndex(0);
  };

  const handleCloseToRightInternal = async (index: number, group: 'primary' | 'secondary') => {
    const files = group === 'primary' ? primaryFiles : secondaryFiles;
    const setFiles = group === 'primary' ? setPrimaryFiles : setSecondaryFiles;
    const activeIndex = group === 'primary' ? primaryActiveIndex : secondaryActiveIndex;
    const setActiveIndex = group === 'primary' ? setPrimaryActiveIndex : setSecondaryActiveIndex;

    const filesToClose = files.slice(index + 1);
    const proceed = await checkUnsavedChanges(filesToClose);
    if (!proceed) return;

    const newFiles = files.slice(0, index + 1);
    setFiles(newFiles);

    if (activeIndex > index) {
      setActiveIndex(index);
    }
  };

  const handleCloseAllInternal = async (group: 'primary' | 'secondary') => {
    const files = group === 'primary' ? primaryFiles : secondaryFiles;
    const setFiles = group === 'primary' ? setPrimaryFiles : setSecondaryFiles;
    const setActiveIndex = group === 'primary' ? setPrimaryActiveIndex : setSecondaryActiveIndex;

    const proceed = await checkUnsavedChanges(files);
    if (!proceed) return;

    setFiles([]);
    setActiveIndex(-1);
  };

  // File Delete Tab Close Handler (force close)
  const handleFileDelete = (deletedPath: string) => {
    // Find deleted file or sub-files of folder
    const filesToKeep = openFiles.filter(f =>
      f.path !== deletedPath && !f.path.startsWith(deletedPath + '/')
    );

    if (filesToKeep.length !== openFiles.length) {
      // Files are being closed
      let newActiveIndex = activeFileIndex;

      // Path of currently active tab
      const currentActivePath = activeFileIndex >= 0 && activeFileIndex < openFiles.length
        ? openFiles[activeFileIndex].path
        : null;

      if (filesToKeep.length === 0) {
        newActiveIndex = -1;
      } else if (currentActivePath) {
        // Check if active tab survived
        const newIndex = filesToKeep.findIndex(f => f.path === currentActivePath);
        if (newIndex !== -1) {
          newActiveIndex = newIndex;
        } else {
          // Active tab deleted -> last tab or appropriate position
          newActiveIndex = Math.min(activeFileIndex, filesToKeep.length - 1);
        }
      } else {
        newActiveIndex = -1;
      }

      setOpenFiles(filesToKeep);
      setActiveFileIndex(newActiveIndex);
    }
  };

  const handleReorderTabsInternal = (fromIndex: number, toIndex: number, group: 'primary' | 'secondary') => {
    if (fromIndex === toIndex) return;

    const files = group === 'primary' ? primaryFiles : secondaryFiles;
    const setFiles = group === 'primary' ? setPrimaryFiles : setSecondaryFiles;
    const activeIndex = group === 'primary' ? primaryActiveIndex : secondaryActiveIndex;
    const setActiveIndex = group === 'primary' ? setPrimaryActiveIndex : setSecondaryActiveIndex;

    const updatedFiles = [...files];
    const [movedFile] = updatedFiles.splice(fromIndex, 1);
    updatedFiles.splice(toIndex, 0, movedFile);

    // Adjust activeFileIndex
    const currentActive = files[activeIndex];
    if (currentActive) {
      const newIndex = updatedFiles.findIndex(f => f.path === currentActive.path);
      setActiveIndex(newIndex);
    }
    setFiles(updatedFiles);
  };

  const handleMoveToOtherGroup = (group: 'primary' | 'secondary') => {
    const files = group === 'primary' ? primaryFiles : secondaryFiles;
    const setFiles = group === 'primary' ? setPrimaryFiles : setSecondaryFiles;
    const activeIndex = group === 'primary' ? primaryActiveIndex : secondaryActiveIndex;
    const setActiveIndex = group === 'primary' ? setPrimaryActiveIndex : setSecondaryActiveIndex;

    const targetFiles = group === 'primary' ? secondaryFiles : primaryFiles;
    const setTargetFiles = group === 'primary' ? setSecondaryFiles : setPrimaryFiles;
    const setTargetActiveIndex = group === 'primary' ? setSecondaryActiveIndex : setPrimaryActiveIndex;

    if (files.length === 0) return;

    const fileToMove = files[activeIndex];
    if (!fileToMove) return;

    // 1. Remove from source
    const newSourceFiles = files.filter((_, i) => i !== activeIndex);
    setFiles(newSourceFiles);

    // Adjust source active index
    if (activeIndex >= newSourceFiles.length) {
      setActiveIndex(Math.max(0, newSourceFiles.length - 1));
    }

    // 2. Add to target (append)
    // Avoid duplicates? The move implies it leaves source.
    // If it already exists in target (same path), we should probably just switch focus to it rather than adding duplicate.
    const existingIndex = targetFiles.findIndex(f => f.path === fileToMove.path);
    if (existingIndex !== -1) {
      setTargetActiveIndex(existingIndex);
    } else {
      const newTargetFiles = [...targetFiles, fileToMove];
      setTargetFiles(newTargetFiles);
      setTargetActiveIndex(newTargetFiles.length - 1);
    }

    // 3. Ensure split view is visible if moving from primary to secondary
    if (group === 'primary' && !isSplitView) {
      setIsSplitView(true);
      // Optional: set default ratio if not set?
      if (editorSplitRatio < 0.1 || editorSplitRatio > 0.9) setEditorSplitRatio(0.5);
    }
  };


  // Zoom Application Helper
  const BASE_ZOOM = 1.1; // Default 110% as new 100%
  const ZOOM_STEP = 0.1;
  const MIN_ZOOM = Number((BASE_ZOOM - (ZOOM_STEP * 4)).toFixed(1)); // 0.7
  const MAX_ZOOM = Number((BASE_ZOOM + (ZOOM_STEP * 4)).toFixed(1)); // 1.5

  const applyZoom = (newFactor: number) => {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(newFactor.toFixed(1))));
    if (window.electron?.zoom?.setZoomFactor) {
      window.electron.zoom.setZoomFactor(clamped);
      setZoomLevel(clamped);
    }
  };

  // Initial Zoom Setting
  useEffect(() => {
    applyZoom(BASE_ZOOM);
  }, []);

  // Shortcut Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const modifiers = [];
      if (e.ctrlKey) modifiers.push('Ctrl');
      if (e.altKey) modifiers.push('Alt');
      if (e.shiftKey) modifiers.push('Shift');
      if (e.metaKey) modifiers.push('Meta');

      let key = e.key;
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) return;

      if (key === ' ') key = 'Space';
      else if (key.length === 1) key = key.toUpperCase();

      const combo = [...modifiers, key].join('+');

      const binding = shortcuts.find(s => s.currentKey === combo);
      if (!binding) return;

      // Shortcut conflict exception handling when terminal is focused (e.g., Tmux Ctrl+B)
      const isTerminalFocused = document.activeElement?.className.includes('xterm-helper-textarea');
      if (isTerminalFocused) {
        // Sidebar toggle (Ctrl+B) is passed through to terminal
        if (binding.command === 'toggleSidebar') return;

        // Other conflicting keys can also be handled here if necessary
      }

      // Block Monaco events only for commands handled directly at app level
      const appLevelCommands = new Set([
        'toggleSidebar', 'toggleTerminal', 'toggleAIPanel',
        'saveFile', 'saveAllFiles', 'zoomIn', 'zoomOut', 'zoomReset', 'revealInExplorer',
        'prevTab', 'nextTab', 'terminalPrevTab', 'terminalNextTab', 'closeTab',
        'newFile', 'openFile', 'openFolder', 'markdownPreview'
      ]);

      if (appLevelCommands.has(binding.command)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
      // The rest (find, replace, commentLine, etc.) are handled by Monaco itself

      switch (binding.command) {
        case 'toggleSidebar':
          setIsSidePanelOpen(prev => !prev);
          break;
        case 'toggleTerminal':
          setIsTerminalOpen(prev => {
            if (!prev) {
              // Open → Focus terminal
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('terminal-focus'));
              }, 100);
            } else {
              // Close → Focus editor
              setTimeout(() => {
                const editor = document.querySelector('.monaco-editor textarea') as HTMLElement;
                if (editor) editor.focus();
              }, 50);
            }
            return !prev;
          });
          break;
        case 'toggleAIPanel': {
          const promptEl = document.querySelector('.ai-input-field') as HTMLTextAreaElement | null;
          const isPromptFocused = promptEl && document.activeElement === promptEl;

          if (!isAIPanelOpen) {
            // Step 1: Panel closed → Open
            setIsAIPanelOpen(true);
            aiPromptVisited.current = false;
          } else if (isAIPanelOpen && !isPromptFocused && !aiPromptVisited.current) {
            // Step 2: Panel open + prompt not visited → Focus
            if (promptEl) {
              promptEl.focus();
              aiPromptVisited.current = true;
            } else {
              setIsAIPanelOpen(false);
              aiPromptVisited.current = false;
            }
          } else if (isAIPanelOpen && isPromptFocused) {
            // Step 3: Prompt focused → Blur
            promptEl.blur();
          } else if (isAIPanelOpen && !isPromptFocused && aiPromptVisited.current) {
            // Step 4: After visiting prompt and blurred → Close
            setIsAIPanelOpen(false);
            aiPromptVisited.current = false;
          }
          break;
        }
        case 'saveFile':
          handleFileSave();
          break;
        case 'saveAllFiles': {
          (async () => {
            for (let i = 0; i < openFiles.length; i++) {
              if (openFiles[i].isDirty) {
                await handleFileSave(i);
              }
            }
          })();
          break;
        }
        case 'newFile': {
          // Calculate Untitled file number
          const untitledNums = openFiles
            .map(f => f.path.match(/^Untitled-(\d+)$/)?.[1])
            .filter(Boolean)
            .map(Number);
          const nextNum = untitledNums.length > 0 ? Math.max(...untitledNums) + 1 : 1;
          const untitledFile: OpenFile = {
            path: `Untitled-${nextNum}`,
            content: '',
            isDirty: false
          };
          setOpenFiles([...openFiles, untitledFile]);
          setActiveFileIndex(openFiles.length);
          break;
        }
        case 'openFile': {
          (async () => {
            try {
              // Use OS file manager
              const result = await window.electron.dialog.openFile();
              const filePath = result.success && result.path ? result.path : null;

              // [GLOT_FILEBROWSER] Existing Glot-specific file browser code (commented out)
              // const filePath = await showFileBrowser('selectFile');

              if (!filePath) return;
              // If already open, activate
              const existingIdx = openFiles.findIndex(f => f.path === filePath);
              if (existingIdx !== -1) {
                setActiveFileIndex(existingIdx);
                return;
              }
              const readResult = await window.electron.fs.readFile(filePath);
              if (readResult.success && readResult.content !== undefined) {
                const newFile: OpenFile = {
                  path: filePath,
                  content: readResult.content,
                  isDirty: false
                };
                setOpenFiles(prev => [...prev, newFile]);
                setActiveFileIndex(openFiles.length);
              }
            } catch (err) {
              console.error('Open file failed:', err);
            }
          })();
          break;
        }
        case 'openFolder':
          handleOpenFolder();
          break;
        case 'markdownPreview':
          window.dispatchEvent(new CustomEvent('markdown-preview-toggle'));
          break;
        case 'zoomIn':
          applyZoom(zoomLevel + ZOOM_STEP);
          break;
        case 'zoomOut':
          applyZoom(zoomLevel - ZOOM_STEP);
          break;
        case 'zoomReset':
          applyZoom(BASE_ZOOM);
          break;
        case 'revealInExplorer': {
          // Unfocus editor
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          setIsSidePanelOpen(true);
          setSidebarView('explorer');
          if (activeFileIndex >= 0 && openFiles[activeFileIndex]) {
            setRevealFilePath(openFiles[activeFileIndex].path);
          }
          break;
        }
        case 'prevTab':
          if (openFiles.length > 1) {
            setActiveFileIndex(prev => prev > 0 ? prev - 1 : openFiles.length - 1);
          }
          break;
        case 'nextTab':
          if (openFiles.length > 1) {
            setActiveFileIndex(prev => prev < openFiles.length - 1 ? prev + 1 : 0);
          }
          break;
        case 'terminalPrevTab':
          window.dispatchEvent(new CustomEvent('terminal-switch-tab', { detail: { direction: 'prev' } }));
          break;
        case 'terminalNextTab':
          window.dispatchEvent(new CustomEvent('terminal-switch-tab', { detail: { direction: 'next' } }));
          break;
        case 'closeTab':
          if (activeFileIndex >= 0 && openFiles[activeFileIndex]) {
            const file = openFiles[activeFileIndex];
            if (!file.isDirty) {
              const newFiles = openFiles.filter((_, i) => i !== activeFileIndex);
              setOpenFiles(newFiles);
              setActiveFileIndex(newFiles.length > 0 ? Math.min(activeFileIndex, newFiles.length - 1) : -1);
            } else {
              handleCloseTab(activeFileIndex);
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [shortcuts, handleFileSave, zoomLevel, activeFileIndex, openFiles, isAIPanelOpen]);

  // Ctrl+W Close Tab (sent as custom event from main process)
  useEffect(() => {
    const handleCloseActiveTab = () => {
      // If terminal is focused, close terminal tab
      const terminalContainer = document.querySelector('.terminal-container');
      if (terminalContainer && terminalContainer.contains(document.activeElement)) {
        window.dispatchEvent(new CustomEvent('terminal-close-tab'));
        return;
      }
      // Close editor tab
      if (activeFileIndex >= 0 && openFiles[activeFileIndex]) {
        const file = openFiles[activeFileIndex];
        if (!file.isDirty) {
          const newFiles = openFiles.filter((_, i) => i !== activeFileIndex);
          setOpenFiles(newFiles);
          setActiveFileIndex(newFiles.length > 0 ? Math.min(activeFileIndex, newFiles.length - 1) : -1);
        } else {
          handleCloseTab(activeFileIndex);
        }
      }
    };
    window.addEventListener('close-active-tab', handleCloseActiveTab);
    return () => window.removeEventListener('close-active-tab', handleCloseActiveTab);
  }, [activeFileIndex, openFiles]);
  // Toggle Terminal Maximize
  const handleToggleTerminalMaximize = () => {
    if (isTerminalMaximized) {
      // Restore
      setIsTerminalMaximized(false);
      setTerminalHeight(prevTerminalHeightRef.current);
    } else {
      // Maximize
      prevTerminalHeightRef.current = terminalHeight;
      setIsTerminalMaximized(true);
      const maxHeight = window.innerHeight - 57; // Header(35) + Footer(22)
      setTerminalHeight(maxHeight);
    }
  };

  // Detect File Language
  const getFileLanguage = (filePath: string): string => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const langMap: { [key: string]: string } = {
      js: 'JavaScript',
      jsx: 'JavaScript React',
      ts: 'TypeScript',
      tsx: 'TypeScript React',
      py: 'Python',
      rs: 'Rust',
      go: 'Go',
      java: 'Java',
      cpp: 'C++',
      c: 'C',
      h: 'C/C++ Header',
      html: 'HTML',
      css: 'CSS',
      json: 'JSON',
      md: 'Markdown',
      sh: 'Shell Script',
      bash: 'Bash',
    };
    return langMap[ext || ''] || 'Plain Text';
  };

  // Recent Projects List
  const [recentProjects, setRecentProjects] = useState<string[]>([]);

  // Initial Setup and Load Recent Projects
  useEffect(() => {
    const loadSettings = async () => {
      if (window.electron && window.electron.store) {
        // ... Integrate existing settings load logic here ...

        // Load Recent Projects
        const recentsResult = await window.electron.store.get('recents');
        if (recentsResult.success && Array.isArray(recentsResult.value)) {
          setRecentProjects(recentsResult.value);
        }
      }
    };
    loadSettings();
  }, []);

  // Helper to add to recents
  const addToRecents = async (path: string) => {
    const newRecents = [path, ...recentProjects.filter(p => p !== path)].slice(0, 10);
    setRecentProjects(newRecents);
    if (window.electron && window.electron.store) {
      await window.electron.store.set('recents', newRecents);
    }
  };

  // Get Current Git Branch
  const fetchBranch = async () => {
    if (!workspaceDir) {
      setCurrentBranch('');
      return;
    }
    try {
      const result = await window.electron.git.status(workspaceDir);
      if (result.success && result.status?.current) {
        setCurrentBranch(result.status.current);
      } else {
        setCurrentBranch('');
      }
    } catch {
      setCurrentBranch('');
    }
  };

  useEffect(() => {
    fetchBranch();
  }, [workspaceDir]);

  // ... (shortcuts useEffect 등 다른 코드 유지)

  // Open Folder Handler
  const handleOpenFolder = async () => {
    try {
      // Remote workspace maintains existing InAppFileBrowser
      if (isRemoteWorkspace) {
        // [GLOT_FILEBROWSER] Remote File Browser (SFTP)
        const remoteInitialPath = workspaceDir || (remoteUser ? `/home/${remoteUser}` : '/');
        const selectedPath = await showFileBrowser('selectFolder', true, remoteInitialPath);
        if (selectedPath) {
          setWorkspaceDir(selectedPath);
          setIsSidePanelOpen(true);
        }
      } else {
        // Local: Use OS file manager
        const result = await window.electron.dialog.openDirectory();
        if (result.success && result.path) {
          setWorkspaceDir(result.path);
          setIsSidePanelOpen(true);
          addToRecents(result.path);
        }

        // [GLOT_FILEBROWSER] Existing Glot-specific file browser code (commented out)
        // const selectedPath = await showFileBrowser('selectFolder', false, undefined);
        // if (selectedPath) {
        //   setWorkspaceDir(selectedPath);
        //   setIsSidePanelOpen(true);
        //   addToRecents(selectedPath);
        // }
      }
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
    setFileMenuOpen(false);
  };

  // Open Recent Project Handler
  const handleOpenRecent = (path: string) => {
    setWorkspaceDir(path);
    setIsSidePanelOpen(true);
    addToRecents(path); // Update order (to top)
  };

  // Remove Recent Project Handler
  const handleRemoveRecent = async (path: string) => {
    // To prevent event propagation, handle in parent component or confirm handling here
    const newRecents = recentProjects.filter(p => p !== path);
    setRecentProjects(newRecents);
    if (window.electron && window.electron.store) {
      await window.electron.store.set('recents', newRecents);
    }
  };

  // Split Toggle Handler
  const handleToggleSplit = () => {
    setIsSplitView(prev => {
      const newState = !prev;
      if (newState) {
        // Splitting: Ensure secondary has content (duplicate current file)
        if (secondaryFiles.length === 0 && primaryFiles.length > 0) {
          const currentFile = primaryFiles[primaryActiveIndex];
          if (currentFile) {
            setSecondaryFiles([currentFile]);
            setSecondaryActiveIndex(0);
          }
        }
        setActiveGroup('secondary');
        // If split ratio is extreme, reset it
        if (editorSplitRatio < 0.1 || editorSplitRatio > 0.9) {
          setEditorSplitRatio(0.5);
        }
      } else {
        // Merging: Move files to primary
        const newPrimary = [...primaryFiles];
        secondaryFiles.forEach(f => {
          if (!newPrimary.find(pf => pf.path === f.path)) {
            newPrimary.push(f);
          }
        });
        setPrimaryFiles(newPrimary);
        setSecondaryFiles([]); // Clear secondary
        setActiveGroup('primary');
      }
      return newState;
    });
  };

  // Auto-close split view when either pane becomes empty
  useEffect(() => {
    if (!isSplitView) return;
    if (primaryFiles.length === 0 && secondaryFiles.length === 0) {
      // Both empty: just close split
      setIsSplitView(false);
      setActiveGroup('primary');
    } else if (secondaryFiles.length === 0) {
      // Secondary empty: close split, keep primary
      setIsSplitView(false);
      setActiveGroup('primary');
    } else if (primaryFiles.length === 0) {
      // Primary empty: move secondary files to primary, close split
      setPrimaryFiles(secondaryFiles);
      setPrimaryActiveIndex(secondaryActiveIndex);
      setSecondaryFiles([]);
      setSecondaryActiveIndex(0);
      setIsSplitView(false);
      setActiveGroup('primary');
    }
  }, [isSplitView, primaryFiles.length, secondaryFiles.length]);

  // File Open Handler
  const handleOpenFileDialog = async () => {
    if (!window.electron?.dialog?.openFile) {
      console.error('Electron dialog API not available');
      return;
    }

    try {
      const result = await window.electron.dialog.openFile();

      if (result.success && result.path) {
        // Open only selected file (do not set directory as workspace)
        await handleFileOpen(result.path);
      }
    } catch (error) {
      console.error('Failed to open file:', error);
    }
    setFileMenuOpen(false);
  };
  // SSH Connection Handler
  const handleSSHConnect = async (config: any) => {
    try {
      const result = await window.electron.ssh.connect(config);
      if (result.success) {
        // SFTP session auto start
        const sftpResult = await window.electron.sftp.start();
        if (sftpResult.success) {
          console.log('SFTP session started');
        }
        setIsSSHModalOpen(false);
        setRemoteUser(config.username);

        // Open remote folder selection browser
        const remotePath = await showFileBrowser('selectFolder', true, `/home/${config.username}`);
        if (remotePath) {
          setIsRemoteWorkspace(true);
          setWorkspaceDir(remotePath);
          setIsSidePanelOpen(true);
          setOpenFiles([]);
          setActiveFileIndex(-1);
        }

        // Open terminal (TerminalPanel automatically executes cd remoteCwd on mount)
        if (!isTerminalOpen) {
          setIsTerminalOpen(true);
        }
      } else {
        setAlertMessage(`SSH Connection failed: ${result.error}`);
      }
    } catch (err: any) {
      setAlertMessage(`Error: ${err.message}`);
    }
  };

  const doDisconnectSSH = async () => {
    setIsRemoteWorkspace(false);
    setWorkspaceDir(null);
    setOpenFiles([]);
    setActiveFileIndex(-1);
    setDiagnostics({ errors: 0, warnings: 0, markers: [] });
    setRemoteUser('');
    setIsTerminalOpen(false);
    window.dispatchEvent(new Event('terminal-close-all'));
    await window.electron.ssh.disconnect();
  };


  // Close Project Handler
  const handleCloseProject = async () => {
    // Check if there are unsaved files
    if (openFiles.some(f => f.isDirty)) {
      if (!await checkUnsavedChanges(openFiles)) return;
      doCloseProject();
    } else {
      // If nothing to save, confirm with modal
      setShowCloseProjectModal(true);
    }
  };

  // Execute actual project close
  const doCloseProject = () => {
    setWorkspaceDir(null);
    setOpenFiles([]);
    setActiveFileIndex(-1);
    setDiagnostics({ errors: 0, warnings: 0, markers: [] });
    setSidebarView('explorer');
    setShowCloseProjectModal(false);
  };

  // Run Project Logic
  const handleRunProject = () => {
    if (activeFileIndex < 0 || !openFiles[activeFileIndex]) {
      setAlertMessage("No file to run. Please open a file first.");
      return;
    }
    const currentFile = openFiles[activeFileIndex];
    const ext = currentFile.path.split('.').pop()?.toLowerCase();

    let command = '';
    if (ext === 'py') {
      // Python - Unbuffered output recommended
      command = `python3 -u "${currentFile.path}"`;
    } else if (ext === 'js') {
      command = `node "${currentFile.path}"`;
    } else if (ext === 'sh') {
      command = `bash "${currentFile.path}"`;
    } else {
      command = `python3 "${currentFile.path}"`; // Fallback
      // Let's just try running it or alert.
      // User asked specifically for "Selected python file".
      // If not py, maybe alert.
      if (ext !== 'py') {
        // But user might want to run others.
        // I'll leave it as is for now but warn.
        console.warn("Running non-python file with default behavior might fail if not executable.");
        return;
      }
    }

    if (!isTerminalOpen) setIsTerminalOpen(true);

    // Give time for terminal to mount/wake up
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('glot:run-command', {
        detail: { command, file: currentFile.path }
      }));
    }, 100);
  };

  // Debug Project Logic (Placeholder)
  const handleDebugProject = () => {
    // User asked if debug is project unit.
    // We can run python -m pdb for valid files.
    if (activeFileIndex < 0 || !openFiles[activeFileIndex]) return;
    const currentFile = openFiles[activeFileIndex];
    if (currentFile.path.endsWith('.py')) {
      if (!isTerminalOpen) setIsTerminalOpen(true);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('glot:run-command', {
          detail: { command: `python3 -m pdb "${currentFile.path}"`, file: currentFile.path }
        }));
      }, 100);
    } else {
      setAlertMessage("Debugging is currently only supported for Python (.py) files.");
    }
  };

  // Global Keyboard Shortcuts (F5)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // New Window: Ctrl+Shift+N
      if (e.ctrlKey && e.shiftKey && (e.key === 'N' || e.key === 'n')) {
        e.preventDefault();
        handleNewWindow();
        return;
      }

      if (e.key === 'F5') {
        e.preventDefault();

        if (!e.ctrlKey) {
          // F5: Run Without Debugging
          console.log('F5 Pressed: Run Without Debugging');
          const currentFile = openFiles[activeFileIndex];
          if (!currentFile || !currentFile.path) {
            console.warn('No active file');
            return;
          }

          // Auto-save before run
          if (currentFile.isDirty) {
            handleFileSave(activeFileIndex);
          }

          const ext = currentFile.path.split('.').pop()?.toLowerCase();
          let command = '';

          if (ext === 'py') {
            // Use selected python path or fallback to python3
            const pythonPath = 'python3';
            command = `"${pythonPath}" -u "${currentFile.path}"`;
          } else if (ext === 'js') {
            command = `node "${currentFile.path}"`;
          } else if (ext === 'ts') {
            command = `ts-node "${currentFile.path}"`;
          } else {
            setAlertMessage(`Running .${ext} files is not supported yet.`);
            return;
          }

          if (command) {
            if (!isTerminalOpen) {
              setIsTerminalOpen(true);
            }

            // Dispatch event for TerminalPanel to handle UI + Process
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('glot:run-command', {
                detail: { command, file: currentFile.path }
              }));
            }, isTerminalOpen ? 0 : 300); // Small delay if opening terminal for the first time
          }
        } else if (e.shiftKey) {
          // Shift+F5: Stop Debug
          window.dispatchEvent(new CustomEvent('glot:debug-stop'));
        } else {
          // Ctrl+F5: Start Debugging via Debug Panel
          const currentFile = activeGroup === 'primary'
            ? primaryFiles[primaryActiveIndex]
            : secondaryFiles[secondaryActiveIndex];
          if (currentFile && workspaceDir) {
            if (currentFile.isDirty) {
              handleFileSave(activeGroup === 'primary' ? primaryActiveIndex : secondaryActiveIndex);
            }
            window.dispatchEvent(new CustomEvent('glot:debug-run', {
              detail: { filePath: currentFile.path, cwd: workspaceDir }
            }));
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeFileIndex, openFiles, isTerminalOpen, workspaceDir]);

  return (
    <div className="app">
      <CommandPalette onFileSelect={handleFileOpen} workspaceDir={workspaceDir} />
      <GlobalTooltip />
      <UpdateBanner />
      {/* ... header ... */}
      <header className="app-header">
        <div className="header-left">
          <div className="app-title">
            <img src={glotLogo} alt="Glot" className="app-logo" />
          </div>
          <div className="app-menu">
            <div className="menu-dropdown">
              <span
                className={`menu-item ${fileMenuOpen ? 'active' : ''}`}
                onClick={() => {
                  setFileMenuOpen(!fileMenuOpen);
                  setEditMenuOpen(false);
                  setRunMenuOpen(false);
                  setHelpMenuOpen(false);
                  setViewMenuOpen(false);
                }}
              >
                File
              </span>
              {fileMenuOpen && (
                <div className="dropdown-content">
                  <div className="dropdown-item" onClick={handleNewFile}>
                    <span style={{ flex: 1 }}>New File</span>
                    <span style={{ fontSize: '10px', color: '#666', marginLeft: '10px' }}>Ctrl+N</span>
                  </div>
                  <div className="dropdown-item" onClick={handleNewWindow}>
                    <span style={{ flex: 1 }}>New Window</span>
                    <span style={{ fontSize: '10px', color: '#666', marginLeft: '10px' }}>Ctrl+Shift+N</span>
                  </div>
                  <div className="dropdown-divider"></div>
                  <div className="dropdown-item" onClick={() => {
                    setFileMenuOpen(false);
                    handleOpenFileDialog();
                  }}>
                    <span style={{ flex: 1 }}>Open File</span>
                    <span style={{ fontSize: '10px', color: '#666', marginLeft: '10px' }}>Ctrl+O</span>
                  </div>
                  <div className="dropdown-item" onClick={() => {
                    setFileMenuOpen(false);
                    handleOpenFolder();
                  }}>
                    <span style={{ flex: 1 }}>Open Folder</span>
                    <span style={{ fontSize: '10px', color: '#666', marginLeft: '10px' }}>Ctrl+Shift+O</span>
                  </div>
                  <div className="dropdown-divider"></div>
                  <div className={`dropdown-item ${openFiles.some(f => f.isDirty) ? '' : 'disabled'}`} onClick={() => {
                    setFileMenuOpen(false);
                    handleSaveAll();
                  }}>
                    <span style={{ flex: 1 }}>Save All</span>
                    <span style={{ fontSize: '10px', color: '#666', marginLeft: '10px' }}>Ctrl+Shift+S</span>
                  </div>
                </div>
              )}
            </div>
            <div className="menu-dropdown">
              <span
                className={`menu-item ${editMenuOpen ? 'active' : ''}`}
                onClick={() => {
                  setEditMenuOpen(!editMenuOpen);
                  setFileMenuOpen(false);
                  setRunMenuOpen(false);
                  setHelpMenuOpen(false);
                  setViewMenuOpen(false);
                }}
              >
                Edit
              </span>
              {editMenuOpen && (
                <div className="dropdown-content">
                  <div className="dropdown-item" onClick={() => {
                    setEditMenuOpen(false);
                    window.dispatchEvent(new Event('glot:undo'));
                  }}>
                    <RotateCcwIcon size={14} />
                    <span style={{ flex: 1 }}>Undo</span>
                    <span style={{ fontSize: '10px', color: '#666', marginLeft: '10px' }}>Ctrl+Z</span>
                  </div>
                  <div className="dropdown-item" onClick={() => {
                    setEditMenuOpen(false);
                    window.dispatchEvent(new Event('glot:redo'));
                  }}>
                    <RotateCwIcon size={14} />
                    <span style={{ flex: 1 }}>Redo</span>
                    <span style={{ fontSize: '10px', color: '#666', marginLeft: '10px' }}>Ctrl+Shift+Z</span>
                  </div>
                </div>
              )}
            </div>

            <div className="menu-dropdown">
              <span
                className={`menu-item ${viewMenuOpen ? 'active' : ''}`}
                onClick={() => {
                  setViewMenuOpen(!viewMenuOpen);
                  setFileMenuOpen(false);
                  setEditMenuOpen(false);
                  setRunMenuOpen(false);
                  setHelpMenuOpen(false);
                }}
              >
                View
              </span>
              {viewMenuOpen && (
                <div className="dropdown-content">
                  <div className="dropdown-item" onClick={() => {
                    setViewMenuOpen(false);
                    setSidebarView('search');
                    setIsSidePanelOpen(true);
                  }}>
                    <SearchIcon size={14} />
                    <span>Search</span>
                  </div>
                </div>
              )}
            </div>
            <div className="menu-dropdown">
              <span
                className={`menu-item ${runMenuOpen ? 'active' : ''}`}
                onClick={() => {
                  setRunMenuOpen(!runMenuOpen);
                  setFileMenuOpen(false);
                  setEditMenuOpen(false);
                  setHelpMenuOpen(false);
                  setViewMenuOpen(false);
                }}
              >
                Run
              </span>
              {runMenuOpen && (
                <div className="dropdown-content">
                  <div className="dropdown-item" onClick={() => {
                    setRunMenuOpen(false);
                    handleRunProject();
                  }}>
                    <PlayIcon size={14} />
                    <span style={{ flex: 1 }}>Run</span>
                    <span style={{ fontSize: '10px', color: '#666', marginLeft: '10px' }}>F5</span>
                  </div>
                  <div className="dropdown-item" onClick={() => {
                    setRunMenuOpen(false);
                    handleDebugProject();
                  }}>
                    <BugIcon size={14} />
                    <span style={{ flex: 1 }}>Debug</span>
                    <span style={{ fontSize: '10px', color: '#666', marginLeft: '10px' }}>Ctrl+F5</span>
                  </div>
                </div>
              )}
            </div>
            <span
              className={`menu-item ${isTerminalOpen ? 'active' : ''}`}
              onClick={() => setIsTerminalOpen((prev) => !prev)}
            >
              Terminal
            </span>
            <div className="menu-dropdown">
              <span
                className={`menu-item ${helpMenuOpen ? 'active' : ''}`}
                onClick={() => {
                  setHelpMenuOpen(!helpMenuOpen);
                  setFileMenuOpen(false);
                  setEditMenuOpen(false);
                  setRunMenuOpen(false);
                  setViewMenuOpen(false);
                }}
              >
                Help
              </span>
              {helpMenuOpen && (
                <div className="dropdown-content">
                  <div className="dropdown-item" onClick={() => {
                    setHelpMenuOpen(false);
                    setForceShowWelcome(true);
                  }}>
                    <HomeIcon size={14} />
                    <span>Welcome</span>
                  </div>
                  <div className="dropdown-item" onClick={() => {
                    setHelpMenuOpen(false);
                    setAlertMessage('You are using the latest version of Glot (v0.1.0).');
                  }}>
                    <UpdateIcon size={14} />
                    <span>Check for Updates</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="header-drag-region"></div>
        <div className="header-right">
          <div className="layout-controls" style={{ display: 'flex', gap: '4px', marginRight: '10px' }}>
            <button
              className={`layout-button ${isSidePanelOpen ? 'active' : ''}`}
              onClick={toggleSidebar}
            >
              <SidebarLeftIcon size={16} />
            </button>
            <button
              className={`layout-button ${isTerminalOpen ? 'active' : ''}`}
              onClick={() => setIsTerminalOpen(prev => !prev)}
            >
              <LayoutBottomIcon size={16} />
            </button>
            <button
              className={`layout-button ${isAIPanelOpen ? 'active' : ''}`}
              onClick={() => setIsAIPanelOpen(prev => !prev)}
            >
              <SidebarRightIcon size={16} />
            </button>
          </div>
          <button
            className="settings-button"
            onClick={() => setSettingsOpen(!settingsOpen)}

          >
            <SettingsIcon size={18} />
          </button>
          <div className="window-controls">
            <button
              className="window-button minimize"
              onClick={() => window.electron.window.minimize()}
            >
              <svg width="10" height="10" viewBox="0 0 10 10">
                <line x1="1" y1="9" x2="9" y2="9" stroke="currentColor" strokeWidth="1" />
              </svg>
            </button>
            <button
              className="window-button maximize"
              onClick={() => window.electron.window.maximize()}
            >
              {isWindowMaximized ? (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1">
                  <rect x="4" y="0.5" width="7" height="7" rx="0.5" />
                  <rect x="0.5" y="4" width="7" height="7" rx="0.5" fill="var(--bg-primary, #1a1a2e)" />
                </svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
                  <rect x="0.5" y="0.5" width="9" height="9" rx="0.5" />
                </svg>
              )}
            </button>
            <button
              className="window-button close"
              onClick={() => window.electron.window.close()}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2">
                <line x1="1" y1="1" x2="9" y2="9" />
                <line x1="9" y1="1" x2="1" y2="9" />
              </svg>
            </button>
          </div>
        </div>
      </header >

      {/* Clone Modal */}
      {showCloneModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--bg-tertiary)',
            padding: '24px', borderRadius: '12px',
            width: '420px', border: '1px solid var(--border-color)',
            boxShadow: '0 8px 32px var(--shadow)'
          }}>
            <h3 style={{
              marginTop: 0, marginBottom: '16px', color: 'var(--text-primary)',
              fontSize: '15px', fontWeight: 700, letterSpacing: '0.3px'
            }}>Clone Repository</h3>
            <input
              type="text"
              placeholder="https://github.com/user/repo.git"
              value={cloneUrl}
              onChange={(e) => setCloneUrl(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', marginBottom: '18px',
                background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                color: 'var(--text-primary)', borderRadius: '8px', fontSize: '13px',
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowCloneModal(false)}
                disabled={isCloning}
                style={{
                  padding: '8px 16px', background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)', color: 'var(--text-secondary)',
                  borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                  transition: 'all 0.2s'
                }}
              >
                Cancel
              </button>
              <button
                onClick={executeClone}
                disabled={isCloning}
                style={{
                  padding: '8px 16px', background: 'var(--accent-blue)',
                  border: 'none', color: '#ffffff', borderRadius: '8px',
                  cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                  opacity: isCloning ? 0.7 : 1, transition: 'all 0.2s',
                  boxShadow: '0 2px 8px var(--shadow)'
                }}
              >
                {isCloning ? 'Cloning...' : 'Clone'}
              </button>
            </div>
          </div>
        </div>
      )
      }

      {/* Main Content Area */}
      <div className="app-body">
        {/* Left Activity Bar */}
        <Sidebar
          activeView={sidebarView}
          onViewChange={setSidebarView}
          isSidePanelOpen={isSidePanelOpen}
          onToggleSidebar={toggleSidebar}
        />

        <div
          className="side-panel"
          style={{
            width: isSidePanelOpen ? `${sidePanelWidth}px` : '0px',
            minWidth: isSidePanelOpen ? '0px' : '0px',
            overflow: 'hidden',
            transition: 'width 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0
          }}
        >
          {sidebarView === 'explorer' && (
            workspaceDir ? (
              <FileExplorer
                workspaceDir={workspaceDir}
                isRemote={isRemoteWorkspace}
                onFileOpen={handleFileOpen}
                onCloseProject={handleCloseProject}
                refreshKey={refreshKey}
                onFileDelete={handleFileDelete}
                revealFilePath={revealFilePath}
                onRevealComplete={() => setRevealFilePath(null)}
              />
            ) : (
              <div className="panel-placeholder">
                <p>No folder opened.</p>
              </div>
            )
          )}
          {sidebarView === 'search' && (
            workspaceDir ? (
              <SearchPanel workspaceDir={workspaceDir} onFileOpen={handleFileOpen} />
            ) : (
              <div className="panel-placeholder">
                <SearchIcon size={48} />
                <p>Please open a folder.</p>
              </div>
            )
          )}
          {sidebarView === 'git' && (
            isRemoteWorkspace ? (
              <div className="panel-placeholder">
                <p>Source control is not available in remote workspaces.</p>
              </div>
            ) : workspaceDir ? (
              <GitPanel
                workspaceDir={workspaceDir}
                onFileClick={handleGitFileClick}
              />
            ) : (
              <div className="panel-placeholder">
                <p>Not a Git repository.</p>
              </div>
            )
          )}
          {sidebarView === 'debug' && (
            <DebugPanel
              workspaceDir={workspaceDir || undefined}
              currentFilePath={
                activeGroup === 'primary'
                  ? primaryFiles[primaryActiveIndex]?.path
                  : secondaryFiles[secondaryActiveIndex]?.path
              }
            />
          )}

        </div>

        {/* Resizer - always visible */}
        {isSidePanelOpen && (
          <Resizer
            direction="horizontal"
            onResize={(delta) => {
              setSidePanelWidth((prev) => {
                const newWidth = prev + delta;
                // Auto-collapse sidebar if width drops below 150px
                if (newWidth < 150) {
                  setIsSidePanelOpen(false);
                  return prev;
                }
                return Math.max(200, Math.min(600, newWidth));
              });
            }}
          />
        )}

        {/* Central Editor Area and Terminal (vertical layout) */}
        <div className="main-content-column" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Top View (WelcomeScreen or CodeEditor) */}
          <div style={{
            flex: 1,
            overflow: 'hidden',
            display: isTerminalMaximized ? 'none' : 'flex',
            flexDirection: 'column',
            minHeight: 0 // Allow shrinking
          }}>
            {(!workspaceDir && primaryFiles.length === 0 && secondaryFiles.length === 0 && !isSplitView) || forceShowWelcome ? (
              <WelcomeScreen
                onOpenProject={() => {
                  setForceShowWelcome(false);
                  handleOpenFolder();
                }}
                onCloneRepo={() => {
                  setForceShowWelcome(false);
                  handleCloneRepo();
                }}
                onConnectSSH={() => {
                  if (isRemoteWorkspace) {
                    setDisconnectConfirmOpen(true);
                  } else {
                    setForceShowWelcome(false);
                    setIsSSHModalOpen(true);
                  }
                }}
                isRemote={isRemoteWorkspace}
                remoteUser={remoteUser}
                recents={recentProjects}
                onOpenRecent={handleOpenRecent}
                onRemoveRecent={handleRemoveRecent}
              />
            ) : (
              <div style={{ flex: '1 1 0', display: 'flex', overflow: 'hidden', minHeight: 0 }}>
                {/* Primary Editor Pane */}
                <div style={{ flex: isSplitView ? `${editorSplitRatio} 1 0` : '1 1 0', display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
                  <EditorPane
                    files={primaryFiles}
                    activeIndex={primaryActiveIndex}
                    onFileSelect={setPrimaryActiveIndex}
                    onContentChange={handlePrimaryContentChange}
                    onCloseTab={(idx) => handleCloseTabInternal(idx, 'primary')}
                    onCloseOthers={(idx) => handleCloseOthersInternal(idx, 'primary')}
                    onCloseToRight={(idx) => handleCloseToRightInternal(idx, 'primary')}
                    onCloseAll={() => handleCloseAllInternal('primary')}
                    onSave={(idx) => handleFileSaveInternal(idx, 'primary')}
                    onReorderTabs={(from, to) => handleReorderTabsInternal(from, to, 'primary')}
                    onMoveToOtherGroup={() => handleMoveToOtherGroup('primary')}
                    moveDirection="right"
                    settings={editorSettings}
                    onDiagnosticsChange={(errors, warnings, markers) => setDiagnostics({ errors, warnings, markers })}
                    workspaceDir={workspaceDir || undefined}
                    isActive={activeGroup === 'primary'}
                    onFocus={() => setActiveGroup('primary')}
                    isSplitView={isSplitView}
                    onToggleSplit={handleToggleSplit}
                  />
                </div>

                {isSplitView && (
                  <>
                    <Resizer
                      direction="horizontal"
                      onResize={(delta) => {
                        // Calculate new ratio based on pixel delta
                        // Assuming container width is roughly window width - sidebars?
                        // Or use ref to get container width.
                        // For simplicity, let's just nudge percentages.
                        // Delta is in pixels.
                        setEditorSplitRatio(prev => {
                          const containerWidth = window.innerWidth - (isSidePanelOpen ? sidePanelWidth : 0) - (isAIPanelOpen ? aiPanelWidth : 0);
                          const ratioDelta = delta / containerWidth;
                          return Math.max(0.1, Math.min(0.9, prev + ratioDelta));
                        });
                      }}
                    />
                    {/* Secondary Editor Pane */}
                    <div style={{ flex: 1 - editorSplitRatio, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
                      <EditorPane
                        files={secondaryFiles}
                        activeIndex={secondaryActiveIndex}
                        onFileSelect={setSecondaryActiveIndex}
                        onContentChange={handleSecondaryContentChange}
                        onCloseTab={(idx) => handleCloseTabInternal(idx, 'secondary')}
                        onCloseOthers={(idx) => handleCloseOthersInternal(idx, 'secondary')}
                        onCloseToRight={(idx) => handleCloseToRightInternal(idx, 'secondary')}
                        onCloseAll={() => handleCloseAllInternal('secondary')}
                        onSave={(idx) => handleFileSaveInternal(idx, 'secondary')}
                        onReorderTabs={(from, to) => handleReorderTabsInternal(from, to, 'secondary')}
                        onMoveToOtherGroup={() => handleMoveToOtherGroup('secondary')}
                        moveDirection="left"
                        settings={editorSettings}
                        workspaceDir={workspaceDir || undefined}
                        isSplitView={isSplitView}
                        onToggleSplit={handleToggleSplit}
                        isActive={activeGroup === 'secondary'}
                        onFocus={() => setActiveGroup('secondary')}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Secondary pane handling if needed, but primary is key */}

          {/* Bottom Terminal - Global Area (Toggle with Ctrl+J) - Hide with display:none (session maintained) */}
          {/* Bottom Terminal - Global Area (Toggle with Ctrl+J) */}
          <div style={{
            display: isTerminalOpen ? 'flex' : 'none',
            flexDirection: 'column',
            height: isTerminalMaximized ? '100%' : `${terminalHeight}px`,
            flexShrink: 0, // Important: allows editor to shrink
            borderTop: isTerminalMaximized ? 'none' : '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-primary)',
            position: 'relative',
            zIndex: isTerminalMaximized ? 100 : 'auto',
          }}>
            {!isTerminalMaximized && (
              <Resizer
                direction="vertical"
                onResize={(delta) => {
                  setTerminalHeight((prev) => {
                    const newHeight = prev - delta;
                    if (newHeight < 80) {
                      setTimeout(() => {
                        setIsTerminalOpen(false);
                        setTerminalHeight(250);
                        window.dispatchEvent(new Event('glot-resize')); // Notify layout change
                      }, 0);
                      return 250;
                    }
                    window.dispatchEvent(new Event('glot-resize')); // Notify layout change
                    return Math.max(100, newHeight);
                  });
                }}
              />
            )}
            <div className="terminal-container" style={{ flex: 1, minHeight: 0 }}>
              <TerminalPanel
                onClose={() => {
                  setIsTerminalOpen(false);
                  setIsTerminalMaximized(false);
                  setTimeout(() => window.dispatchEvent(new Event('glot-resize')), 0);
                }}
                onMaximize={handleToggleTerminalMaximize}
                isMaximized={isTerminalMaximized}
                cwd={isRemoteWorkspace ? undefined : (workspaceDir || undefined)}
                isRemote={isRemoteWorkspace}
                remoteCwd={isRemoteWorkspace && workspaceDir ? workspaceDir : undefined}
                diagnostics={diagnostics}
              />
            </div>
          </div>

        </div>

        {/* Right AI Panel (Toggle with Ctrl+L) */}
        <div style={{ display: 'flex' }}>
          <div style={{
            width: isAIPanelOpen ? '4px' : '0px',
            overflow: 'hidden',
            transition: 'width 0.2s ease',
            opacity: isAIPanelOpen ? 1 : 0
          }}>
            <Resizer
              direction="horizontal"
              onResize={(delta) => {
                setAIPanelWidth((prev) => {
                  const newWidth = prev - delta;
                  if (newWidth < 250) {
                    setTimeout(() => setIsAIPanelOpen(false), 0);
                    return 300;
                  }
                  return Math.max(300, Math.min(800, newWidth));
                });
              }}
            />
          </div>

          <div
            className="ai-panel-container"
            style={{
              width: isAIPanelOpen ? `${aiPanelWidth}px` : '0px',
              minWidth: isAIPanelOpen ? '300px' : '0px'
            }}
          >
            <AIPanel
              onClose={() => setIsAIPanelOpen(false)}
              projectName={workspaceDir ? workspaceDir.split('/').pop() : undefined}
              workspacePath={workspaceDir || undefined}
              onFileSystemChange={handleForceRefresh}
              onCloseFile={handleFileDelete}
            />
          </div>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <footer className="app-footer">
        <div className="status-left">
          <div className="remote-button" onClick={() => isRemoteWorkspace ? setDisconnectConfirmOpen(true) : setIsSSHModalOpen(true)} data-tooltip={isRemoteWorkspace ? `Remote: ${remoteUser} (Click to disconnect)` : 'SSH Connection'} data-tooltip-pos="top">
            <ActivityIcon size={14} />
            {isRemoteWorkspace && <span style={{ marginLeft: '4px', fontSize: '11px' }}>Remote</span>}
          </div>



          {currentBranch && (
            <div className="status-item clickable">
              <GitIcon size={12} />
              <span>{currentBranch}</span>
            </div>
          )}

          <div
            className="status-item clickable"
            style={{ gap: '8px', marginLeft: '8px' }}
            data-tooltip="Errors & Warnings"
            data-tooltip-pos="top"
            onClick={() => {
              setIsTerminalOpen(true);
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('glot:open-problems'));
              }, 50);
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f07178' }}>
              <ErrorIcon size={14} />
              <span>{diagnostics.errors}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ffcb6b' }}>
              <WarningIcon size={14} />
              <span>{diagnostics.warnings}</span>
            </div>
          </div>
        </div>
        <div className="status-right">
          <div className="status-item zoom-container">
            {zoomMenuOpen && (
              <div className="zoom-menu" onMouseLeave={() => setZoomMenuOpen(false)}>
                <button
                  className="zoom-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    applyZoom(zoomLevel - 0.1);
                  }}
                  data-tooltip="Zoom Out"
                  data-tooltip-pos="top"
                >
                  <MinusIcon size={14} />
                </button>

                <span className="zoom-value-text" style={{ minWidth: '35px', textAlign: 'center' }}>
                  {(() => {
                    const step = Math.round((zoomLevel - BASE_ZOOM) / ZOOM_STEP);
                    return step > 0 ? `+${step}` : `${step}`;
                  })()}
                </span>

                <button
                  className="zoom-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    applyZoom(zoomLevel + 0.1);
                  }}
                  data-tooltip="Zoom In"
                  data-tooltip-pos="top"
                >
                  <PlusIcon size={14} />
                </button>

                <div className="zoom-divider"></div>

                <button
                  className="zoom-reset-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    applyZoom(1.0);
                  }}
                  data-tooltip="Reset Zoom"
                  data-tooltip-pos="top"
                >
                  Reset
                </button>
              </div>
            )}
            <div
              onClick={() => setZoomMenuOpen(!zoomMenuOpen)}
              data-tooltip="Screen Zoom"
              data-tooltip-pos="top"
              style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            >
              <ZoomInIcon size={14} />
            </div>
          </div>
          {activeFileIndex >= 0 && openFiles[activeFileIndex] && (
            <>
              <div className="status-item clickable">
                <span className="status-value">
                  {getFileLanguage(openFiles[activeFileIndex].path)}
                </span>
              </div>
              <div className="status-item clickable">
                <span className="status-value">UTF-8</span>
              </div>
              <div className="status-item clickable">
                <span className="status-value">LF</span>
              </div>
              <div className="status-item clickable">
                <span className="status-value">Spaces: 2</span>
              </div>
            </>
          )}




        </div>
      </footer>

      {
        settingsOpen && (
          <div className="modal-overlay" onClick={() => setSettingsOpen(false)}>
            <SettingsPanel
              onClose={() => {
                setSettingsOpen(false);
                loadShortcuts();
                loadEditorSettings();
              }}
              onApply={() => {
                loadShortcuts();
                loadEditorSettings();
              }}
              onOpenSettingsJson={async (filePath: string) => {
                // Read the settings.json file content
                const result = await window.electron.fs.readFile(filePath);
                if (result.success && result.content) {
                  // Add the file to openFiles
                  setOpenFiles((prev) => {
                    // Check if file is already open
                    const existingIndex = prev.findIndex((f) => f.path === filePath);
                    if (existingIndex >= 0) {
                      setActiveFileIndex(existingIndex);
                      return prev;
                    }
                    // Add new file
                    const newFiles: OpenFile[] = [...prev, { path: filePath, content: result.content as string, isDirty: false }];
                    setActiveFileIndex(newFiles.length - 1);
                    return newFiles;
                  });
                }
              }}
            />
          </div>
        )
      }



      {
        showUnsavedModal && (
          <UnsavedChangesModal
            files={unsavedFilesForModal}
            onAction={handleUnsavedModalAction}
          />
        )
      }

      {
        isSSHModalOpen && (
          <SSHConnectionModal
            onConnect={handleSSHConnect}
            onCancel={() => setIsSSHModalOpen(false)}
          />
        )
      }

      {/* Close project confirmation modal */}
      {showCloseProjectModal && (
        <div className="modal-overlay" onClick={() => setShowCloseProjectModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Close Project</h3>
            <p>Are you sure you want to close the project?</p>
            <div className="modal-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="modal-btn cancel" onClick={() => setShowCloseProjectModal(false)}>Cancel</button>
              <button className="modal-btn primary" onClick={doCloseProject}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Disconnect confirmation modal */}
      {disconnectConfirmOpen && (
        <div className="modal-overlay" onClick={() => setDisconnectConfirmOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 style={{ margin: '0 0 12px 0' }}>Disconnect SSH</h3>
            <p style={{ margin: '0 0 16px 0', lineHeight: '1.5', color: '#a6adc8' }}>
              Are you sure you want to disconnect {remoteUser}@{workspaceDir}?
            </p>
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="modal-btn cancel" onClick={() => setDisconnectConfirmOpen(false)}>Cancel</button>
              <button className="modal-btn primary" style={{ background: '#f38ba8' }} onClick={() => {
                setDisconnectConfirmOpen(false);
                setIsRemoteWorkspace(false);
                setWorkspaceDir(null);
                setOpenFiles([]);
                setActiveFileIndex(-1);
                setDiagnostics({ errors: 0, warnings: 0, markers: [] });
                setRemoteUser('');
                setIsTerminalOpen(false);
                window.dispatchEvent(new Event('terminal-close-all'));
                window.electron.ssh.disconnect();
              }}>Disconnect</button>
            </div>
          </div>
        </div>
      )}

      {/* In-app alert modal */}
      {alertMessage && (
        <div className="modal-overlay" onClick={() => setAlertMessage(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <p style={{ margin: '0 0 16px 0', lineHeight: '1.5' }}>{alertMessage}</p>
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="modal-btn primary" onClick={() => setAlertMessage(null)}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* 인앱 파일 브라우저 */}
      {fileBrowserOpen && (
        <InAppFileBrowser
          mode={fileBrowserMode}
          remote={fileBrowserRemote}
          initialPath={fileBrowserInitialPath}
          onSelect={handleFileBrowserSelect}
          onCancel={handleFileBrowserCancel}
        />
      )}
      {/* Login Modal removed */}


    </div >
  );
}

export default App;
