import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChatMessage } from '../types';
import QuarkApi from '../services/api';
import { useAuthStore } from '../store/authStore';
import { SendIcon, PaperclipIcon, MicIcon, HistoryIcon, PlusIcon, ChevronUpIcon, ChevronDownIcon, ChatBubbleIcon, InfinityIcon, RotateCcwIcon, TrashIcon } from './Icons';
import MarkdownRenderer from './MarkdownRenderer';
import DiffView from './DiffView';
import '../styles/AIPanel.css';

interface AIPanelProps {
  onClose: () => void;
  projectName?: string;
  workspacePath?: string;
  onFileSystemChange?: () => void;
  onCloseFile?: (filePath: string) => void;
}

interface ChatSession {
  id: string; // filename without extension
  title: string;
  timestamp: number;
}

/**
 * AI 에이전트 패널 (Ctrl+L로 토글)
 */
function AIPanel({ onClose, projectName = 'Gluon', workspacePath, onFileSystemChange, onCloseFile }: AIPanelProps) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('Quark-v2');

  // Session State
  const [sessionId, setSessionId] = useState<string>(() => Date.now().toString());
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);

  // AI 모드 상태 (Ask, Agent)
  const [aiMode, setAiMode] = useState<'Ask' | 'Agent'>('Ask');

  // Dropdown state for floating menu
  const [activeDropdown, setActiveDropdown] = useState<'mode' | 'model' | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const [selectedDiff, setSelectedDiff] = useState<{ path: string, original: string, modified: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeAssistantIdRef = useRef<string | null>(null);

  // 로딩 경과 시간 (초)
  const [loadingSeconds, setLoadingSeconds] = useState(0);

  // 로딩 경과 시간 타이머
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isLoading) {
      setLoadingSeconds(0);
      timer = setInterval(() => {
        setLoadingSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isLoading]);

  // Handle Logout: Clear messages if user logs out
  useEffect(() => {
    if (!user) {
      setMessages([]);
      setSessionId(Date.now().toString());
    }
  }, [user]);

  // Initialize Chat & Migrate
  useEffect(() => {
    const initChat = async () => {
      try {
        const homeDir = await window.electron.app.getPath('home');
        const chatDir = `${homeDir}/.gluon/chats`;

        // Ensure directory exists
        const dirCheck = await window.electron.fs.exists(chatDir);
        if (!dirCheck.exists) {
          await window.electron.fs.createDir(chatDir);
        }

        // Migration: check for 'last_session.json'
        const legacyPath = `${chatDir}/last_session.json`;
        const legacyCheck = await window.electron.fs.exists(legacyPath);

        if (legacyCheck.exists) {
          const legacyContent = await window.electron.fs.readFile(legacyPath);
          if (legacyContent.success && legacyContent.content) {
            const newId = Date.now().toString();
            const newPath = `${chatDir}/${newId}.json`;
            await window.electron.fs.writeFile(newPath, legacyContent.content);
            await window.electron.fs.delete(legacyPath);
            console.log('Migrated legacy chat to', newId);
            setSessionId(newId);

            // Initial Load
            const parsed = JSON.parse(legacyContent.content);
            const hydrated = parsed.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }));
            setMessages(hydrated);
          }
        } else {
          // Load most recent session if available? 
          // For now, let's start fresh. Or we can list files and load latest.
          // Let's load the *Last Active* session ID from store if we had one.
          // Since we don't track last active ID yet, we start fresh or load latest file.

          // Let's load list to sort.
          loadHistoryList();
        }

      } catch (err) {
        console.error('Failed to initialize chat storage:', err);
      }
    };
    initChat();
  }, []);

  // helper to load list
  const loadHistoryList = async () => {
    try {
      const homeDir = await window.electron.app.getPath('home');
      const chatDir = `${homeDir}/.gluon/chats`;
      const result = await window.electron.fs.readDir(chatDir);

      if (result.success && result.files) {
        const sessions: ChatSession[] = [];

        for (const file of result.files) {
          if (!file.name.endsWith('.json') || file.name === 'last_session.json') continue;

          const id = file.name.replace('.json', '');
          const timestamp = parseInt(id) || 0; // if id is timestamp

          // To get title, we have to read the file. This might be slow for many files.
          // Optimization: Store title in separate index or filename.
          // For now, read content (MVP).
          let title = "New Chat";
          try {
            // Peek content? No generic 'peek'. Read whole file.
            // Warning: Performance hit if many files.
            const content = await window.electron.fs.readFile(file.path);
            if (content.success && content.content) {
              const data = JSON.parse(content.content);
              if (data.length > 0) {
                const first = data.find((m: any) => m.role === 'user');
                if (first) {
                  title = first.content.substring(0, 30) + (first.content.length > 30 ? '...' : '');
                } else {
                  title = "Empty Chat";
                }
              }
            }
          } catch (e) { /* ignore */ }

          sessions.push({ id, title, timestamp });
        }

        // Sort DESC
        sessions.sort((a, b) => b.timestamp - a.timestamp);
        setChatHistory(sessions);
      }
    } catch (e) {
      console.error('Failed load history list', e);
    }
  };

  // Toggle History Panel
  const toggleHistory = async () => {
    if (!showHistory) {
      await loadHistoryList();
    }
    setShowHistory(!showHistory);
  };

  // Delete session - 모달 트리거
  const handleDeleteSession = (e: React.MouseEvent, sid: string) => {
    e.stopPropagation();
    setDeleteSessionId(sid);
  };

  // 실제 삭제 실행
  const doDeleteSession = async () => {
    if (!deleteSessionId) return;
    try {
      const homeDir = await window.electron.app.getPath('home');
      const filePath = `${homeDir}/.gluon/chats/${deleteSessionId}.json`;

      const result = await window.electron.fs.delete(filePath);
      if (result.success) {
        setChatHistory(prev => prev.filter(s => s.id !== deleteSessionId));

        // If deleted current active session
        if (deleteSessionId === sessionId) {
          handleNewChat();
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
    setDeleteSessionId(null);
  };

  // Load specific session
  const handleLoadSession = async (sid: string) => {
    try {
      setSessionId(sid);
      const homeDir = await window.electron.app.getPath('home');
      const filePath = `${homeDir}/.gluon/chats/${sid}.json`;

      const result = await window.electron.fs.readFile(filePath);
      if (result.success && result.content) {
        const parsed = JSON.parse(result.content);
        const hydrated = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(hydrated);
      }
      setShowHistory(false);
    } catch (e) {
      console.error('Failed to load session:', e);
    }
  };

  // Save messages to File System
  useEffect(() => {
    if (!sessionId || messages.length === 0) return;

    const timer = setTimeout(async () => {
      try {
        const homeDir = await window.electron.app.getPath('home');
        const chatDir = `${homeDir}/.gluon/chats`;
        const filePath = `${chatDir}/${sessionId}.json`;

        await window.electron.fs.writeFile(filePath, JSON.stringify(messages, null, 2));
      } catch (err) {
        console.warn('Failed to save chat:', err);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [messages, sessionId]);

  // Handle dropdown etc
  const handleOpenDropdown = (type: 'mode' | 'model', event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (activeDropdown === type) { setActiveDropdown(null); return; }
    const rect = event.currentTarget.getBoundingClientRect();
    const isInitial = messages.length === 0;
    let top = isInitial ? rect.bottom + 4 : rect.top - 4;
    setDropdownPos({ top, left: rect.left });
    setActiveDropdown(type);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.model-dropdown-container') && !target.closest('.model-dropdown-menu-floating')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSend = async (textOverride?: string, hidden: boolean = false) => {
    if (isLoading) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setIsLoading(false);
      return;
    }
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;

    if (!hidden) {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: textToSend,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
    }

    setInput('');
    setIsLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const assistantMessageId = (Date.now() + 1).toString();
    activeAssistantIdRef.current = assistantMessageId;

    try {
      const initialAssistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        model: selectedModel,
      };
      setMessages((prev) => [...prev, initialAssistantMessage]);

      let fullContent = '';
      let systemPrompt: string | undefined;

      if (workspacePath) {
        try {
          const rulesPath = `${workspacePath}/.gluon_rules`;
          const exists = await window.electron.fs.exists(rulesPath);
          if (exists.success && exists.exists) {
            const rulesContent = await window.electron.fs.readFile(rulesPath);
            if (rulesContent.success && rulesContent.content) {
              systemPrompt = rulesContent.content;
            }
          }
        } catch (err) { console.warn('Failed to load rules', err); }
      }

      // Filter history: only user and assistant, remove internal fields if needed
      const history = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));

      for await (const chunk of QuarkApi.chatStream(textToSend, selectedModel, abortController.signal, aiMode, workspacePath, systemPrompt, history)) {
        fullContent += chunk;
        setMessages((prev) => prev.map(msg => msg.id === assistantMessageId ? { ...msg, content: fullContent } : msg));
      }
    } catch (error: any) {
      if (error.name !== 'AbortError' && !error.message?.includes('aborted')) {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'system',
          content: `오류: ${error.message}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } else {
        // Abort: remove empty messages, mark partial ones as cancelled
        setMessages((prev) => prev
          .filter(msg => !(msg.id === assistantMessageId && !msg.content?.trim()))
          .map(msg => msg.id === assistantMessageId && msg.content?.trim()
            ? { ...msg, content: msg.content + '\n\n_(생성 중단됨)_' }
            : msg
          ));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
      activeAssistantIdRef.current = null;
      if (onFileSystemChange) onFileSystemChange();

      // Remove any remaining empty assistant messages
      setMessages((prev) => prev.filter(msg =>
        !(msg.id === assistantMessageId && !msg.content?.trim())
      ));
    }
  };

  // NEW CHAT
  const handleNewChat = () => {
    setSessionId(Date.now().toString());
    setMessages([]);
    setInput('');
    setShowHistory(false); // Make sure we leave history view
  };

  const handleRunCode = (code: string) => {
    handleSend(`Execute this command:\n\`\`\`\n${code}\n\`\`\``);
  };

  const handleApproveAction = (toolName: string) => {
    let pendingJson = '';

    // 1. Update UI: Remove the approval button from the latest assistant message
    setMessages(prev => {
      const newMessages = [...prev];
      for (let i = newMessages.length - 1; i >= 0; i--) {
        if (newMessages[i].role === 'assistant' && newMessages[i].content?.includes(`[[APPROVE_ACTION:${toolName}]]`)) {

          // Extract PENDING JSON if exists
          const match = newMessages[i].content?.match(/<!-- PENDING:(.*?) -->/);
          if (match) {
            try {
              const b64 = match[1];
              pendingJson = atob(b64);
            } catch (e) {
              console.error("Failed to decode pending action", e);
            }
          }

          // Clean up the message: remove PENDING comment + replace approval tag with styled marker
          let cleaned = newMessages[i].content || '';
          cleaned = cleaned.replace(/<!--\s*PENDING:[^>]*-->\n?/g, '');  // Strip PENDING comment
          cleaned = cleaned.replace(
            new RegExp(`\\[\\[APPROVE_ACTION:${toolName}\\]\\]`, 'g'),
            '[[APPROVED]]'
          );
          newMessages[i] = { ...newMessages[i], content: cleaned };
          break;
        }
      }
      return newMessages;
    });

    // 2. Send hidden message to server
    if (pendingJson) {
      handleSend(`Approved. Execute this tool JSON immediately:\n\`\`\`json\n${pendingJson}\n\`\`\``, true);
    } else {
      handleSend(`Approved to run ${toolName}`, true);
    }
  };

  const handleAcceptFile = async (_fullPath: string, contentB64?: string, relativePath?: string) => {
    // Write file content locally (essential for remote clients, harmless for local)
    if (contentB64 && relativePath && workspacePath) {
      try {
        const fileContent = atob(contentB64);
        const localPath = `${workspacePath}/${relativePath}`;
        await window.electron.fs.writeFile(localPath, fileContent);
      } catch (err) {
        console.error('Failed to write file locally:', err);
      }
    }
    if (onFileSystemChange) onFileSystemChange();
  };

  const handleRejectFile = async (fullPath: string, backup: string, isNew: boolean) => {
    try {
      if (isNew) {
        // New file → delete it and close its tab
        await window.electron.fs.delete(fullPath);
        if (onCloseFile) onCloseFile(fullPath);
      } else if (backup) {
        // Modified file → restore original from base64 backup
        const originalContent = atob(backup);
        await window.electron.fs.writeFile(fullPath, originalContent);
      }
      if (onFileSystemChange) onFileSystemChange();
    } catch (err) {
      console.error('Failed to reject file change:', err);
    }
  };

  const handleViewDiff = async (fullPath: string) => {
    if (!workspacePath) return;
    try {
      // Calculate relative path for git command
      const relativePath = fullPath.startsWith(workspacePath)
        ? fullPath.replace(workspacePath, '').replace(/^\//, '') // Remove leading slash
        : fullPath;

      const [diffResult, fileResult] = await Promise.all([
        window.electron.git.diff(workspacePath, relativePath),
        window.electron.fs.readFile(fullPath)
      ]);

      const original = diffResult.success ? diffResult.original : '';
      const modified = fileResult.success ? (fileResult.content || '') : '';

      setSelectedDiff({ path: relativePath, original, modified });
    } catch (err) {
      console.error('Failed to diff file:', err);
    }
  };

  const renderFloatingDropdown = () => {
    if (!activeDropdown) return null;
    const isInitial = messages.length === 0;
    const style: React.CSSProperties = {
      position: 'fixed',
      left: dropdownPos.left,
      zIndex: 99999,
      minWidth: '140px',
      maxHeight: '200px',
      overflowY: 'auto',
      backgroundColor: '#1e1e1e',
      border: '1px solid #333',
      borderRadius: '6px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
      padding: '4px',
      animation: 'fadeIn 0.1s ease-out',
      top: isInitial ? dropdownPos.top : undefined,
      transform: isInitial ? undefined : 'translateY(-100%)',
    };
    if (!isInitial) style.top = dropdownPos.top;

    return createPortal(
      <div className="model-dropdown-menu-floating" style={style} onClick={(e) => e.stopPropagation()}>
        {activeDropdown === 'mode' && (
          <>
            <div className={`model-dropdown-item mode-ask ${aiMode === 'Ask' ? 'selected' : ''}`} onClick={() => { setAiMode('Ask'); setActiveDropdown(null); }}>
              <ChatBubbleIcon size={16} /> <span style={{ marginLeft: 8 }}>Ask</span>
            </div>
            <div className={`model-dropdown-item mode-agent ${aiMode === 'Agent' ? 'selected' : ''}`} onClick={() => { setAiMode('Agent'); setActiveDropdown(null); }}>
              <InfinityIcon size={16} /> <span style={{ marginLeft: 8 }}>Agent</span>
            </div>
          </>
        )}
        {activeDropdown === 'model' && (
          <>
            <div className={`model-dropdown-item ${selectedModel === 'Quark-v2' ? 'selected' : ''}`} onClick={() => { setSelectedModel('Quark-v2'); setActiveDropdown(null); }}>Quark v2</div>
          </>
        )}
      </div>, document.body
    );
  };

  const renderInputArea = () => {
    // [RESTRICTION] Block 'user' role
    if (user?.role === 'user') {
      return (
        <div className="ai-input-area" style={{ borderTop: 'none', padding: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px' }}>
          <div style={{
            textAlign: 'center',
            padding: '24px',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            background: 'var(--bg-secondary)',
            maxWidth: '400px',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <h3 style={{
              fontSize: '15px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              margin: 0
            }}>
              승인 대기중 (Waiting for Approval)
            </h3>
          </div>
        </div>
      );
    }

    const isInitial = messages.length === 0;
    const DropdownIcon = isInitial ? ChevronDownIcon : ChevronUpIcon;
    return (
      <div className="ai-input-area" style={isInitial ? { borderTop: 'none', padding: 0 } : {}}>
        <div style={isInitial ? { width: '100%', maxWidth: '600px', margin: '0 auto' } : { width: '100%' }}>
          <div className="ai-input-box">
            <textarea
              className="ai-input-field"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={isInitial ? "무엇이든 물어보세요..." : `${aiMode} anything (Ctrl+L), @ to mention...`}
              disabled={isLoading}
              rows={isInitial ? 3 : 2}
              autoFocus
            />
            <div className="ai-input-footer">
              <div className="ai-input-footer-left">
                <div className="model-dropdown-container ai-mode-dropdown-container" style={{ marginRight: '2px' }}>
                  <button className={`ai-model-select mode-${aiMode.toLowerCase()}`} onClick={(e) => !isLoading && handleOpenDropdown('mode', e)} disabled={isLoading} style={{ minWidth: '50px' }}>
                    {aiMode === 'Ask' && <ChatBubbleIcon size={16} />}
                    {aiMode === 'Agent' && <InfinityIcon size={16} />}
                    <DropdownIcon size={12} className={`arrow ${activeDropdown === 'mode' ? 'open' : ''}`} />
                  </button>
                </div>
                <div className="model-dropdown-container">
                  <button className="ai-model-select" onClick={(e) => !isLoading && handleOpenDropdown('model', e)} disabled={isLoading}>
                    <span>{selectedModel}</span>
                    <DropdownIcon size={12} className={`arrow ${activeDropdown === 'model' ? 'open' : ''}`} />
                  </button>
                </div>
              </div>
              <div className="ai-input-footer-right">
                <button className="ai-toolbar-btn" title="Add Context (+)" onClick={() => console.log('File add')}><PaperclipIcon size={16} /></button>
                <button className="ai-toolbar-btn" title="Voice Input"><MicIcon size={16} /></button>
                <button className="ai-send-btn" onClick={() => handleSend()} disabled={!isLoading && !input.trim()} title={isLoading ? "Stop" : "Send"}>
                  {isLoading ? <div style={{ width: '10px', height: '10px', backgroundColor: 'white', borderRadius: '2px' }} /> : <SendIcon size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };



  // Header Logic
  let headerTitle = "";
  if (messages.length > 0) {
    const firstUserMessage = messages.find(msg => msg.role === 'user');
    if (firstUserMessage) {
      headerTitle = firstUserMessage.content.substring(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '');
    } else { headerTitle = "새로운 대화"; }
  }

  // Render History List (In-Place)
  const renderHistoryView = () => (
    <div className="history-view-container">
      <div style={{ padding: '0 var(--spacing-md)', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', margin: '16px 0 8px 0' }}>Chat History</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Select a conversation to continue</p>
      </div>

      <div className="history-list">
        {chatHistory.length === 0 ? (
          <div className="history-empty">
            <HistoryIcon size={48} style={{ opacity: 0.2 }} />
            <p>No chat history found</p>
          </div>
        ) : (
          chatHistory.map(session => (
            <div
              key={session.id}
              className={`history-item ${session.id === sessionId && !showHistory ? 'active' : ''}`} // Active logic
              onClick={() => handleLoadSession(session.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div className="history-title" style={{ flex: 1 }}>{session.title}</div>
                <button
                  onClick={(e) => handleDeleteSession(e, session.id)}
                  title="Delete"
                  className="history-delete-btn"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    opacity: 0.6,
                    transition: 'opacity 0.2s, color 0.2s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#e74c3c'; }}
                  onMouseOut={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <TrashIcon size={14} />
                </button>
              </div>
              <div className="history-date">
                <span>{new Date(session.timestamp).toLocaleDateString()} {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="ai-panel">
      {/* Header */}
      <div className="ai-panel-header">
        <div className="ai-panel-title">
          <h3 style={{
            fontSize: '13px',
            fontWeight: '500',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '300px',
            color: 'rgba(255, 255, 255, 0.7)',
            letterSpacing: '0.2px',
          }}>
            {showHistory ? 'History' : headerTitle}
          </h3>
        </div>
        <div className="ai-header-actions">
          {user && (
            <>
              <button className="icon-button" onClick={() => { handleNewChat(); }} title="New Chat">
                <PlusIcon size={16} />
              </button>
              <button
                className="icon-button"
                onClick={toggleHistory}
                title="History"
                style={showHistory ? { color: 'var(--text-primary)', backgroundColor: 'var(--bg-hover)' } : {}}
              >
                <HistoryIcon size={16} />
              </button>
            </>
          )}
          <button className="close-button" onClick={onClose} title="Close (Ctrl+L)">
            ✕
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {showHistory ? renderHistoryView() : (
        messages.length === 0 ? (
          // Empty State Layout
          // Empty State Layout
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 20px', gap: '24px', marginTop: '-40px' }}>
            <div style={{ width: '100%', maxWidth: '600px' }}>
              {user ? (
                <>
                  {user.role !== 'user' && (
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                      <h2 className={`hello-greeting ${user.role === 'root' ? 'root-anim' : ''}`}>
                        Hello, {user.full_name?.split(' ')[0] || 'Captain'}
                      </h2>
                      <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '14px' }}>
                        How can I facilitate your coding journey?
                      </p>
                    </div>
                  )}
                  {renderInputArea()}
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'var(--bg-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <InfinityIcon size={32} style={{ color: 'var(--accent-blue)' }} />
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', opacity: 0.7, textAlign: 'center' }}>
                    로그인이 필요합니다
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Active Chat Layout
          <>
            <div className="ai-messages">
              {messages.map((message) => {
                // Skip empty assistant messages (stale from cancellation)
                if (message.role === 'assistant' && !message.content?.trim() && message.id !== activeAssistantIdRef.current) return null;
                return (
                  <div key={message.id} className={`ai-message ai-message-${message.role}`}>
                    {message.role === 'assistant' && !message.content && isLoading && message.id === activeAssistantIdRef.current ? (
                      <div className="ai-message-content ai-thinking-wave">
                        <span className="wave-dot"></span>
                        <span className="wave-dot"></span>
                        <span className="wave-dot"></span>
                        <span className="loading-timer">thinking {loadingSeconds}s</span>
                      </div>
                    ) : (
                      <div className="ai-message-content group">
                        <MarkdownRenderer
                          content={message.content || ''}
                          onRunCode={!isLoading && aiMode === 'Agent' ? handleRunCode : undefined}
                          onApprove={!isLoading ? handleApproveAction : undefined}
                          onAcceptFile={handleAcceptFile}
                          onRejectFile={handleRejectFile}
                          onUpdateContent={(newContent: string) => {
                            setMessages(prev => prev.map(msg =>
                              msg.id === message.id ? { ...msg, content: newContent } : msg
                            ));
                          }}
                          onViewDiff={handleViewDiff}
                        />
                        {message.role === 'user' && !isLoading && (
                          <button className="resend-button" onClick={() => handleSend(message.content)} title="Resend"><RotateCcwIcon size={12} /></button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            {renderInputArea()}
          </>
        )
      )}

      {/* Floating Dropdown (Always rendered but conditional logic inside handles visibility) */}
      {renderFloatingDropdown()}

      {/* 대화 삭제 확인 모달 */}
      {deleteSessionId && (
        <div className="modal-overlay" onClick={() => setDeleteSessionId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>대화 삭제</h3>
            <p>이 대화를 삭제하시겠습니까?</p>
            <div className="modal-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="modal-btn cancel" onClick={() => setDeleteSessionId(null)}>취소</button>
              <button className="modal-btn delete" onClick={doDeleteSession}>삭제</button>
            </div>
          </div>
        </div>
      )}

      {selectedDiff && (
        <div className="modal-overlay" style={{ zIndex: 99999 }} onClick={() => setSelectedDiff(null)}>
          <div className="git-diff-content" onClick={e => e.stopPropagation()} style={{
            width: '90vw',
            height: '90vh',
            maxWidth: 'none',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '6px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
          }}>
            <div className="git-diff-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 16px',
              borderBottom: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)'
            }}>
              <h4 style={{ margin: 0, fontSize: '14px' }}>{selectedDiff.path}</h4>
              <button onClick={() => setSelectedDiff(null)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '16px', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="git-diff-body" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
              <DiffView
                original={selectedDiff.original}
                modified={selectedDiff.modified}
                language={selectedDiff.path.split('.').pop() || 'text'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIPanel;
