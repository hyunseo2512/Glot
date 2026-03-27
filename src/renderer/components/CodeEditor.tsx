import { useState, useEffect, useRef } from 'react';
import { OpenFile } from '../types/file';
import Editor, { DiffEditor, useMonaco, loader } from '@monaco-editor/react';
import '../styles/CodeEditor.css';
import { getIconForFile, ChevronLeftIcon, ChevronRightIcon, SplitIcon, SingleIcon } from './Icons';
import MarkdownPreview from './MarkdownPreview';
import { glotQuantumTheme } from '../themes/glotQuantum';
import { glotCarbonTheme } from '../themes/glotCarbon';
import { glotMarkdownTheme } from '../themes/glotMarkdown';
import { glotNeonTheme } from '../themes/glotNeon';
import { glotJavaTheme } from '../themes/glotJava';
import * as monacoEditor from 'monaco-editor';
import { emmetHTML, emmetCSS, emmetJSX } from 'emmet-monaco-es';

// Initialize Monaco Globally (Theme & Compiler Options)
// Use local node_modules/monaco-editor bundle (no CDN dependency)
loader.config({ monaco: monacoEditor });

loader.init().then((monaco) => {
  // Initialize Emmet for HTML, CSS, JSX
  emmetHTML(monaco);
  emmetCSS(monaco);
  emmetJSX(monaco);
  // Compiler Options
  const compilerOptions = {
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    useDefineForClassFields: true,
    lib: ['es2020', 'dom', 'dom.iterable'],
    module: monaco.languages.typescript.ModuleKind.ESNext,
    allowSyntheticDefaultImports: true,
    jsx: monaco.languages.typescript.JsxEmit.React,
    jsxFactory: 'React.createElement',
    jsxFragmentFactory: 'React.Fragment',
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    noEmit: true
  };

  monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions(compilerOptions);

  // Define Theme Globally
  // 1. Glot Quantum (Python/SF Style)
  monaco.editor.defineTheme('glot-quantum', glotQuantumTheme);

  // 2. Glot Carbon (C/C++ Style)
  monaco.editor.defineTheme('glot-carbon', glotCarbonTheme);

  // 3. Glot Markdown (Markdown Specific)
  monaco.editor.defineTheme('glot-markdown', glotMarkdownTheme);

  // 4. Glot Neon (JS/TS/React)
  monaco.editor.defineTheme('glot-neon', glotNeonTheme);

  // 5. Glot Java (Java Exclusive)
  monaco.editor.defineTheme('glot-java', glotJavaTheme);

  // 6. Glot Classic (VS Dark + Glot Background)
  monaco.editor.defineTheme('glot-classic', {
    base: 'vs-dark',
    inherit: true,
    rules: [], // Inherit standard VS Dark highlighting
    colors: glotQuantumTheme.colors // Use same Deep Space background
  });

  // ─── Custom Semantic Token Provider for JS/TS ───
  // Monaco's Monarch tokenizer treats `console`, `log` etc. as plain identifiers.
  // This provider scans code for known built-in globals and method calls,
  // emitting semantic tokens so the theme can color them distinctly.
  const BUILTIN_GLOBALS_RE = /\b(console|window|document|Math|JSON|Object|Array|Promise|Map|Set|Date|Error|RegExp|Number|String|Boolean|Symbol|parseInt|parseFloat|isNaN|isFinite|setTimeout|setInterval|clearTimeout|clearInterval|fetch|require|module|process|global|globalThis|Buffer|exports|navigator|location|history|localStorage|sessionStorage|performance|crypto|Intl|Proxy|Reflect|WeakMap|WeakSet|undefined|NaN|Infinity|alert|confirm|prompt|atob|btoa)\b/g;
  const METHOD_CALL_RE = /\.(\w+)\s*\(/g;

  const semanticLegend = {
    tokenTypes: ['variable', 'function', 'class'], // Added 'class'
    tokenModifiers: ['defaultLibrary']
  };

  const semanticProvider = {
    getLegend: () => semanticLegend,
    provideDocumentSemanticTokens: (model: any) => {
      const lines = model.getLinesContent();
      const data: number[] = [];
      let prevLine = 0;
      let prevChar = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Collect all tokens on this line, sorted by column
        const tokens: { col: number; len: number; type: number }[] = [];

        // 1. Built-in globals → type=0 (variable)
        BUILTIN_GLOBALS_RE.lastIndex = 0;
        let m;
        while ((m = BUILTIN_GLOBALS_RE.exec(line)) !== null) {
          tokens.push({ col: m.index, len: m[1].length, type: 0 });
        }

        // 2. Method calls (.log, .map, etc.) → type=1 (function)
        METHOD_CALL_RE.lastIndex = 0;
        while ((m = METHOD_CALL_RE.exec(line)) !== null) {
          tokens.push({ col: m.index + 1, len: m[1].length, type: 1 });
        }

        // Sort by column position
        tokens.sort((a, b) => a.col - b.col);

        // Emit delta-encoded tokens
        for (const t of tokens) {
          const deltaLine = i - prevLine;
          const deltaStart = deltaLine === 0 ? t.col - prevChar : t.col;
          data.push(deltaLine, deltaStart, t.len, t.type, 1); // mod=defaultLibrary
          prevLine = i;
          prevChar = t.col;
        }
      }

      return { data: new Uint32Array(data) };
    },
    releaseDocumentSemanticTokens: () => { }
  };



  // Re-write the provider to be simpler and reuse logic


  monaco.languages.registerDocumentSemanticTokensProvider('javascript', semanticProvider);
  monaco.languages.registerDocumentSemanticTokensProvider('typescript', semanticProvider);
  monaco.languages.registerDocumentSemanticTokensProvider('java', {
    getLegend: () => semanticLegend,
    provideDocumentSemanticTokens: (model: any) => {
      const lines = model.getLinesContent();
      const data: number[] = [];
      let prevLine = 0;
      let prevChar = 0;

      // Updated Regex to include optional @ prefix for easier checking
      const CLASS_RE = /@?\b[A-Z][a-zA-Z0-9_]*\b/g;
      const JAVA_METHOD_RE = /\b(\w+)\s*\(/g;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const tokens: { col: number; len: number; type: number }[] = [];

        // Simple comment detection
        const commentIdx = line.indexOf('//');
        const effectiveLine = commentIdx !== -1 ? line.substring(0, commentIdx) : line;

        if (line.trim().startsWith('*')) continue;

        // 1. Classes (PascalCase)
        CLASS_RE.lastIndex = 0;
        let m;
        while ((m = CLASS_RE.exec(effectiveLine)) !== null) {
          // If starts with @, it's an annotation. Skip it. (Theme handles it)
          if (m[0].startsWith('@')) continue;

          // Exclude all-caps constants usually
          if (m[0] === m[0].toUpperCase() && m[0].length > 1) continue;

          tokens.push({ col: m.index, len: m[0].length, type: 2 });
        }

        // 2. Methods -> type=1 (function)
        JAVA_METHOD_RE.lastIndex = 0;
        while ((m = JAVA_METHOD_RE.exec(effectiveLine)) !== null) {
          // Exclude Annotations (preceded by @) treated as methods
          if (m.index > 0 && effectiveLine[m.index - 1] === '@') continue;

          // Check if it's a keyword like 'if (', 'for ('
          const keywordCheck = ['if', 'for', 'while', 'switch', 'catch', 'synchronized'].includes(m[1]);
          if (!keywordCheck) {
            tokens.push({ col: m.index, len: m[1].length, type: 1 });
          }
        }

        tokens.sort((a, b) => a.col - b.col);

        // Deduplicate
        const uniqueTokens: typeof tokens = [];
        if (tokens.length > 0) {
          uniqueTokens.push(tokens[0]);
          for (let k = 1; k < tokens.length; k++) {
            const prev = uniqueTokens[uniqueTokens.length - 1];
            const curr = tokens[k];
            if (curr.col >= prev.col + prev.len) {
              uniqueTokens.push(curr);
            }
          }
        }

        for (const t of uniqueTokens) {
          const deltaLine = i - prevLine;
          const deltaStart = deltaLine === 0 ? t.col - prevChar : t.col;
          data.push(deltaLine, deltaStart, t.len, t.type, 0);
          prevLine = i;
          prevChar = t.col;
        }
      }
      return { data: new Uint32Array(data) };
    },
    releaseDocumentSemanticTokens: () => { }
  });
});


// OpenFile imported from ../types/file

// Prettier Imports (Dynamic import to avoid bundling issues if possible, but static for now)
import * as prettier from 'prettier/standalone';
import * as parserBabel from 'prettier/plugins/babel';
import * as parserEstree from 'prettier/plugins/estree';
import * as parserHtml from 'prettier/plugins/html';
import * as parserCss from 'prettier/plugins/postcss';
import * as parserTs from 'prettier/plugins/typescript';

interface CodeEditorProps {
  openFiles: OpenFile[];
  activeFileIndex: number;
  onFileSelect: (index: number) => void;
  onContentChange: (content: string) => void;
  onCloseTab: (index: number) => void;
  onCloseOthers?: (index: number) => void;
  onCloseToRight?: (index: number) => void;
  onCloseAll?: () => void;
  onSave: (index?: number) => void;
  onReorderTabs?: (fromIndex: number, toIndex: number) => void;
  settings?: any;
  workspaceDir?: string;
  onMoveToOtherGroup?: () => void;
  moveDirection?: 'left' | 'right';
  isSplitView?: boolean;
  onToggleSplit?: () => void;
  isActive?: boolean;
  extraBottomPadding?: number;
}

// 바이너리 파일 확장자 목록
const BINARY_EXTENSIONS = new Set([
  'pyc', 'pyd', 'pyo', 'class', 'jar', 'war', 'ear',
  'exe', 'dll', 'so', 'dylib', 'bin', 'dat', 'o', 'a',
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp', 'tiff', 'tif',
  'mp3', 'mp4', 'avi', 'mov', 'mkv', 'wav', 'flac', 'ogg', 'webm',
  'zip', 'gz', 'tar', 'bz2', 'xz', '7z', 'rar',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'sqlite', 'db', 'mdb',
  'wasm',
]);

const isBinaryFile = (filePath: string, content?: string): boolean => {
  // 1. 확장자 기반 체크
  const ext = filePath.split('.').pop()?.toLowerCase();
  if (ext && BINARY_EXTENSIONS.has(ext)) return true;
  // 2. 내용 기반 체크: null 바이트 또는 제어 문자 포함 여부 (첫 8KB)
  if (content) {
    const sample = content.slice(0, 8192);
    for (let i = 0; i < sample.length; i++) {
      const code = sample.charCodeAt(i);
      if (code === 0) return true; // null byte
      // 탭(9), 줄바꿈(10), 캐리지리턴(13) 제외한 제어 문자
      if (code < 8 || (code > 13 && code < 32 && code !== 27)) return true;
    }
  }
  return false;
};

/**
 * 코드 에디터 컴포넌트 (Monaco Editor) - 여러 파일 탭 지원
 */
function CodeEditor({
  openFiles,
  activeFileIndex,
  onFileSelect,
  onContentChange,
  onCloseTab,
  onCloseOthers,
  onCloseToRight,
  onCloseAll,
  onSave,
  onReorderTabs,
  settings,
  workspaceDir,
  onMoveToOtherGroup,
  moveDirection,
  isSplitView,
  onToggleSplit,
  isActive = true,
  extraBottomPadding = 0
}: CodeEditorProps) {
  const [language, setLanguage] = useState('javascript');
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [forceOpenBinary, setForceOpenBinary] = useState<Set<string>>(new Set());
  const [markdownPreview, setMarkdownPreview] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const activeFile = activeFileIndex >= 0 ? openFiles[activeFileIndex] : null;
  const isBinary = activeFile ? isBinaryFile(activeFile.path, activeFile.content) && !forceOpenBinary.has(activeFile.path) : false;
  const isMarkdown = language === 'markdown';
  const [debouncedContent, setDebouncedContent] = useState('');
  const monaco = useMonaco();

  // Markdown Preview Toggle via custom event
  useEffect(() => {
    const handleToggle = () => setMarkdownPreview(prev => !prev);
    window.addEventListener('markdown-preview-toggle', handleToggle);
    return () => window.removeEventListener('markdown-preview-toggle', handleToggle);
  }, []);

  // Debounce Markdown Content
  useEffect(() => {
    if (!isMarkdown || !activeFile) return;

    const handler = setTimeout(() => {
      setDebouncedContent(activeFile.content);
    }, 300); // 300ms delay

    return () => clearTimeout(handler);
  }, [activeFile?.content, isMarkdown]);


  // 파일 확장자로 언어 감지
  useEffect(() => {
    if (!activeFile) return;

    const ext = activeFile.path.split('.').pop()?.toLowerCase();
    const langMap: { [key: string]: string } = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      rs: 'rust',
      go: 'go',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      h: 'cpp',
      html: 'html',
      css: 'css',
      json: 'json',
      md: 'markdown',
      sh: 'shell',
      bash: 'shell',
    };

    setLanguage(langMap[ext || ''] || 'plaintext');
  }, [activeFile?.path]);


  const [editorInstance, setEditorInstance] = useState<any>(null);

  // Ctrl+S로 저장 (Format On Save 지원) + ESC로 에디터 포커스
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();

        // Format On Save
        if (settings?.formatOnSave && editorInstance) {
          try {
            // 트리거 포맷팅 액션
            await editorInstance.getAction('editor.action.formatDocument').run();
          } catch (err) {
            console.error('Format failed:', err);
          }
        }

        // 잠시 대기 후 저장 (포맷팅 반영 위해)
        setTimeout(() => {
          onSave();
        }, 50);
      }

      // ESC → 에디터 포커스
      if (e.key === 'Escape' && editorInstance) {
        editorInstance.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave, settings, editorInstance]);

  // Force update options whenever editor instance or settings or PADDING changes
  useEffect(() => {
    if (!editorInstance) return;

    // Force update options
    editorInstance.updateOptions({
      scrollBeyondLastLine: true,
      cursorSurroundingLines: 5,
      minimap: { enabled: settings?.minimap ?? false },
      lineNumbers: settings?.lineNumbers ? 'on' : 'off',
      wordWrap: settings?.wordWrap ? 'on' : 'off',
      padding: { top: 10, bottom: extraBottomPadding + 20 }
    });

    // Force layout update when padding changes
    editorInstance.layout();

    // Handle Layout Resizing (Custom Event from App.tsx) -> Fallback or specific trigger
    const handleLayoutResize = () => {
      editorInstance.layout();
    };
    window.addEventListener('glot-resize', handleLayoutResize);

    // Force layout update immediately
    setTimeout(() => {
      editorInstance.layout();
    }, 50);

    return () => {
      window.removeEventListener('glot-resize', handleLayoutResize);
    };
  }, [editorInstance, settings, extraBottomPadding]);

  // ResizeObserver for smooth layout updates
  useEffect(() => {
    if (!editorInstance || !editorContainerRef.current) return;

    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        if (editorInstance) {
          editorInstance.layout();
        }
      });
    });

    observer.observe(editorContainerRef.current);

    return () => observer.disconnect();
  }, [editorInstance]);





  // Undo/Redo Event Listeners (from App Menu)
  useEffect(() => {
    if (!editorInstance) return;

    const handleUndo = () => {
      editorInstance.trigger('source', 'undo', null);
      editorInstance.focus();
    };

    const handleRedo = () => {
      editorInstance.trigger('source', 'redo', null);
      editorInstance.focus();
    };

    window.addEventListener('glot:undo', handleUndo);
    window.addEventListener('glot:redo', handleRedo);

    return () => {
      window.removeEventListener('glot:undo', handleUndo);
      window.removeEventListener('glot:redo', handleRedo);
    };
  }, [editorInstance]);

  // Go To Line Event Listener
  useEffect(() => {
    if (!editorInstance) return;

    const handleGoToLine = (e: any) => {
      const lineNumber = parseInt(e.detail, 10);
      if (!isNaN(lineNumber)) {
        editorInstance.revealLineInCenter(lineNumber);
        editorInstance.setPosition({ lineNumber, column: 1 });
        editorInstance.focus();
      }
    };

    window.addEventListener('glot:goto-line', handleGoToLine);
    return () => window.removeEventListener('glot:goto-line', handleGoToLine);
  }, [editorInstance]);

  const tabsRef = useRef<HTMLDivElement>(null);

  // Scroll active tab into view
  useEffect(() => {
    if (tabsRef.current && activeFileIndex >= 0) {
      const tabElements = tabsRef.current.children;
      if (tabElements[activeFileIndex]) {
        tabElements[activeFileIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }
  }, [activeFileIndex, openFiles]);

  const handleTabNav = (direction: 'prev' | 'next') => {
    if (openFiles.length <= 1) return;

    let newIndex = activeFileIndex;
    if (direction === 'prev') {
      newIndex = activeFileIndex > 0 ? activeFileIndex - 1 : activeFileIndex;
    } else {
      newIndex = activeFileIndex < openFiles.length - 1 ? activeFileIndex + 1 : activeFileIndex;
    }

    if (newIndex !== activeFileIndex) {
      onFileSelect(newIndex);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    onContentChange(value || '');
  };

  const getFileName = (path: string) => {
    return path.split('/').pop() || path;
  };

  const handleTabClose = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    onCloseTab(index);
  };

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; index: number } | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, index });
  };

  return (
    <div
      className="code-editor"
      ref={editorContainerRef}
    >
      {/* 에디터 탭들 - 파일이 있을 때만 표시 */}
      {openFiles.length > 0 && (
        <div className="editor-tabs-wrapper" style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', minHeight: '35px' }}>
          <div className="editor-tabs" ref={tabsRef} style={{ flex: 1, borderBottom: 'none', scrollbarWidth: 'none' }}>
            {openFiles.map((file, index) => (
              <div
                key={file.path}
                className={`editor-tab ${index === activeFileIndex ? 'active' : ''} ${file.isDiff ? 'diff-tab' : ''} ${index === dragOverIndex ? 'drag-over' : ''}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('tabIndex', index.toString());
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverIndex !== index) {
                    setDragOverIndex(index);
                  }
                }}
                onDragLeave={() => { }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverIndex(null);
                  const fromIndex = parseInt(e.dataTransfer.getData('tabIndex'), 10);
                  if (!isNaN(fromIndex) && onReorderTabs) {
                    onReorderTabs(fromIndex, index);
                  }
                }}
                onClick={() => onFileSelect(index)}
                onContextMenu={(e) => handleContextMenu(e, index)}
              >
                <span className="tab-icon">{getIconForFile(file.path, 14)}</span>
                <span className="tab-name">
                  {getFileName(file.path)}
                  {file.isDiff && ' (Diff)'}
                  {file.isDirty && <span className="tab-dirty">●</span>}
                </span>
                <button
                  className="tab-close"
                  onClick={(e) => handleTabClose(e, index)}
                  title="Close"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Right Side Controls - Only visible on active pane */}
          {isActive && (
            <div className="tab-controls-right" style={{ display: 'flex', alignItems: 'center', height: '100%', borderLeft: '1px solid var(--border-color)' }}>
              {/* Split Toggle Button */}
              {onToggleSplit && (
                <button
                  onClick={onToggleSplit}
                  title={isSplitView ? 'Close Split View' : 'Split Editor Right'}
                  className="tab-control-button"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '0 8px',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {isSplitView ? <SingleIcon size={16} /> : <SplitIcon size={16} />}
                </button>
              )}

              {/* Tab Navigation Buttons */}
              <button
                className="tab-nav-btn"
                onClick={() => handleTabNav('prev')}
                title="Previous Tab"
                disabled={activeFileIndex <= 0}
                style={{ opacity: activeFileIndex <= 0 ? 0.3 : 1, cursor: activeFileIndex <= 0 ? 'default' : 'pointer' }}
              >
                <ChevronLeftIcon size={16} />
              </button>
              <button
                className="tab-nav-btn"
                onClick={() => handleTabNav('next')}
                title="Next Tab"
                disabled={activeFileIndex >= openFiles.length - 1}
                style={{ opacity: activeFileIndex >= openFiles.length - 1 ? 0.3 : 1, cursor: activeFileIndex >= openFiles.length - 1 ? 'default' : 'pointer' }}
              >
                <ChevronRightIcon size={16} />
              </button>
            </div>
          )}
        </div>
      )
      }

      {/* Tab Context Menu */}
      {
        contextMenu && (
          <div
            className="context-menu"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="context-menu-item"
              onClick={() => {
                onCloseTab(contextMenu.index);
                setContextMenu(null);
              }}
            >
              Close
            </div>
            <div
              className="context-menu-item"
              onClick={() => {
                onCloseOthers?.(contextMenu.index);
                setContextMenu(null);
              }}
            >
              Close Others
            </div>
            <div
              className="context-menu-item"
              onClick={() => {
                onCloseToRight?.(contextMenu.index);
                setContextMenu(null);
              }}
            >
              Close to the Right
            </div>
            <div
              className="context-menu-item"
              onClick={() => {
                onCloseAll?.();
                setContextMenu(null);
              }}
            >
              Close All
            </div>
            <div className="context-menu-separator"></div>
            <div
              className="context-menu-item"
              onClick={() => {
                onSave(contextMenu.index);
                setContextMenu(null);
              }}
            >
              Save
            </div>
          </div>
        )
      }

      {/* Monaco Editor or Diff Editor */}
      {
        activeFile ? (
          <div className="editor-container">
            {/* File Path Breadcrumb */}
            {workspaceDir && activeFile.path && (() => {
              const relativePath = activeFile.path.startsWith(workspaceDir)
                ? activeFile.path.slice(workspaceDir.length + 1)
                : activeFile.path;
              const segments = relativePath.split('/');
              const fileName = segments.pop() || '';
              const FileIcon = getIconForFile(fileName);

              return (
                <div className="file-breadcrumb">
                  {segments.length > 0 && (
                    <span>{segments.join(' > ')} &gt; </span>
                  )}
                  {FileIcon}
                  <span style={{ marginLeft: 4 }}>{fileName}</span>
                </div>
              );
            })()}
            {isBinary ? (
              <div className="binary-file-warning">
                <div className="binary-warning-card">
                  <div className="binary-warning-icon">
                    {getIconForFile(activeFile!.path, 48)}
                  </div>
                  <div className="binary-warning-ext" title={activeFile!.path}>
                    {(() => {
                      const name = activeFile!.path.split(/[/\\]/).pop() || '';
                      if (name.includes('.')) {
                        return '.' + name.split('.').pop()?.toUpperCase();
                      }
                      return name.toUpperCase() || 'BINARY';
                    })()}
                  </div>
                  <p className="binary-file-message">
                    This file is binary or uses an unsupported encoding.<br />
                    Opening it may display unreadable content.
                  </p>
                  <button
                    className="binary-open-anyway"
                    onClick={() => {
                      setForceOpenBinary(prev => new Set(prev).add(activeFile!.path));
                    }}
                  >
                    Open Anyway
                  </button>
                </div>
              </div>
            ) : activeFile.isDiff ? (
              <DiffEditor
                height="100%"
                language={language}
                original={activeFile.originalContent}
                modified={activeFile.modifiedContent}
                theme={
                  settings?.theme === 'modern-dark' ? 'vs-dark' :
                    settings?.theme === 'modern-white' ? 'vs' :
                      (language === 'markdown' ? 'glot-markdown' :
                        language === 'python' ? 'glot-quantum' :
                          (language === 'c' || language === 'cpp') ? 'glot-carbon' :
                            (language === 'javascript' || language === 'typescript') ? 'glot-neon' :
                              language === 'java' ? 'glot-java' :
                                'glot-classic')
                }
                options={{
                  renderSideBySide: true,
                  fontSize: settings?.fontSize ?? 14,
                  fontFamily: "'Fira Code', 'Consolas', monospace",
                  minimap: { enabled: settings?.minimap ?? false },
                  fixedOverflowWidgets: true,
                  scrollBeyondLastLine: false,
                  renderOverviewRuler: false,
                  overviewRulerBorder: false,
                  readOnly: true,
                  automaticLayout: true,
                  mouseWheelZoom: true
                }}
              />
            ) : (
              <>
                {/* Markdown Preview: Render if markdown, hidden if preview inactive */}
                {isMarkdown && (
                  <div style={{ display: markdownPreview ? 'flex' : 'none', flex: 1, minHeight: 0, flexDirection: 'column', height: '100%' }}>
                    <MarkdownPreview
                      content={debouncedContent}
                      fileName={activeFile.path.split('/').pop()}
                      workspaceDir={workspaceDir}
                    />
                  </div>
                )}

                {/* Editor: Always render to keep state/history, hide if preview active */}
                <div style={{ display: (isMarkdown && markdownPreview) ? 'none' : 'block', flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
                  <Editor
                    key={`editor-${settings?.fontSize}-${settings?.lineNumbers}`}
                    height="100%"
                    path={activeFile.path}
                    language={language}
                    onMount={(editor) => {
                      setEditorInstance(editor);
                      // Force-enable semantic highlighting + cursor auto-scroll
                      editor.updateOptions({
                        'semanticHighlighting.enabled': true,
                        cursorSurroundingLines: 5,
                        cursorSurroundingLinesStyle: 'all',
                        scrollBeyondLastLine: true
                      } as any);

                      // Explicit layout call to ensure correct dimensions
                      setTimeout(() => {
                        editor.layout();
                      }, 100);

                      if (monaco) {
                        editor.addCommand(
                          monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.UpArrow,
                          () => editor.trigger('source', 'editor.action.copyLinesUpAction', null)
                        );
                        editor.addCommand(
                          monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.DownArrow,
                          () => editor.trigger('source', 'editor.action.copyLinesDownAction', null)
                        );
                      }
                    }}
                    value={activeFile.content}
                    onChange={handleEditorChange}
                    theme={
                      settings?.theme === 'modern-dark' ? 'vs-dark' :
                        settings?.theme === 'modern-white' ? 'vs' :
                          (language === 'markdown' ? 'glot-markdown' :
                            language === 'python' ? 'glot-quantum' :
                              (language === 'c' || language === 'cpp') ? 'glot-carbon' :
                                (language === 'javascript' || language === 'typescript') ? 'glot-neon' :
                                  language === 'java' ? 'glot-java' :
                                    'glot-classic')
                    }
                    beforeMount={(monaco) => {
                      const configurePrettier = (lang: string, parser: string, plugins: any[]) => {
                        monaco.languages.registerDocumentFormattingEditProvider(lang, {
                          async provideDocumentFormattingEdits(model, _options, _token) {
                            const text = model.getValue();
                            try {
                              const formatted = await prettier.format(text, {
                                parser,
                                plugins,
                                singleQuote: true,
                                tabWidth: 2,
                              });
                              return [
                                {
                                  range: model.getFullModelRange(),
                                  text: formatted,
                                },
                              ];
                            } catch (err) {
                              console.error('Prettier format error:', err);
                              return [];
                            }
                          },
                        });
                      };

                      configurePrettier('javascript', 'babel', [parserBabel, parserEstree]);
                      configurePrettier('typescript', 'typescript', [parserTs, parserEstree]);
                      configurePrettier('html', 'html', [parserHtml]);
                      configurePrettier('css', 'css', [parserCss]);
                      configurePrettier('json', 'json', [parserBabel, parserEstree]);
                    }}
                    options={{
                      fontSize: settings?.fontSize ?? 14,
                      fontFamily: settings?.fontFamily ?? "'Fira Code', 'Consolas', monospace",
                      fontLigatures: settings?.fontLigatures ?? true,
                      minimap: { enabled: settings?.minimap ?? false },
                      lineNumbers: settings?.lineNumbers ? 'on' : 'off',
                      roundedSelection: true,
                      scrollBeyondLastLine: true,
                      automaticLayout: true,
                      tabSize: settings?.tabSize ?? 2,
                      insertSpaces: settings?.insertSpaces ?? true,
                      wordWrap: settings?.wordWrap ? 'on' : 'off',
                      mouseWheelZoom: true,
                      fixedOverflowWidgets: true,
                      cursorSurroundingLines: 5,
                      renderLineHighlight: 'none',
                      padding: { top: 10, bottom: 20 },
                      'semanticHighlighting.enabled': true,
                    }}
                  />
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="editor-empty-state">
            {/* Logo */}
            <div className="empty-logo">
              <span className="logo-text">Glot</span>
              <span className="logo-edition">Pro Edition</span>
            </div>

            {/* Shortcut */}
            <div className="empty-shortcuts" style={{ pointerEvents: 'none' }}>
              <div className="shortcut-item">
                <span className="shortcut-label">Code with Agent</span>
                <span className="shortcut-key">Ctrl + L</span>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
export default CodeEditor;
