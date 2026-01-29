import { useState, useEffect } from 'react';
import '../styles/ExtensionsPanel.css';
import ConfirmModal from './ConfirmModal';

interface Extension {
  id: string;
  name: string;
  description: string;
  packageName: string;
  packageManager: 'npm' | 'pip';
  checkCommand: string;
  installed: boolean;
  installing: boolean;
}

const RECOMMENDED_EXTENSIONS: Extension[] = [
  {
    id: 'prettier',
    name: 'Prettier',
    description: 'Code formatter for consistent code style',
    packageName: 'prettier',
    packageManager: 'npm',
    checkCommand: 'prettier',
    installed: false,
    installing: false,
  },
  {
    id: 'eslint',
    name: 'ESLint',
    description: 'JavaScript/TypeScript linter for code quality',
    packageName: 'eslint',
    packageManager: 'npm',
    checkCommand: 'eslint',
    installed: false,
    installing: false,
  },
  {
    id: 'debugpy',
    name: 'Python Debugger',
    description: 'Python debugging support (debugpy)',
    packageName: 'debugpy',
    packageManager: 'pip',
    checkCommand: 'python -m debugpy --version',
    installed: false,
    installing: false,
  },
  {
    id: 'gdb',
    name: 'GDB (C/C++ Debugger)',
    description: 'GNU Debugger for C/C++ (install via system package manager)',
    packageName: 'gdb',
    packageManager: 'npm', // Not actually npm, just placeholder
    checkCommand: 'gdb',
    installed: false,
    installing: false,
  },
];

function ExtensionsPanel() {
  const [extensions, setExtensions] = useState<Extension[]>(RECOMMENDED_EXTENSIONS);
  const [searchQuery, setSearchQuery] = useState('');
  const [uninstallTarget, setUninstallTarget] = useState<Extension | null>(null);

  // Check installation status on mount
  useEffect(() => {
    checkAllInstallations();
  }, []);

  const checkAllInstallations = async () => {
    const updatedExtensions = await Promise.all(
      extensions.map(async (ext) => {
        const result = await window.electron.extensions.check(ext.checkCommand);
        return { ...ext, installed: result.installed };
      })
    );
    setExtensions(updatedExtensions);
  };

  const handleInstall = async (id: string) => {
    const ext = extensions.find((e) => e.id === id);
    if (!ext) return;

    // Special handling for GDB
    if (ext.id === 'gdb') {
      alert('GDB는 시스템 패키지 매니저를 통해 설치해야 합니다.\n\nUbuntu/Debian: sudo apt install gdb\nFedora: sudo dnf install gdb\nArch: sudo pacman -S gdb');
      return;
    }

    // Set installing state
    setExtensions((prev) =>
      prev.map((e) => (e.id === id ? { ...e, installing: true } : e))
    );

    try {
      const result = await window.electron.extensions.install(ext.packageName, ext.packageManager);
      if (result.success) {
        // Recheck installation
        const checkResult = await window.electron.extensions.check(ext.checkCommand);
        setExtensions((prev) =>
          prev.map((e) =>
            e.id === id ? { ...e, installed: checkResult.installed, installing: false } : e
          )
        );
      } else {
        alert(`설치 실패: ${result.error}`);
        setExtensions((prev) =>
          prev.map((e) => (e.id === id ? { ...e, installing: false } : e))
        );
      }
    } catch (error: any) {
      alert(`설치 중 오류: ${error.message}`);
      setExtensions((prev) =>
        prev.map((e) => (e.id === id ? { ...e, installing: false } : e))
      );
    }
  };

  const handleUninstall = (id: string) => {
    const ext = extensions.find((e) => e.id === id);
    if (!ext) return;
    setUninstallTarget(ext);
  };

  const doUninstall = async () => {
    if (!uninstallTarget) return;
    const ext = uninstallTarget;
    setUninstallTarget(null);

    setExtensions((prev) =>
      prev.map((e) => (e.id === ext.id ? { ...e, installing: true } : e))
    );

    try {
      const result = await window.electron.extensions.uninstall(ext.packageName, ext.packageManager);
      if (result.success) {
        setExtensions((prev) =>
          prev.map((e) =>
            e.id === ext.id ? { ...e, installed: false, installing: false } : e
          )
        );
      } else {
        alert(`제거 실패: ${result.error}`);
        setExtensions((prev) =>
          prev.map((e) => (e.id === ext.id ? { ...e, installing: false } : e))
        );
      }
    } catch (error: any) {
      alert(`제거 중 오류: ${error.message}`);
      setExtensions((prev) =>
        prev.map((e) => (e.id === ext.id ? { ...e, installing: false } : e))
      );
    }
  };

  // 검색 필터
  const filteredExtensions = extensions.filter(
    (ext) =>
      ext.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ext.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="extensions-panel">
      {/* 헤더 */}
      <div className="extensions-header">
        <h3>EXTENSIONS</h3>
      </div>

      {/* 검색 */}
      <div className="extensions-search">
        <input
          type="text"
          placeholder="Search Extensions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* 확장 목록 */}
      <div className="extensions-list">
        {filteredExtensions.length === 0 ? (
          <div className="extensions-empty">
            <p>No extensions found</p>
          </div>
        ) : (
          filteredExtensions.map((ext) => (
            <div key={ext.id} className="extension-item">
              <div className="extension-info">
                <h4>{ext.name}</h4>
                <p>{ext.description}</p>
                {ext.installed && (
                  <span className="extension-badge installed">Installed</span>
                )}
              </div>
              <div className="extension-actions">
                {ext.installed ? (
                  <button
                    className="extension-button uninstall"
                    onClick={() => handleUninstall(ext.id)}
                    disabled={ext.installing}
                  >
                    {ext.installing ? 'Removing...' : 'Uninstall'}
                  </button>
                ) : (
                  <button
                    className="extension-button install"
                    onClick={() => handleInstall(ext.id)}
                    disabled={ext.installing}
                  >
                    {ext.installing ? 'Installing...' : 'Install'}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 제거 확인 모달 */}
      <ConfirmModal
        isOpen={!!uninstallTarget}
        title="확장 제거"
        message={`${uninstallTarget?.name || ''}을(를) 제거하시겠습니까?`}
        confirmText="제거"
        variant="delete"
        onConfirm={doUninstall}
        onCancel={() => setUninstallTarget(null)}
      />
    </div>
  );
}

export default ExtensionsPanel;
