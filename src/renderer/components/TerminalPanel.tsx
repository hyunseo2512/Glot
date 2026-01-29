import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { ClipboardAddon } from '@xterm/addon-clipboard';
import { TerminalIcon, PlusCircleIcon, XIcon, ChevronUpIcon, ChevronDownIcon, ErrorIcon, WarningIcon, BashIcon, ZshIcon, TmuxIcon, PowerShellIcon } from './Icons';
import '@xterm/xterm/css/xterm.css';
import '../styles/TerminalPanel.css';

interface TerminalPanelProps {
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
  cwd?: string;
  isRemote?: boolean;
  remoteCwd?: string;
  diagnostics?: { errors: number; warnings: number; markers?: any[] };
}

interface BaseTab {
  id: string;
  name: string;
  type: 'terminal' | 'problems';
}

interface TerminalTab extends BaseTab {
  type: 'terminal';
  shellType: string;
  term: Terminal;
  fitAddon: FitAddon;
  webglAddon?: WebglAddon;
  clipboardAddon: ClipboardAddon;
  ref: HTMLDivElement | null;
}

interface ProblemsTab extends BaseTab {
  type: 'problems';
}

type Tab = TerminalTab | ProblemsTab;



function TerminalPanel({ onClose, onMaximize, isMaximized, cwd, isRemote = false, remoteCwd, diagnostics = { errors: 0, warnings: 0, markers: [] } }: TerminalPanelProps) {
  const isRemoteRef = useRef(isRemote);
  isRemoteRef.current = isRemote;
  const remoteCwdRef = useRef(remoteCwd);
  remoteCwdRef.current = remoteCwd;
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'terminal' | 'problems'>('terminal');
  const [instanceDropdownOpen, setInstanceDropdownOpen] = useState(false);

  // Shell Dropdown State
  const [isShellDropdownOpen, setIsShellDropdownOpen] = useState(false);
  const [shellTypes, setShellTypes] = useState([
    { value: 'default', label: 'Default' },
    { value: 'bash', label: 'Bash' },
    { value: 'zsh', label: 'Zsh' },
    { value: 'tmux', label: 'Tmux' },
  ]);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch System Shell for "Default" label
  useEffect(() => {
    const fetchSystemShell = async () => {
      if (!window.electron?.terminal?.getSystemShell) return;
      try {
        const result = await window.electron.terminal.getSystemShell();
        if (result.success && result.shell) {
          // e.g. /bin/zsh -> Zsh
          const name = result.shell.replace(/\\.exe$/, '').split(/[\\\\/]/).pop();
          if (name) {
            const label = name.charAt(0).toUpperCase() + name.slice(1);
            setShellTypes(prev => {
              const defaultOption = { ...prev[0], label };
              const others = prev.slice(1).filter(s => s.label.toLowerCase() !== label.toLowerCase());
              return [defaultOption, ...others];
            });
          }
        }
      } catch (e) {
        console.error('Failed to get system shell:', e);
      }
    };
    fetchSystemShell();
  }, []);

  // Update existing 'Default' tabs to actual shell name when fetched
  useEffect(() => {
    const defaultLabel = shellTypes.find(s => s.value === 'default')?.label;
    if (defaultLabel && defaultLabel !== 'Default') {
      setTabs(prev => prev.map(tab => {
        if (tab.type === 'terminal' && tab.shellType === 'default' && tab.name === 'Default') {
          return { ...tab, name: defaultLabel };
        }
        return tab;
      }));
    }
  }, [shellTypes]);

  // Sidebar Resize Logic
  const [sidebarWidth, setSidebarWidth] = useState(200);
  const isResizingRef = useRef(false);

  const startResizing = useCallback(() => {
    isResizingRef.current = true;
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'ew-resize';
  }, []);

  const stopResizing = useCallback(() => {
    isResizingRef.current = false;
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'default';
    // Trigger fit after resize ends to ensure terminal fits new space
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 50);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizingRef.current && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      // Calculate new width: Container Right - Mouse X
      let newWidth = containerRect.right - e.clientX;

      // Constraints & Snap Logic
      if (newWidth < 120) {
        newWidth = 48; // Snap to Icon Mode
      } else if (newWidth < 150) {
        newWidth = 150; // Minimum expanded width
      } else if (newWidth > 400) {
        newWidth = 400; // Maximum size
      }

      setSidebarWidth(newWidth);
    }
  }, []);

  // Shell Dropdown Outside Click
  useEffect(() => {
    if (!isShellDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.shell-dropdown-trigger')) {
        setIsShellDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isShellDropdownOpen]);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    if (!instanceDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.instance-selector')) {
        setInstanceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [instanceDropdownOpen]);

  const tabsRef = useRef<Tab[]>(tabs);
  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  // 전역 터미널 이벤트 리스너 설정
  useEffect(() => {
    if (!window.electron?.terminal) return;

    const cleanup1 = window.electron.terminal.onData((terminalId: string, data: string) => {
      const tab = tabsRef.current.find(t => t.id === terminalId) as TerminalTab;
      if (tab && tab.type === 'terminal') {
        tab.term.write(data);
      }
    });

    const cleanup2 = window.electron.terminal.onExit((terminalId: string, code: number) => {
      console.log(`Terminal ${terminalId} exited with code ${code}`);

      // If it's the Run tab, don't close it automatically so user can see output
      if (terminalId === 'gluon-run-terminal') {
        const tab = tabsRef.current.find(t => t.id === terminalId) as TerminalTab;
        if (tab && tab.type === 'terminal') {
          tab.term.write(`\r\n\x1b[33mProcess exited with code ${code}\x1b[0m\r\n`);
        }
        return;
      }

      window.dispatchEvent(new CustomEvent('terminal-close-tab-internal', { detail: terminalId }));
    });

    return () => {
      cleanup1();
      cleanup2();
    };
  }, []); // Remove dependency on tabs to prevent re-subscription race

  // Internal listener for exit cleanup
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      handleCloseTab(e.detail);
    };
    window.addEventListener('terminal-close-tab-internal', handler as EventListener);
    return () => window.removeEventListener('terminal-close-tab-internal', handler as EventListener);
  }, [tabs]); // This one can depend on tabs/handleCloseTab, as it's for cleanup, not critical data stream

  // 외부에서 모든 터미널 닫기 (SSH 해제 시)
  useEffect(() => {
    const handleCloseAll = () => {
      tabs.forEach(tab => {
        if (tab.type === 'terminal') {
          (tab as TerminalTab).term.dispose();
          window.electron.terminal.kill(tab.id);
        }
      });
      setTabs([]);
      setActiveTabId(null);
    };
    window.addEventListener('terminal-close-all', handleCloseAll);
    return () => window.removeEventListener('terminal-close-all', handleCloseAll);
  }, [tabs]);

  // Fit helper
  const fitTerminal = () => {
    if (!activeTabId || !containerRef.current) return;
    const tab = tabs.find(t => t.id === activeTabId) as TerminalTab;
    if (!tab || tab.type !== 'terminal' || !tab.fitAddon) return;

    try {
      // Force layout calculation
      void containerRef.current.offsetHeight;

      tab.fitAddon.fit();

      // Double fit for safety in flex layouts
      setTimeout(() => {
        if (!tab.fitAddon) return;
        tab.fitAddon.fit();
        const { cols, rows } = tab.term;
        if (cols > 0 && rows > 0) {
          if (isRemoteRef.current) {
            window.electron.ssh.resize(tab.id, cols, rows);
          } else {
            window.electron.terminal.resize(tab.id, cols, rows);
          }
        }
      }, 0);

      const { cols, rows } = tab.term;
      if (cols > 0 && rows > 0) {
        if (isRemoteRef.current) {
          window.electron.ssh.resize(tab.id, cols, rows);
        } else {
          window.electron.terminal.resize(tab.id, cols, rows);
        }
      }
    } catch (e) {
      console.warn('Fit error:', e);
    }
  };

  // Resize Effect to trigger fitTerminal when sidebarWidth changes
  useEffect(() => {
    // Determine content area size change
    requestAnimationFrame(() => {
      fitTerminal();
    });
  }, [sidebarWidth]);

  const handleCloseTab = (tabId: string) => {
    setTabs(prev => {
      const filtered = prev.filter(t => t.id !== tabId);

      if (activeTabId === tabId && filtered.length > 0) {
        const nextTab = filtered[filtered.length - 1];
        setActiveTabId(nextTab.id);
        if (nextTab.type === 'terminal') {
          setTimeout(() => (nextTab as TerminalTab).term.focus(), 50);
        }
      } else if (filtered.length === 0) {
        setActiveTabId(null);
      }

      const tab = prev.find(t => t.id === tabId);
      if (tab && tab.type === 'terminal') {
        tab.term.dispose();
        if (!isRemoteRef.current) {
          window.electron.terminal.kill(tabId);
        } else {
          window.electron.ssh.closeShell(tabId);
        }
      }

      return filtered;
    });
  };

  // Handle external run commands and Problems tab
  useEffect(() => {
    const handleRunCommand = (e: CustomEvent<any>) => {
      const detail = e.detail;
      const command = typeof detail === 'string' ? detail : detail.command;
      const file = typeof detail === 'string' ? null : detail.file;

      console.log('gluon:run-command received:', { command, file, isRemote: isRemoteRef.current });

      if (!command) return;

      if (file && diagnostics.markers) {
        const fileHasErrors = diagnostics.markers.some(m => {
          if (m.severity !== 8) return false;
          return m.resource.path.includes(file) || file.includes(m.resource.path);
        });

        if (fileHasErrors) {
          setViewMode('problems');
          return;
        }
      }


      console.log('gluon:run-command received:', { command, file, isRemote: isRemoteRef.current });

      if (!command) return;

      if (file && diagnostics.markers) {
        // ... (existing diagnostic check logic - preserving it implicitly if not replacing whole block, 
        // but here we are replacing from line 263. So need to include it.)
        const fileDiagnostics = diagnostics.markers.filter(d =>
          d.resource.toString() === `file://${file}` &&
          d.severity === 1
        );

        if (fileDiagnostics.length > 0) {
          setViewMode('problems');
          // return; // User prefers to run even if errors? Previous code didn't block.
          // Actually previous code had:
          /*
           if (fileHasErrors) {
             setViewMode('problems');
             return;
           }
          */
          // Let's restore that behavior if it was there.
          // Viewing lines 267-277 in previous `view_file` (lines 268-278 in provided block):
          /*
           if (file && diagnostics.markers) {
               const fileHasErrors = ...
               if (fileHasErrors) { setViewMode('problems'); return; }
           }
          */
        }
      }

      // Need to restore the check logic properly since we are replacing the handler start.
      // Wait, let's just replace the body part concerning execution, to avoid messing up the top.
      // But `async` keyword needs to be added to the function definition.
      // The function definition is at line 258 `const handleRunCommand = ...`.
      // I can't easily change it to `async` without replacing the definition line.
      // Or I can execute an IIFE inside? 
      // `(async () => { ... })()`



      (async () => {
        // Single Run Instance Logic
        const RUN_TAB_ID = 'gluon-run-terminal';

        // 1. Clean up existing run instance if present
        const existingRunTab = tabs.find(t => t.id === RUN_TAB_ID);
        if (existingRunTab) {
          if (existingRunTab.type === 'terminal') {
            try {
              (existingRunTab as TerminalTab).term.dispose();
              if (isRemoteRef.current) {
                await window.electron.ssh.closeShell(RUN_TAB_ID);
              } else {
                await window.electron.terminal.kill(RUN_TAB_ID);
              }
            } catch (e) {
              console.error('Error closing existing run tab:', e);
            }
          }
          // Update state and ref immediately for cleanup
          const filtered = tabsRef.current.filter(t => t.id !== RUN_TAB_ID);
          tabsRef.current = filtered;
          setTabs(filtered);

          // Small delay to allow cleanup propagation
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // 2. Prepare Command
        const rootPath = isRemoteRef.current ? remoteCwdRef.current : cwd;
        const fullCommand = rootPath
          ? `cd "${rootPath}" && ${command}`
          : command;

        // 3. Create New Run Tab via unified handler
        await handleAddTab('default', RUN_TAB_ID, fullCommand, true);

      })();
    };



    const handleOpenProblems = () => {
      setViewMode('problems');
    };

    const handleSwitchTabEvent = (e: CustomEvent<{ direction: 'prev' | 'next' }>) => {
      const tTabs = tabs.filter(t => t.type === 'terminal') as TerminalTab[];
      if (tTabs.length <= 1) return;
      const currentIndex = tTabs.findIndex(t => t.id === activeTabId);
      let nextIndex: number;
      if (e.detail.direction === 'prev') {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : tTabs.length - 1;
      } else {
        nextIndex = currentIndex < tTabs.length - 1 ? currentIndex + 1 : 0;
      }
      setActiveTabId(tTabs[nextIndex].id);
    };

    const handleCloseTabEvent = () => {
      if (activeTabId) {
        handleCloseTab(activeTabId);
      }
    };

    const handleFocusEvent = () => {
      if (activeTabId) {
        const tab = tabs.find(t => t.id === activeTabId);
        if (tab && tab.type === 'terminal') {
          (tab as TerminalTab).term.focus();
        }
      }
    };

    window.addEventListener('gluon:run-command', handleRunCommand as EventListener);
    window.addEventListener('gluon:open-problems', handleOpenProblems as EventListener);
    window.addEventListener('terminal-switch-tab', handleSwitchTabEvent as EventListener);
    window.addEventListener('terminal-close-tab', handleCloseTabEvent);
    window.addEventListener('terminal-focus', handleFocusEvent);

    return () => {
      window.removeEventListener('gluon:run-command', handleRunCommand as EventListener);
      window.removeEventListener('gluon:open-problems', handleOpenProblems as EventListener);
      window.removeEventListener('terminal-switch-tab', handleSwitchTabEvent as EventListener);
      window.removeEventListener('terminal-close-tab', handleCloseTabEvent);
      window.removeEventListener('terminal-focus', handleFocusEvent);
    };
  }, [activeTabId, tabs, diagnostics]);

  // ResizeObserver for Auto Fit
  useEffect(() => {
    if (!containerRef.current) return;

    // Debounce to prevent PTY flood
    let timeout: any;
    const observer = new ResizeObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        fitTerminal();
      }, 30);
    });

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [activeTabId, tabs]);

  // Maximize 시 강제 리사이즈
  useEffect(() => {
    if (activeTabId) {
      fitTerminal();
      const t1 = setTimeout(fitTerminal, 50);
      const t2 = setTimeout(fitTerminal, 200);
      const t3 = setTimeout(fitTerminal, 500);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [isMaximized, activeTabId]);

  // Mode Switch Cleanup (Local -> Remote)
  const prevIsRemote = useRef(isRemote);
  useEffect(() => {
    // If switching from Local to Remote
    if (!prevIsRemote.current && isRemote) {
      console.log('Switching to Remote Mode: Clearing local terminals');
      // Force close all existing local terminals
      tabs.forEach(tab => {
        if (tab.type === 'terminal') {
          try {
            (tab as TerminalTab).term.dispose();
            // We know these are local because prevIsRemote was false
            window.electron.terminal.kill(tab.id);
          } catch (e) {
            console.error('Error closing local terminal during switch:', e);
          }
        }
      });
      setTabs([]); // This will trigger the empty-tabs effect to create a new remote tab
      setActiveTabId(null);
    }
    prevIsRemote.current = isRemote;
  }, [isRemote, tabs]);

  // Project Root Change Cleanup
  const prevCwd = useRef(cwd);
  const prevRemoteCwd = useRef(remoteCwd);

  useEffect(() => {
    const cwdChanged = cwd !== prevCwd.current;
    const remoteCwdChanged = isRemote && remoteCwd !== prevRemoteCwd.current;

    if (cwdChanged || remoteCwdChanged) {
      console.log('Project Root Changed: Clearing terminals');
      tabs.forEach(tab => {
        if (tab.type === 'terminal') {
          try {
            (tab as TerminalTab).term.dispose();
            if (!isRemote) {
              window.electron.terminal.kill(tab.id);
            } else {
              window.electron.ssh.closeShell(tab.id);
            }
          } catch (e) {
            console.error('Error closing terminal on root change:', e);
          }
        }
      });
      setTabs([]); // This triggers empty-tabs effect -> new terminal in new CWD
      setActiveTabId(null);
    }
    prevCwd.current = cwd;
    prevRemoteCwd.current = remoteCwd;
  }, [cwd, remoteCwd, isRemote, tabs]);

  // 새 터미널 탭 추가
  const handleAddTab = async (shellType: string = 'default', customId?: string, initialCommand?: string, isRunMode: boolean = false) => {
    // Remote mode check removed to allow multiple tabs

    const tabId = customId || `terminal-${Date.now()}`;
    const shellLabel = shellTypes.find(s => s.value === shellType)?.label || 'Default';

    // Set CWD for remote mode if not provided (e.g. from F5 run)
    let commandToRun = initialCommand;
    if (isRemoteRef.current && !commandToRun && remoteCwdRef.current) {
      commandToRun = `cd "${remoteCwdRef.current}" && clear`;
    }

    try {
      const term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        cursorStyle: 'bar',
        scrollback: 1000, // Default safe value, updated from settings
        allowProposedApi: true,
        allowTransparency: true,
        theme: {
          background: '#00000000',
          foreground: '#e0e0e0',
          cursor: '#29b6f6',
          cursorAccent: '#090b10',
          selectionBackground: 'rgba(41, 182, 246, 0.3)',
          black: '#090b10',
          red: '#f07178',
          green: '#c3e88d',
          yellow: '#ffcb6b',
          blue: '#82aaff',
          magenta: '#c792ea',
          cyan: '#89ddff',
          white: '#d0d0d0',
          brightBlack: '#546e7a',
          brightRed: '#f07178',
          brightGreen: '#c3e88d',
          brightYellow: '#ffcb6b',
          brightBlue: '#82aaff',
          brightMagenta: '#c792ea',
          brightCyan: '#89ddff',
          brightWhite: '#ffffff',
        },
      });

      // Load scrollback setting
      window.electron.settings.read().then(result => {
        if (result.success && result.data) {
          const settings = result.data as any;
          if (settings['terminal.integrated.scrollback']) {
            term.options.scrollback = settings['terminal.integrated.scrollback'];
          }
        }
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      const clipboardAddon = new ClipboardAddon();
      term.loadAddon(clipboardAddon);

      term.attachCustomKeyEventHandler((e) => {
        if (e.type === 'keydown' && e.key === 'Escape') {
          const editor = document.querySelector('.monaco-editor textarea') as HTMLElement;
          if (editor) editor.focus();
          return false;
        }
        return true;
      });

      let webglAddon: WebglAddon | undefined;
      try {
        webglAddon = new WebglAddon();
        webglAddon.onContextLoss(() => {
          webglAddon?.dispose();
        });
        term.loadAddon(webglAddon);
      } catch (e) {
        console.warn('WebGL Addon failed to load, falling back to canvas', e);
      }

      const newTab: TerminalTab = {
        id: tabId,
        name: customId ? `Run: ${customId.replace('run-', '').split('/').pop()}` : shellLabel,
        type: 'terminal',
        shellType,
        term,
        fitAddon,
        webglAddon,
        clipboardAddon,
        ref: null,
      };

      // Update State & Ref IMMEDIATELY to prevent race condition
      const nextTabs = [...tabsRef.current.filter(t => t.id !== tabId), newTab];
      tabsRef.current = nextTabs;
      setTabs(nextTabs);

      setActiveTabId(tabId);
      setViewMode('terminal');

      // Mount logic
      setTimeout(async () => {
        const terminalElement = document.getElementById(`terminal-content-${tabId}`);
        if (terminalElement && !term.element) {
          term.open(terminalElement);
          fitAddon.fit();
          term.focus();

          // Resize handler
          const handleResize = (size: { cols: number, rows: number }) => {
            if (isRemoteRef.current) {
              window.electron.ssh.resize(tabId, size.cols, size.rows);
            } else {
              window.electron.terminal.resize(tabId, size.cols, size.rows);
            }
          };
          term.onResize(handleResize);
          // Trigger initial resize sync
          handleResize({ cols: term.cols, rows: term.rows });


          // Start Backend Process
          if (isRunMode) {
            // Clean Run Mode
            // Determine execution label
            let execLabel = 'Executing';
            if (initialCommand?.includes('python')) execLabel = 'Executing Python';
            else if (initialCommand?.includes('node')) execLabel = 'Executing Node.js';
            else if (initialCommand?.includes('bash') || initialCommand?.endsWith('.sh')) execLabel = 'Executing Shell Script';

            if (isRemoteRef.current) {
              // SSH Exec Shell (Command passed directly)
              // NOTE: For SSH exec, we pass the command. initialCommand should be the FULL command.
              const runCmd = initialCommand || '';
              term.writeln(`\r\n\x1b[36m${execLabel}\x1b[0m\r\n`);

              const result = await window.electron.ssh.execShell(tabId, runCmd);
              if (!result.success) term.writeln(`Error: ${result.error}`);
            } else {
              // Local Run (Start with initial command)
              term.writeln(`\r\n\x1b[36m${execLabel}\x1b[0m\r\n`);

              const result = await window.electron.terminal.start(tabId, shellType, term.cols, term.rows, cwd, initialCommand);
              if (!result.success) term.writeln(`Error: ${result.error}`);
            }
          } else {
            // Interactive Mode
            if (isRemoteRef.current) {
              const result = await window.electron.ssh.startShell(tabId);
              if (!result.success) {
                console.error('Failed to start SSH shell:', result.error);
                term.writeln(`Failed to start SSH shell: ${result.error}`);
              }
            } else {
              const result = await window.electron.terminal.start(tabId, shellType, term.cols, term.rows, cwd);
              if (!result.success) {
                console.error('Failed to start terminal:', result.error);
                term.writeln(`Failed to start terminal: ${result.error}`);
              }
            }

            // Run initial command via write (if standard terminal)
            if (commandToRun) {
              setTimeout(() => {
                if (isRemoteRef.current) {
                  window.electron.ssh.write(tabId, commandToRun + '\r');
                } else {
                  window.electron.terminal.write(tabId, commandToRun + '\r');
                }
              }, 800);
            }
          }

          // Input Data Handler
          term.onData((data) => {
            if (isRemoteRef.current) {
              window.electron.ssh.write(tabId, data);
            } else {
              window.electron.terminal.write(tabId, data);
            }
          });
        }
      }, 100);

    } catch (error) {
      console.error('Failed to create terminal tab:', error);
    }
  };

  // Mount 시 탭이 하나도 없으면 기본 터미널 생성 (항상 1개 이상 유지)
  useEffect(() => {
    if (tabs.length === 0) {
      if (isRemoteRef.current && remoteCwdRef.current) {
        handleAddTab('default');
      } else {
        handleAddTab('default');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs.length]);



  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, show: boolean } | null>(null);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, show: true });
  };

  const handleCopy = () => {
    if (!activeTabId) return;
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab && tab.type === 'terminal') {
      const selection = tab.term.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
      }
    }
    setContextMenu(null);
  };

  const handlePaste = async () => {
    if (!activeTabId) return;
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab && tab.type === 'terminal') {
      try {
        const text = await navigator.clipboard.readText();
        tab.term.paste(text);
      } catch (err) {
        console.error('Failed to read clipboard:', err);
      }
    }
    setContextMenu(null);
  };

  const handleClear = () => {
    if (!activeTabId) return;
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab && tab.type === 'terminal') {
      tab.term.clear();
      window.electron.terminal.write(tab.id, '\x0c');
    }
    setContextMenu(null);
  };

  const terminalTabs = tabs.filter(t => t.type === 'terminal') as TerminalTab[];

  return (
    <div className={`terminal-panel ${isMaximized ? 'maximized' : ''}`} ref={containerRef}>
      {/* Header */}
      <div className="terminal-header">
        {/* 좌측: 고정 탭 */}
        <div className="terminal-fixed-tabs">
          <div
            className={`terminal-fixed-tab ${viewMode === 'terminal' ? 'active' : ''}`}
            onClick={() => { setViewMode('terminal'); if (activeTabId) setTimeout(fitTerminal, 0); }}
          >
            <span>TERMINAL</span>
          </div>
          <div
            className={`terminal-fixed-tab ${viewMode === 'problems' ? 'active' : ''}`}
            onClick={() => setViewMode('problems')}
          >
            <span>PROBLEMS</span>
            {(diagnostics.errors > 0 || diagnostics.warnings > 0) && (
              <span className="problems-badge">
                {diagnostics.errors + diagnostics.warnings}
              </span>
            )}
          </div>
        </div>

        {/* 우측: 액션 */}
        <div className="terminal-header-actions">
          {viewMode === 'terminal' && (
            <div style={{ position: 'relative' }} className="shell-dropdown-trigger">
              <button
                className="action-btn"
                onClick={() => setIsShellDropdownOpen(!isShellDropdownOpen)}
              >
                <PlusCircleIcon size={14} />
              </button>
              {isShellDropdownOpen && (
                <div className="shell-dropdown-menu">
                  {shellTypes.map(shell => (
                    <div
                      key={shell.value}
                      className="shell-dropdown-item"
                      onClick={() => {
                        handleAddTab(shell.value);
                        setIsShellDropdownOpen(false);
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {(() => {
                          const name = shell.label.toLowerCase();
                          if (name.includes('bash')) return <BashIcon size={13} />;
                          if (name.includes('zsh')) return <ZshIcon size={13} />;
                          if (name.includes('tmux')) return <TmuxIcon size={13} />;
                          if (name.includes('powershell') || name.includes('pwsh')) return <PowerShellIcon size={13} />;
                          return <TerminalIcon size={13} />;
                        })()}
                        {shell.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 공통 액션 */}
          {onMaximize && (
            <button className="action-btn" onClick={onMaximize}>
              {isMaximized ? <ChevronDownIcon size={14} /> : <ChevronUpIcon size={14} />}
            </button>
          )}
          {onClose && (
            <button className="action-btn close-btn" onClick={onClose}>
              <XIcon size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Content Body */}
      <div className="terminal-body" onContextMenu={handleContextMenu}>
        {/* Main Content Area */}
        <div className="terminal-content-area" style={{ flex: 1, height: '100%', overflow: 'hidden', position: 'relative' }}>
          {/* Terminal Instances */}
          {terminalTabs.map(tab => (
            <div
              key={tab.id}
              id={`terminal-content-${tab.id}`}
              className="terminal-instance"
              style={{
                display: viewMode === 'terminal' && tab.id === activeTabId ? 'block' : 'none',
                height: '100%',
                width: '100%'
              }}
            />
          ))}

          {/* Empty State */}
          {viewMode === 'terminal' && terminalTabs.length === 0 && (
            <div className="terminal-empty">
              <p>No open terminals</p>
              <button onClick={() => handleAddTab('default')}>Open New Terminal</button>
            </div>
          )}

          {/* Problems View */}
          {viewMode === 'problems' && (
            <div
              className="problems-view"
              style={{
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                padding: '16px',
                overflowY: 'auto',
                color: 'var(--text-primary)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <ErrorIcon size={16} color="#f07178" />
                <span style={{ fontWeight: 'bold' }}>{diagnostics.errors} Errors</span>
                <div style={{ width: '1px', height: '16px', background: 'var(--border-color)', margin: '0 8px' }} />
                <WarningIcon size={16} color="#ffcb6b" />
                <span style={{ fontWeight: 'bold' }}>{diagnostics.warnings} Warnings</span>
              </div>
              <div className="problems-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {diagnostics.markers && diagnostics.markers.length > 0 ? (
                  diagnostics.markers.map((marker, idx) => (
                    <div
                      key={idx}
                      className="problem-item"
                      style={{
                        background: 'var(--bg-secondary)',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        borderLeft: `3px solid ${marker.severity === 8 ? '#f07178' : '#ffcb6b'}`,
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '13px' }}>
                          {marker.resource?.path ? (marker.resource.path.split('/').pop() || marker.resource.path) : 'Unknown File'}
                        </span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                          Ln {marker.startLineNumber}, Col {marker.startColumn}
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                        {marker.message}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '4px' }}>
                    <p>No problems detected in open files.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar (Right) - Only visible in Terminal Mode */}
        {viewMode === 'terminal' && terminalTabs.length > 0 && (
          <div
            className={`terminal-sidebar ${sidebarWidth < 100 ? 'collapsed' : ''}`}
            style={{ width: sidebarWidth }}
          >
            <div
              className="sidebar-resizer"
              onMouseDown={startResizing}
            />
            <div className="sidebar-list">
              {terminalTabs.map(tab => (
                <div
                  key={tab.id}
                  className={`sidebar-item ${tab.id === activeTabId ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTabId(tab.id);
                    setTimeout(fitTerminal, 0);
                  }}
                  title={tab.name}
                >
                  <div className="sidebar-item-icon">
                    {(() => {
                      const name = tab.name.toLowerCase();
                      if (name.includes('bash')) return <BashIcon size={13} />;
                      if (name.includes('zsh')) return <ZshIcon size={13} />;
                      if (name.includes('tmux')) return <TmuxIcon size={13} />;
                      if (name.includes('powershell') || name.includes('pwsh')) return <PowerShellIcon size={13} />;
                      return <TerminalIcon size={13} />;
                    })()}
                  </div>
                  {sidebarWidth >= 100 && (
                    <>
                      <span className="sidebar-item-name">{tab.name}</span>
                      <div className="sidebar-item-actions">
                        {terminalTabs.length > 1 && (
                          <button
                            className="sidebar-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCloseTab(tab.id);
                            }}
                            title="Kill Terminal"
                          >
                            <XIcon size={12} />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && contextMenu.show && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className="context-menu-item" onClick={handleCopy}>Copy</div>
          <div className="context-menu-item" onClick={handlePaste}>Paste</div>
          <div className="context-menu-separator" />
          <div className="context-menu-item" onClick={handleClear}>Clear</div>
        </div>
      )}
    </div>
  );
}

export default TerminalPanel;
