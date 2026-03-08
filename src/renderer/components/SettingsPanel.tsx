import { useState, useEffect } from 'react';
import { XIcon, SettingsIcon } from './Icons';
import { KeyBinding, DEFAULT_SHORTCUTS } from '../types/shortcuts';
import { EditorSettings, DEFAULT_EDITOR_SETTINGS } from '../types/settings';
import '../styles/SettingsPanel.css';
import { useAuthStore } from '../store/authStore';

interface SettingsPanelProps {
  onClose: () => void;
  onOpenSettingsJson?: (filePath: string) => void;
  onApply?: () => void;
}

// ... inside SettingsPanel component

// Custom Dropdown Component
function CustomDropdown({ value, options, onChange, disabled }: { value: string, options: string[], onChange: (val: string) => void, disabled?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          padding: '6px 12px',
          borderRadius: '6px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(255, 255, 255, 0.05)',
          color: '#e0e0e0',
          cursor: disabled ? 'default' : 'pointer',
          fontSize: '13px',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth: '100px',
          justifyContent: 'space-between',
          opacity: disabled ? 0.5 : 1
        }}
      >
        <span>{value.charAt(0).toUpperCase() + value.slice(1)}</span>
        <span style={{ fontSize: '10px', opacity: 0.7 }}>▼</span>
      </div>

      {isOpen && (
        <>
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}
            onClick={() => setIsOpen(false)}
          />
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            zIndex: 20,
            overflow: 'hidden',
            minWidth: '100%'
          }}>
            {options.map(opt => (
              <div
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                style={{
                  padding: '8px 12px',
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  background: value === opt ? 'rgba(187, 134, 252, 0.1)' : 'transparent',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                onMouseOut={(e) => e.currentTarget.style.background = value === opt ? 'rgba(187, 134, 252, 0.1)' : 'transparent'}
              >
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}



// Custom Number Spinner Component
function NumberSpinner({ value, min, max, onChange }: { value: number, min: number, max: number, onChange: (val: number) => void }) {
  const handleDecrement = () => {
    if (value > min) onChange(value - 1);
  };
  const handleIncrement = () => {
    if (value < max) onChange(value + 1);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={handleDecrement}
        style={{
          width: '28px', height: '28px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '4px',
          color: '#e0e0e0',
          cursor: value <= min ? 'default' : 'pointer',
          opacity: value <= min ? 0.3 : 1
        }}
        disabled={value <= min}
      >
        −
      </button>
      <div style={{
        minWidth: '40px',
        textAlign: 'center',
        fontSize: '14px',
        color: '#e0e0e0',
        fontVariantNumeric: 'tabular-nums'
      }}>
        {value}
      </div>
      <button
        onClick={handleIncrement}
        style={{
          width: '28px', height: '28px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '4px',
          color: '#e0e0e0',
          cursor: value >= max ? 'default' : 'pointer',
          opacity: value >= max ? 0.3 : 1
        }}
        disabled={value >= max}
      >
        +
      </button>
    </div>
  );
}

interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: string;
  created_at: string;
}

type SettingsTab = 'editor' | 'github' | 'shortcuts' | 'members' | 'connection';
function SettingsPanel({ onClose, onOpenSettingsJson, onApply }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('editor');
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(DEFAULT_EDITOR_SETTINGS);
  const [githubSettings, setGithubSettings] = useState({
    username: '',
    token: ''
  });

  const { user, token, backendUrl } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const [shortcuts, setShortcuts] = useState<KeyBinding[]>(DEFAULT_SHORTCUTS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const [connectionUrl, setConnectionUrl] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      // settings.json에서 에디터 설정 읽기
      try {
        const result = await window.electron.settings.read();
        if (result.success && result.data) {
          const jsonSettings = result.data as Record<string, unknown>;
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
      } catch (e) {
        console.error('Failed to load settings.json:', e);
      }

      const user = await window.electron.store.get('github_username');
      const token = await window.electron.store.get('github_token');

      const savedShortcuts = await window.electron.store.get('key_bindings');

      setGithubSettings({
        username: user.success && user.value ? String(user.value) : '',
        token: token.success && token.value ? String(token.value) : ''
      });

      if (savedShortcuts.success && Array.isArray(savedShortcuts.value)) {
        const merged = DEFAULT_SHORTCUTS.map(def => {
          const saved = (savedShortcuts.value as KeyBinding[]).find((s: KeyBinding) => s.id === def.id);
          return saved ? { ...def, currentKey: saved.currentKey } : def;
        });
        setShortcuts(merged);
      }

      // Load AI Core URL
      const urlResult = await window.electron.store.get('ai_core_url');
      if (urlResult.success && urlResult.value) {
        setConnectionUrl(String(urlResult.value));
      } else {
        setConnectionUrl('http://100.110.157.32:9000'); // Default to previous/Tailscale IP
      }

    };
    loadSettings();
  }, []);

  const handleConnectionSave = async () => {
    let url = connectionUrl.trim();
    if (!url) return;
    // Remove trailing slash
    url = url.replace(/\/$/, '');
    if (!url.startsWith('http')) {
      url = `http://${url}`;
    }
    await window.electron.store.set('ai_core_url', url);
    setConnectionUrl(url); // Update UI

    // AuthStore 업데이트 (앱 재시작 없이 반영 시도)
    useAuthStore.setState({ backendUrl: url });

    showToast('Connection URL saved. Please restart app to apply changes fully.');
  };

  const handleApplyAll = async () => {
    const jsonSettings = {
      'editor.fontSize': editorSettings.fontSize,
      'editor.fontFamily': editorSettings.fontFamily,
      'editor.fontLigatures': editorSettings.fontLigatures,
      'editor.tabSize': editorSettings.tabSize,
      'editor.insertSpaces': editorSettings.insertSpaces,
      'editor.wordWrap': editorSettings.wordWrap,
      'editor.minimap': editorSettings.minimap,
      'editor.lineNumbers': editorSettings.lineNumbers,
      'editor.theme': editorSettings.theme,
      'editor.formatOnSave': editorSettings.formatOnSave,
      'editor.defaultFormatter': editorSettings.defaultFormatter,
    };
    await window.electron.settings.write(jsonSettings);
    await window.electron.store.set('key_bindings', shortcuts);
    showToast('Settings applied successfully.');
    if (onApply) {
      onApply();
    }
  };

  const handleEditorSettingChange = (key: keyof EditorSettings, value: any) => {
    setEditorSettings((prevSettings) => ({
      ...prevSettings,
      [key]: value,
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

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

    setShortcuts(prev => prev.map(s => s.id === id ? { ...s, currentKey: combo } : s));
    setEditingId(null);
  };


  const handleGithubSave = async () => {
    await window.electron.store.set('github_username', githubSettings.username);
    await window.electron.store.set('github_token', githubSettings.token);
    showToast('GitHub 설정이 저장되었습니다.');
  };

  const fetchUsers = async () => {
    if (!token || !backendUrl) return;
    setIsLoadingUsers(true);
    try {
      // Use IPC to bypass CORS/SSL issues in Renderer
      const result = await window.electron.auth.getUsers(backendUrl, token);

      if (result.success && result.data) {
        setUsers(result.data.users);
      } else {
        console.error('Failed to fetch users:', result.error);
        showToast('Failed to load members list (Server Error)');
      }
    } catch (e) {
      console.error('Error fetching users:', e);
      showToast('Error loading members (Check Server/Network)');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleRoleChange = async (email: string, newRole: string) => {
    if (!token || !backendUrl) return;
    try {
      // Use IPC to bypass CORS/SSL issues
      const result = await window.electron.auth.updateUserRole(backendUrl, token, email, newRole);

      if (result.success) {
        setUsers(prev => prev.map(u => u.email === email ? { ...u, role: newRole } : u));
        showToast(`Role updated to ${newRole}`);
      } else {
        showToast('Failed to update role');
      }
    } catch (e) {
      showToast('Error updating role');
    }
  };

  useEffect(() => {
    if (activeTab === 'members' && user?.role === 'root') {
      fetchUsers();
    }
  }, [activeTab, user]);

  return (
    <div className="settings-panel" onClick={onClose}>
      <div className="settings-panel-content" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="settings-header">
          <div className="settings-title">
            <SettingsIcon size={16} />
            <h2>Settings</h2>
          </div>
          <button className="settings-close" onClick={onClose}>
            <XIcon size={16} />
          </button>
        </div>

        {/* 탭 메뉴 */}
        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            Editor
          </button>
          <button
            className={`settings-tab ${activeTab === 'github' ? 'active' : ''}`}
            onClick={() => setActiveTab('github')}
          >
            GitHub
          </button>

          <button
            className={`settings-tab ${activeTab === 'shortcuts' ? 'active' : ''}`}
            onClick={() => setActiveTab('shortcuts')}
          >
            Key Bindings
          </button>

          <button
            className={`settings-tab ${activeTab === 'connection' ? 'active' : ''}`}
            onClick={() => setActiveTab('connection')}
          >
            Connection
          </button>

          {user?.role === 'root' && (
            <button
              className={`settings-tab ${activeTab === 'members' ? 'active' : ''}`}
              onClick={() => setActiveTab('members')}
            >
              Members
            </button>
          )}
        </div>

        {/* 콘텐츠 */}
        <div className="settings-content">
          {activeTab === 'connection' && (
            <div className="settings-section">
              <h3>Connection Settings</h3>

              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '24px',
                marginTop: '16px',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)'
              }}>
                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #536DFE 0%, #304FFE 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(48, 79, 254, 0.3)'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM11 19.93C7.05 19.44 4 16.08 4 12C4 11.38 4.08 10.79 4.21 10.21L9 15V16C9 17.1 9.9 18 11 18V19.93ZM17.9 17.39C17.64 16.58 16.9 16 16 16H15V13C15 12.45 14.55 12 14 12H8V10H10C10.55 10 11 9.55 11 9V7H13C14.1 7 15 6.1 15 5V4.59C17.93 5.78 20 8.65 20 12C20 14.08 19.2 15.97 17.9 17.39Z" fill="white" />
                    </svg>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', color: '#e0e0e0' }}>AI Core Server</h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>Configure your connection to the Quark AI backend</p>
                  </div>
                </div>

                <div className="setting-item" style={{ display: 'block' }}>
                  <label style={{ marginBottom: '8px', display: 'block', color: 'var(--text-secondary)', fontSize: '13px' }}>Server URL</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input
                        type="text"
                        value={connectionUrl}
                        onChange={(e) => setConnectionUrl(e.target.value)}
                        placeholder="http://100.x.x.x:9000"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          paddingLeft: '36px',
                          background: 'rgba(0, 0, 0, 0.2)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          fontSize: '14px',
                          transition: 'all 0.2s'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#536DFE';
                          e.target.style.background = 'rgba(0, 0, 0, 0.3)';
                          e.target.style.boxShadow = '0 0 0 2px rgba(83, 109, 254, 0.2)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          e.target.style.background = 'rgba(0, 0, 0, 0.2)';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                      <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                        🔗
                      </div>
                    </div>
                    <button
                      className="save-button"
                      onClick={handleConnectionSave}
                      style={{
                        background: 'linear-gradient(135deg, #536DFE 0%, #304FFE 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0 20px',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '14px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(48, 79, 254, 0.3)',
                        transition: 'transform 0.1s'
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.96)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      Connect
                    </button>
                  </div>

                  <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(83, 109, 254, 0.05)', borderRadius: '8px', border: '1px solid rgba(83, 109, 254, 0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#8C9EFF' }}>TIP</span>
                      <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>Connection Guide</span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', lineHeight: '1.6' }}>
                      <li><b>Localhost:</b> Use <code>http://localhost:9000</code> if running locally.</li>
                      <li><b>Tailscale:</b> Use your Tailscale IP (e.g., <code>100.110.x.x:9000</code>) for remote access.</li>
                      <li>Ensure the <b>AI Core</b> server is running before connecting.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="settings-section">
              <h3>Key Bindings</h3>
              <div className="shortcuts-list">
                {shortcuts.map((shortcut) => (
                  <div key={shortcut.id} className="shortcut-item">
                    <div className="shortcut-description">
                      <span className="setting-label">{shortcut.description}</span>
                    </div>
                    <div
                      className={`shortcut-key ${editingId === shortcut.id ? 'editing' : ''}`}
                      onClick={() => setEditingId(shortcut.id)}
                      onKeyDown={(e) => editingId === shortcut.id && handleKeyDown(e, shortcut.id)}
                      tabIndex={0}
                    >
                      {editingId === shortcut.id ? 'Press keys...' : shortcut.currentKey}
                    </div>
                    {shortcut.currentKey !== shortcut.defaultKey && (
                      <button
                        className="shortcut-reset-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShortcuts(prev => prev.map(s => s.id === shortcut.id ? { ...s, currentKey: s.defaultKey } : s));
                        }}
                        title="Reset to default"
                      >
                        ↺
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="shortcut-reset-all-btn"
                  onClick={() => {
                    setShortcuts(DEFAULT_SHORTCUTS.map(s => ({ ...s })));
                  }}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--accent-blue)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                >
                  Reset All to Defaults
                </button>
              </div>
            </div>
          )}


          {activeTab === 'editor' && (
            <div className="settings-section">
              <h3>Editor Settings</h3>

              <div className="setting-item">
                <label>
                  <span className="setting-label">Font Size</span>
                </label>
                <NumberSpinner
                  value={editorSettings.fontSize}
                  min={10}
                  max={30}
                  onChange={(val) => handleEditorSettingChange('fontSize', val)}
                />
              </div>

              <div className="setting-item">
                <label>
                  <span className="setting-label">Font Family</span>
                </label>
                <input
                  type="text"
                  value={editorSettings.fontFamily}
                  onChange={(e) => handleEditorSettingChange('fontFamily', e.target.value)}
                  placeholder="'Fira Code', monospace"
                />
              </div>

              <div className="setting-item">
                <label>
                  <span className="setting-label">Font Ligatures</span>
                </label>
                <input
                  type="checkbox"
                  checked={editorSettings.fontLigatures}
                  onChange={(e) => handleEditorSettingChange('fontLigatures', e.target.checked)}
                />
              </div>

              <div className="setting-item">
                <label>
                  <span className="setting-label">Tab Size</span>
                </label>
                <NumberSpinner
                  value={editorSettings.tabSize}
                  min={1}
                  max={8}
                  onChange={(val) => handleEditorSettingChange('tabSize', val)}
                />
              </div>

              <div className="setting-item">
                <label>
                  <span className="setting-label">Insert Spaces</span>
                </label>
                <input
                  type="checkbox"
                  checked={editorSettings.insertSpaces}
                  onChange={(e) => handleEditorSettingChange('insertSpaces', e.target.checked)}
                />
              </div>

              <div className="setting-item">
                <label>
                  <span className="setting-label">Word Wrap</span>
                </label>
                <input
                  type="checkbox"
                  checked={editorSettings.wordWrap}
                  onChange={(e) => handleEditorSettingChange('wordWrap', e.target.checked)}
                />
              </div>

              <div className="setting-item">
                <label>
                  <span className="setting-label">Minimap</span>
                </label>
                <input
                  type="checkbox"
                  checked={editorSettings.minimap}
                  onChange={(e) => handleEditorSettingChange('minimap', e.target.checked)}
                />
              </div>

              <div className="setting-item">
                <label>
                  <span className="setting-label">Line Numbers</span>
                </label>
                <input
                  type="checkbox"
                  checked={editorSettings.lineNumbers}
                  onChange={(e) => handleEditorSettingChange('lineNumbers', e.target.checked)}
                />
              </div>

              <div className="setting-item">
                <label>
                  <span className="setting-label">Theme</span>
                </label>
                <CustomDropdown
                  value={editorSettings.theme}
                  options={['modern-dark', 'modern-white', 'tokyo-night']}
                  onChange={(val) => handleEditorSettingChange('theme', val)}
                />
              </div>

              <div className="setting-item">
                <label>
                  <span className="setting-label">Format On Save</span>
                </label>
                <input
                  type="checkbox"
                  checked={editorSettings.formatOnSave}
                  onChange={(e) => handleEditorSettingChange('formatOnSave', e.target.checked)}
                />
              </div>

              <div className="setting-item">
                <label>
                  <span className="setting-label">Default Formatter</span>
                </label>
                <CustomDropdown
                  value={editorSettings.defaultFormatter}
                  options={['none']}
                  onChange={(val) => handleEditorSettingChange('defaultFormatter', val)}
                />
              </div>

              {/* Divider */}
              <div className="setting-divider" style={{ margin: '20px 0', borderBottom: '1px solid var(--border-color)' }}></div>

              {/* Open Settings JSON Button */}
              <div className="setting-item" style={{ justifyContent: 'flex-start' }}>
                <button
                  className="save-button"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}
                  onClick={async () => {
                    if (onOpenSettingsJson) {
                      const settingsPath = await window.electron.settings.getPath();
                      onOpenSettingsJson(settingsPath);
                      onClose();
                    }
                  }}
                >
                  Open Settings (JSON)
                </button>
              </div>
            </div>
          )}

          {activeTab === 'github' && (
            <div className="settings-section">
              <h3>GitHub Integration</h3>
              <div className="setting-item">
                <label>
                  <span className="setting-label">Username</span>
                </label>
                <input
                  type="text"
                  value={githubSettings.username || ''}
                  onChange={(e) => setGithubSettings({ ...githubSettings, username: e.target.value })}
                  placeholder="GitHub Username"
                />
              </div>
              <div className="setting-item">
                <label>
                  <span className="setting-label">Personal Access Token</span>
                </label>
                <input
                  type="password"
                  value={githubSettings.token || ''}
                  onChange={(e) => setGithubSettings({ ...githubSettings, token: e.target.value })}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="input-password"
                />
              </div>
              <div className="setting-actions">
                <button className="save-button" onClick={handleGithubSave}>Save Configuration</button>
              </div>
            </div>
          )}

          {activeTab === 'members' && user?.role === 'root' && (
            <div className="settings-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3>Member Management</h3>
                <button onClick={fetchUsers} className="save-button" style={{ padding: '4px 8px', fontSize: '12px' }}>Refresh</button>
              </div>

              {isLoadingUsers ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading members...</div>
              ) : users.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>No members found (or failed to load)</div>
              ) : (
                <div className="members-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {users.sort((a, b) => {
                    const order: Record<string, number> = { 'root': 0, 'subscriber': 1, 'user': 2 };
                    return (order[a.role] ?? 99) - (order[b.role] ?? 99);
                  }).map(u => (
                    <div key={u.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                          {u.full_name ? u.full_name : u.username}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                          {u.full_name && (
                            <>
                              <span style={{ opacity: 0.8 }}>@{u.username}</span>
                              <span style={{ margin: '0 6px', opacity: 0.3 }}>|</span>
                            </>
                          )}
                          {u.email}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <CustomDropdown
                          value={u.role}
                          // 루트 권한은 DB에서만 부여 가능하도록 UI 옵션에서 제외 (단, 이미 root인 경우 표시 유지를 위해 포함)
                          options={u.role === 'root' ? ['root', 'subscriber', 'user'] : ['subscriber', 'user']}
                          onChange={(val) => handleRoleChange(u.email, val)}
                          disabled={u.email === user.email}
                        />

                        {/* Delete Button */}
                        {u.email !== user.email && (
                          <button
                            onClick={() => setDeleteConfirmUser(u)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid rgba(255, 82, 82, 0.3)',
                              background: 'rgba(255, 82, 82, 0.1)',
                              color: '#ff5252',
                              cursor: 'pointer',
                              fontSize: '13px',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 82, 82, 0.2)';
                              e.currentTarget.style.borderColor = 'rgba(255, 82, 82, 0.5)';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 82, 82, 0.1)';
                              e.currentTarget.style.borderColor = 'rgba(255, 82, 82, 0.3)';
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirmUser && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }} onClick={() => setDeleteConfirmUser(null)}>
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '24px',
              width: '320px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              textAlign: 'center'
            }} onClick={e => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 12px 0', color: '#ff5252' }}>Delete User</h3>
              <p style={{ margin: '0 0 24px 0', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
                Are you sure you want to delete <strong>{deleteConfirmUser.username}</strong>?<br />
                This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => setDeleteConfirmUser(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!token || !backendUrl || !deleteConfirmUser) return;
                    try {
                      const result = await window.electron.auth.deleteUser(backendUrl, token, deleteConfirmUser.email);
                      if (result.success) {
                        setUsers(prev => prev.filter(user => user.email !== deleteConfirmUser.email));
                        showToast(`User ${deleteConfirmUser.username} deleted`);
                      } else {
                        showToast(result.error || 'Failed to delete user');
                      }
                    } catch (e) {
                      showToast('Error deleting user');
                    }
                    setDeleteConfirmUser(null);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#ff5252',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {toastMessage && (
          <div style={{
            position: 'absolute',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            color: '#e0e0e0',
            padding: '10px 24px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            border: '1px solid rgba(187, 134, 252, 0.3)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
            zIndex: 9999,
            animation: 'fadeIn 0.2s ease',
            whiteSpace: 'nowrap',
          }}>
            ✓ {toastMessage}
          </div>
        )}

        {/* 푸터: 취소 및 적용 버튼 */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          background: 'var(--bg-tertiary)'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            Cancel
          </button>
          <button
            onClick={handleApplyAll}
            className="save-button"
            style={{
              padding: '6px 24px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            Apply
          </button>
        </div>

      </div>
    </div >
  );
}

export default SettingsPanel;
