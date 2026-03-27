import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { XIcon, SettingsIcon } from './Icons';
import { KeyBinding, DEFAULT_SHORTCUTS } from '../types/shortcuts';
import { EditorSettings, DEFAULT_EDITOR_SETTINGS } from '../types/settings';
import { AIProvider } from '../types';
import { DEFAULT_MODELS, PROVIDER_MODELS } from '../services/api';
import '../styles/SettingsPanel.css';
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
          border: '1px solid var(--border-color)',
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
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
                onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
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
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          color: 'var(--text-primary)',
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
        color: 'var(--text-primary)',
        fontVariantNumeric: 'tabular-nums'
      }}>
        {value}
      </div>
      <button
        onClick={handleIncrement}
        style={{
          width: '28px', height: '28px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          color: 'var(--text-primary)',
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

type SettingsTab = 'editor' | 'github' | 'shortcuts' | 'connection';
function SettingsPanel({ onClose, onOpenSettingsJson, onApply }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('editor');
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(DEFAULT_EDITOR_SETTINGS);
  const [githubSettings, setGithubSettings] = useState({
    username: '',
    token: ''
  });

  const [shortcuts, setShortcuts] = useState<KeyBinding[]>(DEFAULT_SHORTCUTS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const ALL_PROVIDERS: AIProvider[] = ['anthropic', 'gemini', 'openai', 'local'];
  const [aiProvider, setAiProvider] = useState<AIProvider>('anthropic');
  const [providerKeys, setProviderKeys] = useState<Record<AIProvider, string>>({ anthropic: '', gemini: '', openai: '', local: '' });
  const [providerModels, setProviderModels] = useState<Record<AIProvider, string>>({ ...DEFAULT_MODELS });
  const [localUrl, setLocalUrl] = useState('http://localhost:11434');
  const [showKey, setShowKey] = useState(false);

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

      // Load AI provider config
      const prov = await window.electron.store.get('ai_provider');
      const activeProvider: AIProvider = (prov.success && prov.value ? String(prov.value) : 'anthropic') as AIProvider;
      setAiProvider(activeProvider);

      const keys: Record<AIProvider, string> = { anthropic: '', gemini: '', openai: '', local: '' };
      const models: Record<AIProvider, string> = { ...DEFAULT_MODELS };
      for (const p of ['anthropic', 'gemini', 'openai', 'local'] as AIProvider[]) {
        const k = await window.electron.store.get(`ai_${p}_key`);
        if (k.success && k.value) keys[p] = String(k.value);
        const m = await window.electron.store.get(`ai_${p}_model`);
        if (m.success && m.value) models[p] = String(m.value);
      }
      setProviderKeys(keys);
      setProviderModels(models);
      const u = await window.electron.store.get('ai_local_url');
      if (u.success && u.value) setLocalUrl(String(u.value));

    };
    loadSettings();
  }, []);

  const handleConnectionSave = async () => {
    await window.electron.store.set('ai_provider', aiProvider);
    for (const p of ALL_PROVIDERS) {
      await window.electron.store.set(`ai_${p}_key`, providerKeys[p].trim());
      await window.electron.store.set(`ai_${p}_model`, providerModels[p]);
    }
    await window.electron.store.set('ai_local_url', localUrl.trim());
    window.dispatchEvent(new CustomEvent('ai-settings-changed'));
    showToast('AI settings saved.');
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
    showToast('GitHub settings saved.');
  };

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

        </div>

        {/* 콘텐츠 */}
        <div className="settings-content">
          {activeTab === 'connection' && (
            <div className="settings-section">
              <h3>AI Connection</h3>

              {/* 프로바이더 선택 카드 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px', marginBottom: '20px' }}>
                {([
                  { id: 'local',     label: 'Local AI', sub: 'Ollama / LM Studio' },
                  { id: 'anthropic', label: 'Claude',   sub: 'Anthropic' },
                  { id: 'gemini',    label: 'Gemini',   sub: 'Google' },
                  { id: 'openai',    label: 'ChatGPT',  sub: 'OpenAI' },
                ] as { id: AIProvider; label: string; sub: string }[]).map(({ id, label, sub }) => (
                  <div
                    key={id}
                    onClick={() => { setAiProvider(id); setShowKey(false); }}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      border: `2px solid ${aiProvider === id ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                      background: aiProvider === id ? 'var(--bg-hover)' : 'var(--bg-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '14px', color: aiProvider === id ? 'var(--accent-blue)' : 'var(--text-primary)' }}>{label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{sub}</div>
                  </div>
                ))}
              </div>

              {/* 선택된 프로바이더 설정 */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '20px',
              }}>
                {/* Local AI: URL 필드 */}
                {aiProvider === 'local' && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>Base URL</label>
                    <input
                      type="text"
                      value={localUrl}
                      onChange={(e) => setLocalUrl(e.target.value)}
                      placeholder="http://localhost:11434"
                      style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '7px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                )}

                {/* API Key (Local 제외) */}
                {aiProvider !== 'local' && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>API Key</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={providerKeys[aiProvider]}
                        onChange={(e) => setProviderKeys(prev => ({ ...prev, [aiProvider]: e.target.value }))}
                        placeholder={`${aiProvider === 'anthropic' ? 'sk-ant-...' : aiProvider === 'gemini' ? 'AIza...' : 'sk-...'}`}
                        style={{ width: '100%', padding: '9px 40px 9px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '7px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(p => !p)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 0 }}
                        tabIndex={-1}
                      >
                        {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* 모델 선택 */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>Model</label>
                  {PROVIDER_MODELS[aiProvider].length > 0 ? (
                    <select
                      value={providerModels[aiProvider]}
                      onChange={(e) => setProviderModels(prev => ({ ...prev, [aiProvider]: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '7px', color: 'var(--text-primary)', fontSize: '13px', cursor: 'pointer' }}
                    >
                      {PROVIDER_MODELS[aiProvider].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={providerModels[aiProvider]}
                      onChange={(e) => setProviderModels(prev => ({ ...prev, [aiProvider]: e.target.value }))}
                      placeholder="llama3, mistral, codellama ..."
                      style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '7px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleConnectionSave}
                    style={{ background: 'var(--accent-blue)', border: 'none', borderRadius: '7px', padding: '9px 20px', color: 'white', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                    onMouseDown={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseUp={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    Save
                  </button>
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
                  options={['modern-white', 'modern-dark', 'tokyo-night']}
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
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
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
                  placeholder=""
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
                  placeholder=""
                  className="input-password"
                />
              </div>
              <div className="setting-actions">
                <button className="save-button" onClick={handleGithubSave}>Save Configuration</button>
              </div>
            </div>
          )}

        </div>

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
            onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
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
