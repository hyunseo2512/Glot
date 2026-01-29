import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'path';
import { pythonService } from './services/pythonService';
import { linterService } from './services/LinterService';

// 개발 환경 여부 확인
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// 프로덕션 빌드에서 모든 콘솔 출력 숨김
if (!isDev) {
  console.log = () => { };
  console.info = () => { };
  console.warn = () => { };
  console.error = () => { };
  // stdout/stderr 직접 쓰기도 억제
  process.stdout.write = () => true;
  process.stderr.write = () => true;
}

// [CRITICAL] Self-signed 인증서 에러 무시 (전역 설정)
// CLI 인자로 넘기는 것보다 여기서 설정하는 것이 가장 확실함.
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('allow-insecure-localhost', 'true');


// [CRITICAL] Prevent crash on EPIPE (broken pipe) in Linux environments
// This happens when the app is launched from a terminal that is subsequently closed,
// or when running as an AppImage where stdout/stderr might not be attached.
if (process.platform === 'linux') {
  const handlePipeError = (err: any) => {
    if (err.code === 'EPIPE' || err.code === 'ERR_STREAM_DESTROYED') {
      // Ignore broken pipe errors
      return;
    }
    // Re-throw other errors
    console.error('Unhandled stream error:', err);
  };

  if (process.stdout) process.stdout.on('error', handlePipeError);
  if (process.stderr) process.stderr.on('error', handlePipeError);
}

// [CRITICAL] 더 강력한 인증서 무시 처리
// 스위치만으로 안 될 경우를 대비해 이벤트 핸들러 추가
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  // On certificate error we disable default behaviour (stop loading the page)
  // and we then say "it is all fine - true" to the callback
  event.preventDefault();
  callback(true);
});

// 윈도우 관리를 위한 Set
const windows = new Set<BrowserWindow>();

/**
 * 메인 윈도우 생성
 */
function createWindow(): void {
  // 네이티브 메뉴바 제거 (File, Edit, View, Quit 등)
  Menu.setApplicationMenu(null);

  // 아이콘 경로 (개발/프로덕션 모드 대응)
  const iconPath = isDev
    ? path.join(__dirname, '../../public/icons/gluon-512.svg')
    : path.join(__dirname, '../public/icons/gluon-512.svg');

  // 저장된 윈도우 상태 복원
  const Store = require('electron-store');
  const windowStore = new Store({ name: 'window-state' });
  const savedBounds = windowStore.get('bounds', { width: 1400, height: 900 });
  const wasMaximized = windowStore.get('maximized', false);

  const win = new BrowserWindow({
    width: savedBounds.width,
    height: savedBounds.height,
    x: savedBounds.x,
    y: savedBounds.y,
    minWidth: 800,
    minHeight: 600,
    title: 'Gluon - AI IDE',
    icon: iconPath, // 앱 아이콘
    frame: false, // 네이티브 타이틀바 완전히 제거
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // [CRITICAL] Disable CORS for remote API
      allowRunningInsecureContent: true,
    },
    backgroundColor: '#1e1e1e',
    show: false, // 준비될 때까지 숨김
  });

  // 윈도우 관리 Set에 추가
  windows.add(win);

  // 윈도우 상태 저장 (디바운스)
  let saveTimeout: NodeJS.Timeout | null = null;
  const saveWindowState = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      if (!win.isMaximized() && !win.isMinimized()) {
        windowStore.set('bounds', win.getBounds());
      }
      windowStore.set('maximized', win.isMaximized());
    }, 300);
  };
  win.on('resize', saveWindowState);
  win.on('move', saveWindowState);
  win.on('maximize', () => {
    saveWindowState();
    win.webContents.send('window:maximized-changed', true);
  });
  win.on('unmaximize', () => {
    saveWindowState();
    win.webContents.send('window:maximized-changed', false);
  });

  // 윈도우가 준비되면 표시
  win.once('ready-to-show', () => {
    if (wasMaximized) win.maximize();
    win.show();
    // 개발자 도구 (선택적)
    // if (isDev) win.webContents.openDevTools();
  });

  // 개발 모드: Vite 개발 서버 로드
  // 프로덕션: 빌드된 파일 로드
  if (isDev) {
    win.loadURL('http://localhost:3001');
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Ctrl+W를 탭 닫기로 사용 — Electron 기본 동작 방지 후 renderer에 커스텀 이벤트 전송
  win.webContents.on('before-input-event', (event, input) => {
    if (input.control && !input.shift && !input.alt && input.key.toLowerCase() === 'w') {
      event.preventDefault();
      win.webContents.executeJavaScript(`window.dispatchEvent(new CustomEvent('close-active-tab'))`).catch(() => { });
    }
  });

  // 윈도우가 닫힐 때
  win.on('closed', () => {
    windows.delete(win);
  });
}

/**
 * IPC 핸들러 설정
 */
function setupIpcHandlers(): void {
  const fs = require('fs').promises;
  const pathModule = require('path');

  const pty = require('node-pty');
  // 여러 터미널 프로세스를 관리하기 위한 Map
  const terminals = new Map<string, any>();

  // 파일 읽기
  ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return { success: true, content };
    } catch (error: any) {
      console.error('Failed to read file:', error);
      return { success: false, error: error.message };
    }
  });

  // 파일 쓰기
  ipcMain.handle('fs:writeFile', async (_event, filePath: string, content: string) => {
    try {
      await fs.writeFile(filePath, content, 'utf-8');
      return { success: true };
    } catch (error: any) {
      console.error('Failed to write file:', error);
      return { success: false, error: error.message };
    }
  });

  // SSH Handlers
  let SSHManager;
  try {
    const sshModule = require('./SSHManager');
    SSHManager = sshModule.SSHManager;
    console.log('SSHManager loaded successfully');
  } catch (e) {
    console.error('Failed to load SSHManager:', e);
  }

  const sshManager = SSHManager ? new SSHManager() : null;

  ipcMain.handle('ssh:connect', async (_event, config) => {
    if (!sshManager) return { success: false, error: 'SSHManager not loaded' };
    try {
      // privateKeyPath가 있으면 파일을 읽어서 privateKey로 변환
      if (config.privateKeyPath) {
        const fs = require('fs');
        const keyPath = config.privateKeyPath.replace(/^~/, require('os').homedir());
        if (fs.existsSync(keyPath)) {
          config.privateKey = fs.readFileSync(keyPath, 'utf8');
        } else {
          return { success: false, error: `키 파일을 찾을 수 없습니다: ${keyPath}` };
        }
        delete config.privateKeyPath;
      }
      await sshManager.connect(config);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('ssh:disconnect', async () => {
    if (!sshManager) return { success: false, error: 'SSHManager not loaded' };
    try {
      sshManager.disconnect();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Note: For real terminal integration, we need to bridge pty to ssh stream or use xterm in renderer to talk to ssh stream directly via IPC.
  // Ideally, 'ssh:start-shell' would start a session streaming data back to renderer.
  ipcMain.handle('ssh:start-shell', async (event, terminalId) => {
    if (!sshManager) return { success: false, error: 'SSHManager not loaded' };
    try {
      await sshManager.startShell(
        terminalId,
        (data: string) => {
          event.sender.send('terminal:data', terminalId, data);
        },
        (code: number) => {
          event.sender.send('terminal:exit', terminalId, code);
        }
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('ssh:exec-shell', async (event, terminalId: string, command: string) => {
    if (!sshManager) return { success: false, error: 'SSHManager not loaded' };
    try {
      await sshManager.startShellWithCommand(
        terminalId,
        command,
        (data: string) => {
          event.sender.send('terminal:data', terminalId, data);
        },
        (code: number) => {
          event.sender.send('terminal:exit', terminalId, code);
        }
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('ssh:write', (_event, terminalId, data) => {
    if (sshManager) sshManager.write(terminalId, data);
  });

  ipcMain.handle('ssh:resize', (_event, terminalId, cols, rows) => {
    if (sshManager) sshManager.resize(terminalId, cols, rows);
  });

  // ========== SFTP Handlers ==========
  ipcMain.handle('sftp:start', async () => {
    if (!sshManager) return { success: false, error: 'SSHManager not loaded' };
    try {
      await sshManager.startSftp();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('sftp:list', async (_event, remotePath: string) => {
    if (!sshManager) return { success: false, error: 'SSHManager not loaded' };
    try {
      const files = await sshManager.listDirectory(remotePath);
      return { success: true, files };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('sftp:read', async (_event, remotePath: string) => {
    if (!sshManager) return { success: false, error: 'SSHManager not loaded' };
    try {
      const content = await sshManager.readFile(remotePath);
      return { success: true, content };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('sftp:write', async (_event, remotePath: string, content: string) => {
    if (!sshManager) return { success: false, error: 'SSHManager not loaded' };
    try {
      await sshManager.writeFile(remotePath, content);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('sftp:mkdir', async (_event, remotePath: string) => {
    if (!sshManager) return { success: false, error: 'SSHManager not loaded' };
    try {
      await sshManager.createDirectory(remotePath);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('sftp:delete', async (_event, remotePath: string, isDirectory: boolean) => {
    if (!sshManager) return { success: false, error: 'SSHManager not loaded' };
    try {
      if (isDirectory) {
        await sshManager.deleteDirectory(remotePath);
      } else {
        await sshManager.deleteFile(remotePath);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('sftp:stat', async (_event, remotePath: string) => {
    if (!sshManager) return { success: false, error: 'SSHManager not loaded' };
    try {
      const stat = await sshManager.stat(remotePath);
      return { success: true, stat };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Linter (Python/C/C++ 지원)
  ipcMain.handle('linter:check', async (_event, filePath: string) => {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';

    // C/C++ 파일
    if (['c', 'h', 'cpp', 'cc', 'cxx', 'hpp', 'hh', 'hxx'].includes(ext)) {
      return await linterService.checkC(filePath);
    }

    // Python 파일 (기본)
    return await linterService.checkPython(filePath);
  });


  // 홈 디렉토리 경로 반환 (인앱 파일 브라우저용)
  ipcMain.handle('fs:getHomePath', async () => {
    return { success: true, path: require('os').homedir() };
  });

  // 디렉토리 읽기
  ipcMain.handle('fs:readDir', async (_event, dirPath: string) => {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const files = entries.map((entry: any) => ({
        name: entry.name,
        path: pathModule.join(dirPath, entry.name),
        isDirectory: entry.isDirectory(),
      }));
      return { success: true, files };
    } catch (error: any) {
      console.error('Failed to read directory:', error);
      return { success: false, error: error.message };
    }
  });

  // 파일 시스템 감시 (chokidar 사용 - Linux 호환)
  const chokidar = require('chokidar');
  const activeWatchers = new Map<string, any>();

  ipcMain.handle('fs:watch', async (event, dirPath: string) => {
    try {
      // 이미 감시 중이면 중복 생성 방지
      if (activeWatchers.has(dirPath)) {
        return { success: true, message: 'Already watching' };
      }

      const watcher = chokidar.watch(dirPath, {
        ignored: /(^|[\/\\])(\.|node_modules|\.git|venv|\.venv|env|\.env|__pycache__|dist|build|target|out)/, // 대량 파일 및 숨김 파일 무시
        persistent: true,
        ignoreInitial: true, // 초기 스캔 이벤트 무시
        depth: 10, // 최대 깊이
      });

      watcher
        .on('add', (filePath: string) => {
          console.log('[Chokidar] File added:', filePath);
          event.sender.send('fs:watch-event', {
            type: 'add',
            filename: filePath.replace(dirPath + '/', ''),
            dirPath
          });
        })
        .on('unlink', (filePath: string) => {
          console.log('[Chokidar] File removed:', filePath);
          event.sender.send('fs:watch-event', {
            type: 'unlink',
            filename: filePath.replace(dirPath + '/', ''),
            dirPath
          });
        })
        .on('addDir', (filePath: string) => {
          console.log('[Chokidar] Directory added:', filePath);
          event.sender.send('fs:watch-event', {
            type: 'addDir',
            filename: filePath.replace(dirPath + '/', ''),
            dirPath
          });
        })
        .on('unlinkDir', (filePath: string) => {
          console.log('[Chokidar] Directory removed:', filePath);
          event.sender.send('fs:watch-event', {
            type: 'unlinkDir',
            filename: filePath.replace(dirPath + '/', ''),
            dirPath
          });
        })
        .on('error', (err: Error) => {
          console.error('[Chokidar] Watch error:', err);
        });

      activeWatchers.set(dirPath, watcher);
      console.log('[Chokidar] Started watching:', dirPath);
      return { success: true };
    } catch (error: any) {
      console.error('Failed to watch directory:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('fs:unwatch', async (_event, dirPath: string) => {
    try {
      const watcher = activeWatchers.get(dirPath);
      if (watcher) {
        watcher.close();
        activeWatchers.delete(dirPath);
      }
      return { success: true };
    } catch (error: any) {
      console.error('Failed to unwatch directory:', error);
      return { success: false, error: error.message };
    }
  });

  // 폴더 선택 다이얼로그
  ipcMain.handle('dialog:openDirectory', async () => {
    const { dialog, BrowserWindow } = require('electron');
    try {
      const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      const result = await dialog.showOpenDialog(win || undefined, {
        properties: ['openDirectory'],
      });
      if (result.canceled) {
        return { success: false, canceled: true };
      }
      return { success: true, path: result.filePaths[0] };
    } catch (error: any) {
      console.error('Failed to open directory dialog:', error);
      return { success: false, error: error.message };
    }
  });

  // 파일 선택 다이얼로그
  ipcMain.handle('dialog:openFile', async () => {
    const { dialog, BrowserWindow } = require('electron');
    try {
      const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      const result = await dialog.showOpenDialog(win || undefined, {
        properties: ['openFile'],
        filters: [
          { name: 'All Files', extensions: ['*'] },
          { name: 'JavaScript', extensions: ['js', 'jsx'] },
          { name: 'TypeScript', extensions: ['ts', 'tsx'] },
          { name: 'Python', extensions: ['py'] },
          { name: 'Rust', extensions: ['rs'] },
          { name: 'Go', extensions: ['go'] },
          { name: 'JSON', extensions: ['json'] },
          { name: 'Markdown', extensions: ['md'] },
          { name: 'Text', extensions: ['txt'] },
        ]
      });
      if (result.canceled) {
        return { success: false, canceled: true };
      }
      return { success: true, path: result.filePaths[0] };
    } catch (error: any) {
      console.error('Failed to open file dialog:', error);
      return { success: false, error: error.message };
    }
  });

  // 파일 저장 다이얼로그
  ipcMain.handle('dialog:saveFile', async () => {
    const { dialog, BrowserWindow } = require('electron');
    try {
      const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      const result = await dialog.showSaveDialog(win || undefined, {
        title: '새 파일 저장',
        buttonLabel: '저장',
        defaultPath: require('os').homedir(),
        filters: [
          { name: 'All Files', extensions: ['*'] },
          { name: 'Text Files', extensions: ['txt', 'md'] },
          { name: 'JavaScript', extensions: ['js', 'jsx'] },
          { name: 'TypeScript', extensions: ['ts', 'tsx'] },
          { name: 'Python', extensions: ['py'] },
          { name: 'HTML', extensions: ['html'] },
          { name: 'CSS', extensions: ['css'] },
        ]
      });

      if (result.canceled || !result.filePath) {
        return { success: true, canceled: true };
      }

      return { success: true, path: result.filePath };
    } catch (error: any) {
      console.error('Failed to open save dialog:', error);
      return { success: false, error: error.message };
    }
  });

  // 메시지 박스 다이얼로그
  ipcMain.handle('dialog:showMessageBox', async (_event, options: any) => {
    const { dialog, BrowserWindow } = require('electron');
    try {
      const win = BrowserWindow.getFocusedWindow();
      // options: { type, title, message, buttons }
      const result = await dialog.showMessageBox(win || undefined, options);
      return { success: true, response: result.response };
    } catch (error: any) {
      console.error('Failed to open message box:', error);
      return { success: false, error: error.message };
    }
  });

  // 파일 생성
  ipcMain.handle('fs:createFile', async (_event, filePath: string, content: string = '') => {
    try {
      await fs.writeFile(filePath, content, 'utf-8');
      return { success: true };
    } catch (error: any) {
      console.error('Failed to create file:', error);
      return { success: false, error: error.message };
    }
  });

  // 디렉토리 생성
  ipcMain.handle('fs:createDir', async (_event, dirPath: string) => {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      return { success: true };
    } catch (error: any) {
      console.error('Failed to create directory:', error);
      return { success: false, error: error.message };
    }
  });

  // 파일/디렉토리 이름 변경
  ipcMain.handle('fs:rename', async (_event, oldPath: string, newPath: string) => {
    try {
      await fs.rename(oldPath, newPath);
      return { success: true };
    } catch (error: any) {
      console.error('Failed to rename:', error);
      return { success: false, error: error.message };
    }
  });

  // 파일/디렉토리 삭제
  ipcMain.handle('fs:delete', async (_event, filePath: string) => {
    try {
      await fs.rm(filePath, { recursive: true, force: true });
      return { success: true };
    } catch (error: any) {
      console.error('Failed to delete:', error);
      return { success: false, error: error.message };
    }
  });

  // 파일/디렉토리 복사
  ipcMain.handle('fs:copy', async (_event, source: string, destination: string) => {
    try {
      // Node 16.7.0+ supports fs.cp for recursive copy
      await fs.cp(source, destination, { recursive: true });
      return { success: true };
    } catch (error: any) {
      console.error('Failed to copy:', error);
      return { success: false, error: error.message };
    }
  });

  // 파일/디렉토리 존재 여부 확인
  ipcMain.handle('fs:exists', async (_event, pathToCheck: string) => {
    try {
      await fs.access(pathToCheck);
      return { success: true, exists: true };
    } catch {
      return { success: true, exists: false };
    }
  });

  // 파일 검색 (Recursive)
  ipcMain.handle('fs:searchFiles', async (_event, rootPath: string, query: string = '') => {
    try {
      const path = require('path');
      const files: string[] = [];
      const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.idea', '.vscode', 'coverage', '__pycache__']);

      async function walk(currentPath: string) {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory()) {
            if (!ignoreDirs.has(entry.name) && !entry.name.startsWith('.')) {
              await walk(path.join(currentPath, entry.name));
            }
          } else {
            // 파일인 경우
            const fullPath = path.join(currentPath, entry.name);
            const relativePath = path.relative(rootPath, fullPath);

            // 검색어 필터링 (없으면 모두 포함)
            if (!query || relativePath.toLowerCase().includes(query.toLowerCase())) {
              files.push(relativePath);
            }

            // Limit results for performance
            if (files.length >= 1000) return;
          }
          if (files.length >= 1000) return;
        }
      }

      await walk(rootPath);
      return { success: true, files };
    } catch (error: any) {
      console.error('Failed to search files:', error);
      return { success: false, error: error.message };
    }
  });

  // 터미널 시작 (탭별로 고유 ID)
  ipcMain.handle('terminal:start', (_event, terminalId: string, shellType: string = 'default', cols: number = 80, rows: number = 24, cwd?: string, initialCommand?: string) => {
    // 이미 해당 ID의 터미널이 있으면 종료
    if (terminals.has(terminalId)) {
      const existingProcess = terminals.get(terminalId);
      if (existingProcess) {
        console.log(`🔄 Killing existing terminal process: ${terminalId}`);
        try {
          existingProcess.kill();
        } catch (e) {
          console.error('Failed to kill existing process:', e);
        }
      }
      terminals.delete(terminalId);
    }

    try {
      // 셸 타입에 따라 실행 경로 결정
      let shell: string;
      const env = { ...process.env, TERM: 'xterm-256color' };

      switch (shellType) {
        case 'bash':
          shell = '/bin/bash';
          break;
        case 'zsh':
          shell = '/bin/zsh';
          break;
        case 'sh':
          shell = '/bin/sh';
          break;
        case 'tmux':
          if (require('fs').existsSync('/usr/bin/tmux')) {
            shell = '/usr/bin/tmux';
          } else if (require('fs').existsSync('/bin/tmux')) {
            shell = '/bin/tmux';
          } else {
            shell = 'tmux';
          }
          break;
        default:
          // 시스템 기본 셸 사용 (zsh 우선 탐색)
          if (process.env.SHELL) {
            shell = process.env.SHELL;
          } else {
            const fs = require('fs');
            if (fs.existsSync('/bin/zsh')) {
              shell = '/bin/zsh';
            } else if (fs.existsSync('/usr/bin/zsh')) {
              shell = '/usr/bin/zsh';
            } else {
              shell = '/bin/bash';
            }
          }
      }

      console.log(`🚀 Starting PTY terminal ${terminalId} with shell: ${shell}`);

      const args: string[] = [];
      if (initialCommand && shellType !== 'tmux') {
        // Debug logging to file
        try {
          require('fs').appendFileSync('/tmp/gluon_debug.log', `[${new Date().toISOString()}] terminal:start id=${terminalId} cmd=${initialCommand}\n`);
        } catch (e) { /* ignore */ }

        // Execute command and exit (no interactive shell)
        // User requested output-only mode
        args.push('-c', initialCommand);
      } else if (shellType === 'tmux') {
        // Create or attach to session
        args.push('new-session', '-A', '-s', 'gluon-session');
      }

      const ptyProcess = pty.spawn(shell, args, {
        name: 'xterm-256color',
        cols,
        rows,
        cwd: cwd || process.env.HOME || process.cwd(),
        env,
      });

      // Map에 저장
      terminals.set(terminalId, ptyProcess);

      // PTY 출력을 렌더러로 전송
      ptyProcess.onData((data: string) => {
        // Send to all windows or focused? Terminals are usually tied to a window.
        // Ideally we map terminalID -> windowID. For now, broadcast to all.
        // Or send to focused.
        const win = BrowserWindow.getFocusedWindow();
        win?.webContents.send('terminal:data', terminalId, data);
      });

      ptyProcess.onExit((res: { exitCode: number, signal?: number }) => {
        console.log(`🛑 Terminal ${terminalId} exited with code: ${res.exitCode}`);
        terminals.delete(terminalId);
        const win = BrowserWindow.getFocusedWindow();
        win?.webContents.send('terminal:exit', terminalId, res.exitCode);
      });

      return { success: true, terminalId };
    } catch (error: any) {
      console.error(`❌ Failed to start terminal ${terminalId}:`, error);
      terminals.delete(terminalId);
      return { success: false, error: error.message };
    }
  });

  // 터미널 크기 변경
  ipcMain.handle('terminal:resize', (_event, terminalId: string, cols: number, rows: number) => {
    const ptyProcess = terminals.get(terminalId);
    if (ptyProcess) {
      try {
        ptyProcess.resize(cols, rows);
        return { success: true };
      } catch (error: any) {
        console.error(`Failed to resize terminal ${terminalId}:`, error);
        return { success: false, error: error.message };
      }
    }
    return { success: false, error: 'Terminal not found' };
  });

  // 시스템 기본 쉘 가져오기
  ipcMain.handle('terminal:getSystemShell', () => {
    try {
      let shell: string;
      if (process.env.SHELL) {
        shell = process.env.SHELL;
      } else {
        const fs = require('fs');
        if (fs.existsSync('/bin/zsh')) {
          shell = '/bin/zsh';
        } else if (fs.existsSync('/usr/bin/zsh')) {
          shell = '/usr/bin/zsh';
        } else {
          shell = '/bin/bash';
        }
      }
      return { success: true, shell };
    } catch (error: any) {
      console.error('Failed to get system shell:', error);
      return { success: false, error: error.message };
    }
  });

  // 터미널에 데이터 쓰기 (터미널 ID 포함)
  ipcMain.on('terminal:write', (_event, terminalId: string, data: string) => {
    const ptyProcess = terminals.get(terminalId);
    if (ptyProcess) {
      ptyProcess.write(data);
    }
  });

  // 터미널 종료 (터미널 ID 포함)
  ipcMain.handle('terminal:kill', (_event, terminalId: string) => {
    const shellProcess = terminals.get(terminalId);
    if (shellProcess && !shellProcess.killed) {
      shellProcess.kill();
      terminals.delete(terminalId);
      return { success: true };
    }
    return { success: false, error: 'No terminal running' };
  });

  // 창 제어 IPC 핸들러
  ipcMain.handle('window:minimize', () => {
    BrowserWindow.getFocusedWindow()?.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
    return win?.isMaximized() ?? false;
  });

  ipcMain.handle('window:close', () => {
    BrowserWindow.getFocusedWindow()?.close();
  });

  ipcMain.handle('window:create', () => {
    createWindow();
  });

  // 경로 가져오기 (Home, AppData, etc.)
  ipcMain.handle('app:getPath', (_event, name: any) => {
    return app.getPath(name);
  });


  // 외부 링크 열기 (브라우저)
  ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    const { shell } = require('electron');
    await shell.openExternal(url);
  });

  // --- Settings Store Handlers ---
  const Store = require('electron-store');
  const store = new Store();

  // 설정 가져오기
  ipcMain.handle('store:get', (_event, key: string) => {
    try {
      return { success: true, value: store.get(key) };
    } catch (error: any) {
      console.error(`Failed to get store key ${key}:`, error);
      return { success: false, error: error.message };
    }
  });

  // 설정 저장하기
  ipcMain.handle('store:set', (_event, key: string, value: any) => {
    try {
      store.set(key, value);
      return { success: true };
    } catch (error: any) {
      console.error(`Failed to set store key ${key}:`, error);
      return { success: false, error: error.message };
    }
  });

  // --- Settings JSON File Handlers ---
  const fsSync = require('fs'); // 동기 fs 함수용
  const settingsDir = path.join(app.getPath('userData'), 'User');
  const settingsPath = path.join(settingsDir, 'settings.json');

  // 기본 설정 (초기 파일 생성 시 사용)
  const defaultSettings = {
    "editor.fontSize": 14,
    "editor.fontLigatures": true,
    "editor.tabSize": 2,
    "editor.insertSpaces": true,
    "editor.wordWrap": false,
    "editor.minimap": false,
    "editor.lineNumbers": true,
    "editor.fontFamily": "'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace",
    "editor.formatOnSave": false,
    "terminal.integrated.scrollback": 1000
  };

  // settings.json 경로 반환
  ipcMain.handle('settings:getPath', () => {
    // 디렉토리가 없으면 생성
    if (!fsSync.existsSync(settingsDir)) {
      fsSync.mkdirSync(settingsDir, { recursive: true });
    }
    // 파일이 없으면 기본값으로 생성
    if (!fsSync.existsSync(settingsPath)) {
      fsSync.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2), 'utf8');
    }
    return settingsPath;
  });

  // settings.json 읽기
  ipcMain.handle('settings:read', () => {
    try {
      if (!fsSync.existsSync(settingsDir)) {
        fsSync.mkdirSync(settingsDir, { recursive: true });
      }
      if (!fsSync.existsSync(settingsPath)) {
        fsSync.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2), 'utf8');
        return { success: true, data: defaultSettings };
      }

      const content = fsSync.readFileSync(settingsPath, 'utf8');
      let currentSettings = {};
      try {
        currentSettings = JSON.parse(content);
      } catch (e) {
        console.error('Failed to parse settings.json, reverting to defaults', e);
        currentSettings = {};
      }

      // Merge defaults: if key missing in currentSettings, add it from defaultSettings
      let hasChanges = false;
      const mergedSettings: Record<string, any> = { ...currentSettings };

      for (const [key, value] of Object.entries(defaultSettings)) {
        if (mergedSettings[key] === undefined) {
          mergedSettings[key] = value;
          hasChanges = true;
        }
      }

      // If we added missing defaults, save back to file so user sees them
      if (hasChanges) {
        fsSync.writeFileSync(settingsPath, JSON.stringify(mergedSettings, null, 2), 'utf8');
      }

      return { success: true, data: mergedSettings };
    } catch (error: any) {
      console.error('Failed to read settings.json:', error);
      return { success: false, error: error.message };
    }
  });

  // settings.json 저장
  ipcMain.handle('settings:write', (_event, settings: object) => {
    try {
      if (!fsSync.existsSync(settingsDir)) {
        fsSync.mkdirSync(settingsDir, { recursive: true });
      }
      fsSync.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
      return { success: true };
    } catch (error: any) {
      console.error('Failed to write settings.json:', error);
      return { success: false, error: error.message };
    }
  });

  // --- Git Integration Handlers ---
  const simpleGit = require('simple-git');

  // Git 저장소 초기화/확인
  ipcMain.handle('git:init', async (_event, workingDir: string) => {
    try {
      const git = simpleGit(workingDir);
      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        await git.init();
      }
      return { success: true, isRepo: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Git 상태 확인 (변경된 파일 목록)
  ipcMain.handle('git:status', async (_event, workingDir: string) => {
    try {
      const git = simpleGit(workingDir);
      const status = await git.status();
      // IPC로 전송하기 위해 순수 객체로 변환 (메서드 제거 등)
      return { success: true, status: JSON.parse(JSON.stringify(status)) };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Git Add
  ipcMain.handle('git:add', async (_event, workingDir: string, files: string[]) => {
    try {
      const git = simpleGit(workingDir);
      await git.add(files);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Git Commit
  ipcMain.handle('git:commit', async (_event, workingDir: string, message: string) => {
    try {
      const git = simpleGit(workingDir);
      // 사용자 정보 설정 (설정에 저장된 값 또는 Git 전역 설정 사용)
      // 여기서는 우선 전역 설정을 따르거나 실패 시 에러 리턴
      await git.commit(message);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Git Push (인증 정보 포함)
  ipcMain.handle('git:push', async (_event, workingDir: string) => {
    try {
      const git = simpleGit(workingDir);
      // 저장된 GitHub 토큰 가져오기
      const token = store.get('github_token');
      const username = store.get('github_username'); // 토큰 사용시 username은 크게 중요하지 않지만 remote URL 구성용

      if (token) {
        // 리모트 URL에 토큰 주입하여 푸시 (임시 설정)
        // 주의: 리모트 URL을 변경하는 것은 위험할 수 있으므로, http.extraHeader를 사용하는 것이 안전
        // 하지만 simple-git에서는 env 옵션으로 헤더 전달이 까다로울 수 있음.
        // 가장 확실한 방법: git remote set-url origin https://<token>@github.com/<repo>
        // 또는 push 시 URL 직접 지정.

        const remotes = await git.getRemotes(true);
        const origin = remotes.find((r: any) => r.name === 'origin');

        if (origin) {
          let pushUrl = origin.refs.push || origin.refs.fetch;

          // HTTPS URL인 경우에만 토큰 주입 처리
          if (pushUrl.startsWith('https://')) {
            // 기존 인증 정보 제거 및 새 토큰 주입
            const cleanUrl = pushUrl.replace(/^https:\/\/.*@/, 'https://');
            const authUrl = `https://${token}@${cleanUrl.substring(8)}`;

            // 현재 브랜치 이름 가져오기
            const status = await git.status();
            const currentBranch = status.current;

            if (currentBranch) {
              // --set-upstream 사용하여 푸시 (새 브랜치 등록)
              await git.push(authUrl, currentBranch, ['--set-upstream']);
            } else {
              await git.push(authUrl, 'HEAD');
            }
          } else {
            // SSH 등 다른 방식이면 그냥 시도 (여기서도 -u 옵션 추가)
            const status = await git.status();
            if (status.current) {
              await git.push('origin', status.current, ['--set-upstream']);
            } else {
              await git.push();
            }
          }
        }
      } else {
        // 토큰이 없으면 그냥 기본 푸시 시도 (SSH 키 등 사용 가정)
        // 하지만 remote upstream 설정이 안되어 있을 수 있으므로 체크
        const status = await git.status();
        if (status.current) {
          await git.push('origin', status.current, ['--set-upstream']);
        } else {
          await git.push();
        }
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Git Clone
  ipcMain.handle('git:clone', async (_event, repoUrl: string, targetDir: string) => {
    try {
      // mkdir for targetDir handled by git clone usually, but simple-git might need parent
      await simpleGit().clone(repoUrl, targetDir);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Git Show (특정 파일의 특정 버전 내용 확인 - HEAD 기준)
  ipcMain.handle('git:show', async (_event, workingDir: string, filePath: string) => {
    try {
      const git = simpleGit(workingDir);
      // HEAD:filePath 형식으로 조회
      const content = await git.show([`HEAD:${filePath}`]);
      return { success: true, content };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ----------------------------------------------------------------------
  // Python IPC Handlers
  // ----------------------------------------------------------------------
  ipcMain.handle('python:get-version', async () => {
    return await pythonService.getVersion();
  });

  // Environment Service
  ipcMain.handle('env:scan-python', async (_, projectRoot: string) => {
    const { environmentService } = await import('./services/EnvironmentService');
    try {
      return await environmentService.scanPython(projectRoot);
    } catch (e) {
      console.error('env:scan-python failed:', e);
      return [];
    }
  });

  ipcMain.handle('python:run', async (_, script: string) => {
    return await pythonService.runScript(script);
  });






  // Git Branch List
  ipcMain.handle('git:branch', async (_event, workingDir: string) => {
    try {
      const git = simpleGit(workingDir);
      const branchSummary = await git.branch();
      return { success: true, branches: branchSummary };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Git Checkout
  ipcMain.handle('git:checkout', async (_event, workingDir: string, branchName: string) => {
    try {
      const git = simpleGit(workingDir);
      await git.checkout(branchName);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Git Branch Create
  ipcMain.handle('git:branch-create', async (_event, workingDir: string, branchName: string) => {
    try {
      const git = simpleGit(workingDir);
      await git.checkoutLocalBranch(branchName);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Git Diff (파일 내용 비교)
  ipcMain.handle('git:diff', async (_event, workingDir: string, filePath: string) => {
    try {
      const git = simpleGit(workingDir);
      // HEAD 버전의 파일 내용 가져오기 (cat-file 이용)
      const headContent = await git.show([`HEAD:${filePath}`]);
      return { success: true, original: headContent };
    } catch (error: any) {
      // 새 파일이거나 에러인 경우 빈 내용 반환
      return { success: true, original: '' };
    }
  });

  // Git History (Log) - Custom Parsing for Graph
  ipcMain.handle('git:log', async (_event, workingDir: string, options: { all?: boolean, limit?: number } = {}) => {
    try {
      const git = simpleGit(workingDir);

      // 안전한 구분자 사용 (::::)
      const DELIMITER = '::::';
      const format = `%H${DELIMITER}%P${DELIMITER}%an${DELIMITER}%s${DELIMITER}%cI${DELIMITER}%d`;

      const limit = options.limit || 300;
      const logArgs = ['log', '-n', limit.toString(), '--date=iso', `--format=${format}`];

      // Default behavior is to show all unless explicitly disabled
      if (options.all !== false) {
        logArgs.push('--all');
      }

      // raw 명령 실행
      const result = await git.raw(logArgs);

      const commits = result.split('\n')
        .filter((line: string) => line.trim() !== '')
        .map((line: string) => {
          const parts = line.split(DELIMITER);
          if (parts.length < 6) return null; // 잘못된 라인 필터링
          const [hash, parents, author_name, message, date, refs] = parts;
          return {
            hash,
            parents, // "hash1 hash2" or ""
            author_name,
            message,
            date,
            refs // " (HEAD -> main, origin/main)"
          };
        })
        .filter((c: any) => c !== null);

      return { success: true, log: { all: commits } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Search: Text search using grep
  ipcMain.handle('search:text', async (_event, workingDir: string, query: string) => {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      // Use find to search for file and directory names (case-insensitive)
      // -iname: case-insensitive name matching
      // -type f: files only, -type d: directories only
      // We'll search for both and combine results
      const cmd = `find "${workingDir}" \\( -path "*/node_modules" -o -path "*/.git" -o -path "*/dist" -o -path "*/build" -o -path "*/.next" -o -path "*/out" \\) -prune -o -iname "*${query.replace(/"/g, '\\"')}*" -print`;

      const { stdout } = await execAsync(cmd, { maxBuffer: 1024 * 1024 * 10 }); // 10MB buffer

      // Parse find output: one path per line
      const results = stdout
        .trim()
        .split('\n')
        .filter((line: string) => line.length > 0 && line !== workingDir)
        .map((fullPath: string) => {
          const fs = require('fs');
          const stats = fs.statSync(fullPath);
          return {
            file: fullPath,
            isDirectory: stats.isDirectory(),
            name: fullPath.split('/').pop() || ''
          };
        })
        .filter((item: any) => item.name.length > 0);

      return { success: true, results };
    } catch (error: any) {
      // find returns exit code 1 if no matches found
      if (error.code === 1) {
        return { success: true, results: [] };
      }
      return { success: false, error: error.message };
    }
  });

  // Extensions: Install tool via npm or pip
  ipcMain.handle('extensions:install', async (_event, toolId: string, packageManager: 'npm' | 'pip') => {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      let cmd = '';
      if (packageManager === 'npm') {
        cmd = `npm install -g ${toolId}`;
      } else if (packageManager === 'pip') {
        cmd = `pip install ${toolId}`;
      }

      const { stdout, stderr } = await execAsync(cmd);
      return { success: true, output: stdout || stderr };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Extensions: Uninstall tool
  ipcMain.handle('extensions:uninstall', async (_event, toolId: string, packageManager: 'npm' | 'pip') => {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      let cmd = '';
      if (packageManager === 'npm') {
        cmd = `npm uninstall -g ${toolId}`;
      } else if (packageManager === 'pip') {
        cmd = `pip uninstall -y ${toolId}`;
      }

      const { stdout, stderr } = await execAsync(cmd);
      return { success: true, output: stdout || stderr };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Extensions: Check if tool is installed
  ipcMain.handle('extensions:check', async (_event, command: string) => {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      // Try to get version
      const { stdout } = await execAsync(`${command} --version`);
      return { success: true, installed: true, version: stdout.trim() };
    } catch (error: any) {
      return { success: true, installed: false };
    }
  });

  // --- Debug: Run Script ---
  const debugProcesses = new Map<string, any>();

  ipcMain.handle('debug:run', (_event, sessionId: string, filePath: string, cwd: string) => {
    const { spawn } = require('child_process');
    const pathModule = require('path');

    // Kill existing
    if (debugProcesses.has(sessionId)) {
      try { debugProcesses.get(sessionId).kill('SIGTERM'); } catch (e) { /* */ }
      debugProcesses.delete(sessionId);
    }

    const ext = pathModule.extname(filePath).toLowerCase();
    let command: string;
    let args: string[];

    switch (ext) {
      case '.py':
        command = 'python3';
        args = ['-u', filePath];
        break;
      case '.js':
        command = 'node';
        args = [filePath];
        break;
      case '.ts':
        command = 'npx';
        args = ['ts-node', filePath];
        break;
      case '.sh':
        command = 'bash';
        args = [filePath];
        break;
      case '.go':
        command = 'go';
        args = ['run', filePath];
        break;
      default:
        command = 'node';
        args = [filePath];
    }

    console.log(`🐛 Debug: Running ${command} ${args.join(' ')} in ${cwd}`);

    try {
      const child = spawn(command, args, {
        cwd,
        env: { ...process.env, PYTHONUNBUFFERED: '1' },
        shell: false,
      });

      debugProcesses.set(sessionId, child);

      child.stdout?.on('data', (data: Buffer) => {
        BrowserWindow.getAllWindows().forEach(w =>
          w.webContents.send('debug:output', sessionId, data.toString())
        );
      });

      child.stderr?.on('data', (data: Buffer) => {
        BrowserWindow.getAllWindows().forEach(w =>
          w.webContents.send('debug:output', sessionId, data.toString())
        );
      });

      child.on('close', (code: number | null) => {
        debugProcesses.delete(sessionId);
        BrowserWindow.getAllWindows().forEach(w =>
          w.webContents.send('debug:exit', sessionId, code ?? -1)
        );
      });

      child.on('error', (err: Error) => {
        debugProcesses.delete(sessionId);
        BrowserWindow.getAllWindows().forEach(w => {
          w.webContents.send('debug:output', sessionId, `Error: ${err.message}\n`);
          w.webContents.send('debug:exit', sessionId, -1);
        });
      });

      return { success: true, command: `${command} ${args.join(' ')}` };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('debug:stop', (_event, sessionId: string) => {
    if (debugProcesses.has(sessionId)) {
      const child = debugProcesses.get(sessionId);
      try {
        child.kill('SIGTERM');
        setTimeout(() => { try { child.kill('SIGKILL'); } catch (e) { /* */ } }, 2000);
      } catch (e) { /* */ }
      debugProcesses.delete(sessionId);
      return { success: true };
    }
    return { success: false, error: 'No running process' };
  });
}

// 딥링킹 핸들러 (Gluon Protocol)
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('gluon', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('gluon');
}

/**
 * 앱 초기화
 */
app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();

  // macOS: 독 아이콘 클릭 시 윈도우 재생성
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // [CRITICAL] 프로토콜 핸들러 등록 (Linux/Windows에서 필수)
  if (!app.isDefaultProtocolClient('gluon')) {
    const args = [];
    if (process.argv.length > 1) {
      args.push(path.resolve(process.argv[1]));
    }
    app.setAsDefaultProtocolClient('gluon', process.execPath, args);
  }

  // [Fix] Windows/Linux: 앱 시작 시 인자로 넘어온 URL 처리 (Primary Instance)
  if (process.platform !== 'darwin') {
    const url = process.argv.find(arg => arg.startsWith('gluon://'));
    if (url) {
      console.log('🚀 Startup Deep Link Found:', url);
      // 윈도우가 준비될 때까지 잠시 대기
      setTimeout(() => handleDeepLink(url), 1000);
    }
  }
});

// Windows/Linux 딥링킹 처리 (Second Instance)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // 사용자가 두 번째 인스턴스를 열려고 하면 메인 윈도우에 포커스
    // 사용자가 두 번째 인스턴스를 열려고 하면 첫 번째 윈도우에 포커스
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }

    // gluon:// 프로토콜 처리 (Windows/Linux)
    const url = commandLine.find(arg => arg.startsWith('gluon://'));
    if (url) {
      handleDeepLink(url);
    }
  });
}

// macOS 딥링킹 처리
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

// 딥링킹 URL 파싱 및 처리
function handleDeepLink(url: string) {
  console.log('🔗 Deep link received:', url);
  const logFile = '/tmp/gluon_main.log';
  try {
    require('fs').appendFileSync(logFile, `[DeepLink] Received: ${url}\n`);
  } catch (e) { }

  try {
    const urlObj = new URL(url);

    // gluon://auth?token=...
    if (urlObj.host === 'auth') {
      const token = urlObj.searchParams.get('token');
      if (token) {
        console.log('🔑 Token received via deep link');
        require('fs').appendFileSync(logFile, `[DeepLink] Token extracted. Broadcasting...\n`);

        // 토큰 저장 (ipcMain handler가 이미 store를 초기화했지만, 여기서도 store 인스턴스 접근 필요)
        // 주의: setupIpcHandlers 내부의 store 변수는 지역변수이므로 접근 불가.
        // store를 전역 또는 모듈 레벨로 빼거나, 여기서 새로 인스턴스 생성.
        const Store = require('electron-store');
        const store = new Store();
        store.set('token', token);

        // 렌더러에 알림
        // 렌더러에 알림 (모든 윈도우에 전송)
        BrowserWindow.getAllWindows().forEach(win => {
          win.webContents.send('auth:success', { token });
        });
      } else {
        require('fs').appendFileSync(logFile, `[DeepLink] No token found in URL.\n`);
      }
    }
  } catch (error: any) {
    console.error('Failed to handle deep link:', error);
    require('fs').appendFileSync(logFile, `[DeepLink] Error: ${error.message}\n`);
  }
}

// --- Chat Stream Proxy (Bypass Renderer CORS/SSL) ---
const activeStreams = new Map<string, any>(); // streamId -> controller/request

ipcMain.handle('chat:stream-start', async (event, streamId: string, url: string, body: any, headers: any) => {
  const axios = require('axios');
  const https = require('https');
  try {
    console.log(`🚀 Starting Chat Stream Proxy: ${streamId} -> ${url}`);

    const response = await axios({
      method: 'post',
      url: url,
      data: body,
      headers: headers,
      responseType: 'stream',
      httpsAgent: new https.Agent({
        rejectUnauthorized: false // [CRITICAL] Self-signed cert bypass
      })
    });

    const stream = response.data;
    activeStreams.set(streamId, stream);

    const { StringDecoder } = require('string_decoder');
    const utf8Decoder = new StringDecoder('utf8');

    stream.on('data', (chunk: Buffer) => {
      // StringDecoder handles multi-byte UTF-8 chars split across chunks
      const text = utf8Decoder.write(chunk);
      if (text) {
        event.sender.send('chat:stream-data', streamId, text);
      }
    });

    stream.on('end', () => {
      console.log(`✅ Chat Stream Ended: ${streamId}`);
      event.sender.send('chat:stream-end', streamId);
      activeStreams.delete(streamId);
    });

    stream.on('error', (err: any) => {
      console.error(`❌ Chat Stream Error: ${streamId}`, err);
      event.sender.send('chat:stream-error', streamId, err.message);
      activeStreams.delete(streamId);
    });

    return { success: true };

  } catch (error: any) {
    console.error('Failed to start chat stream:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('chat:stream-stop', (event, streamId: string) => {
  if (activeStreams.has(streamId)) {
    const stream = activeStreams.get(streamId);
    try {
      stream.destroy(); // Kill the stream
    } catch (e) { /* ignore */ }
    activeStreams.delete(streamId);
  }
  return { success: true };
});

// --- Auth Verification Handler ---
ipcMain.handle('auth:verify', async (_event, token: string, backendUrl: string) => {
  const axios = require('axios');
  const https = require('https');

  try {
    const agent = new https.Agent({
      rejectUnauthorized: false, // [CRITICAL] Self-signed 인증서 허용
      keepAlive: true
    });

    console.log(`🔐 Verifying token with backend: ${backendUrl}`);

    const response = await axios.get(`${backendUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: agent, // Node.js 환경에서는 여기서 agent 설정 가능
      timeout: 5000
    });

    return { success: true, user: response.data };
  } catch (error: any) {
    console.error('Auth verification failed in Main:', error.message);
    const status = error.response ? error.response.status : null;
    return { success: false, error: error.message, status };
  }
});

// --- Auth Login Handler (IPC Proxy) ---
ipcMain.handle('auth:login', async (_event, backendUrl: string, username: string, password: string) => {
  const axios = require('axios');
  try {
    console.log(`🔑 Login attempt to: ${backendUrl}`);
    const response = await axios.post(`${backendUrl}/auth/token`,
      new URLSearchParams({ username, password }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 5000 }
    );
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Login failed in Main:', error.message);
    const detail = error.response?.data?.detail || error.message;
    return { success: false, error: detail, status: error.response?.status };
  }
});

// --- Auth Register Handler (IPC Proxy) ---
ipcMain.handle('auth:register', async (_event, backendUrl: string, email: string, password: string, fullName: string) => {
  const axios = require('axios');
  try {
    console.log(`📝 Register attempt to: ${backendUrl}`);
    const response = await axios.post(`${backendUrl}/auth/register`,
      { email, password, full_name: fullName },
      { headers: { 'Content-Type': 'application/json' }, timeout: 5000 }
    );
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Register failed in Main:', error.message);
    const detail = error.response?.data?.detail || error.message;
    return { success: false, error: detail, status: error.response?.status };
  }
});

// --- Member Management Handlers (IPC Proxy) ---
ipcMain.handle('auth:getUsers', async (_event, backendUrl: string, token: string) => {
  const axios = require('axios');
  const https = require('https');
  try {
    const agent = new https.Agent({
      rejectUnauthorized: false,
      keepAlive: true
    });

    console.log(`👥 Fetching users from: ${backendUrl}`);
    const response = await axios.get(`${backendUrl}/users`, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: agent,
      timeout: 5000
    });
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Fetch users failed in Main:', error.message);
    const detail = error.response?.data?.detail || error.message;
    return { success: false, error: detail, status: error.response?.status };
  }
});

ipcMain.handle('auth:updateUserRole', async (_event, backendUrl: string, token: string, email: string, role: string) => {
  const axios = require('axios');
  const https = require('https');
  try {
    const agent = new https.Agent({
      rejectUnauthorized: false
    });

    console.log(`👑 Updating role for ${email} to ${role}`);
    const response = await axios.put(`${backendUrl}/users/${email}/role`,
      { role },
      {
        headers: { Authorization: `Bearer ${token}` },
        httpsAgent: agent,
        timeout: 5000
      }
    );
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Update role failed in Main:', error.message);
    const detail = error.response?.data?.detail || error.message;
    return { success: false, error: detail, status: error.response?.status };
  }
});

ipcMain.handle('auth:deleteUser', async (_event, backendUrl: string, token: string, email: string) => {
  const axios = require('axios');
  const https = require('https');
  try {
    const agent = new https.Agent({
      rejectUnauthorized: false
    });

    console.log(`❌ Deleting user ${email} at ${backendUrl}`);
    const response = await axios.delete(`${backendUrl}/users/${email}`, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent: agent,
      timeout: 5000
    });
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Delete user failed in Main:', error.message);
    const detail = error.response?.data?.detail || error.message;
    return { success: false, error: detail, status: error.response?.status };
  }
});

// 여기서는 로직이 격리되어 있으므로 패스.

/**
 * 모든 윈도우가 닫혔을 때
 */
app.on('window-all-closed', () => {
  // macOS가 아니면 앱 종료
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * 앱 종료 전 정리 작업
 */
app.on('before-quit', () => {
  // 리소스 정리
  console.log('Gluon shutting down...');
});
