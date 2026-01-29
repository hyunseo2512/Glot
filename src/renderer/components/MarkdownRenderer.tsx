import React from 'react';
import MonacoCodeBlock from './MonacoCodeBlock';


interface FileChangeMeta {
    path: string;
    fullPath: string;
    added: number;
    removed: number;
    isNew: boolean;
    backup: string;
    content?: string;
    status?: 'pending' | 'accepted' | 'rejected';
}

interface MarkdownRendererProps {
    content: string;
    onRunCode?: (code: string) => void;
    onApprove?: (toolName: string) => void;
    onAcceptFile?: (fullPath: string, contentB64?: string, relativePath?: string) => void;
    onRejectFile?: (fullPath: string, backup: string, isNew: boolean) => void;
    onUpdateContent?: (newContent: string) => void;
    onViewDiff?: (fullPath: string) => void;
}

/**
 * A lightweight Markdown renderer
 * Handles:
 * - Code blocks (```code```)
 * - Inline code (`code`)
 * - Bold (**text**)
 * - Headers (#, ##, ###)
 * - Unordered lists (- item)
 * - Agent Actions (**Action**)
 */
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, onRunCode, onApprove, onAcceptFile, onRejectFile, onUpdateContent, onViewDiff }) => {
    if (!content) return null;

    // DeepSeek R1의 <think>...</think> 태그 및 메타 태그 제거
    let cleanedContent = content
        .replace(/<think>[\s\S]*?<\/think>/gi, '')  // <think>...</think> 태그 제거
        .replace(/🧠\s*\(deepseek[^)]*\)/gi, '')    // 🧠 (deepseek...) 패턴 제거
        .replace(/\(deepseek[^)]*\)/gi, '')         // (deepseek...) 패턴 제거
        .replace(/<!--\s*PENDING:[^>]*-->/g, '')    // <!-- PENDING:base64 --> 숨김
        .replace(/\[\[FILE_META:.*?\]\]/g, '')      // [[FILE_META:...]] 숨김
        .replace(/\[\[(?:FILE_CHANGE|FILE_META|APPROVE_ACTION):[^\]]*$/gm, '')  // 미완성 마커 제거
        .trim();

    // Split by code blocks first to avoid parsing markdown inside code blocks
    const parts = cleanedContent.split(/(```[\s\S]*?```)/g);

    return (
        <div className="markdown-content">
            {parts.map((part, index) => {
                // If it's a code block
                if (part.startsWith('```') && part.endsWith('```')) {
                    // Match code block with any language identifier (including spaces or attributes)
                    const match = part.match(/```([^\n]*)\n([\s\S]*?)```/);
                    if (match) {
                        const rawLanguage = match[1] || '';
                        // Extract first word as language, handle empty case
                        const language = rawLanguage.trim().split(/\s+/)[0] || 'text';
                        const code = match[2];

                        return (
                            <div key={index} className="code-block-container">
                                <div className="code-block-header">
                                    <span className="code-language">{language || 'text'}</span>
                                    <div className="code-block-actions">
                                        {onRunCode && (language.toLowerCase() === 'sh' || language.toLowerCase() === 'bash' || language.toLowerCase() === 'zsh') && (
                                            <button
                                                className="run-button"
                                                onClick={() => onRunCode(code.trim())}
                                                title="Run in Terminal"
                                                style={{ marginRight: '8px' }}
                                            >
                                                ▶ Run
                                            </button>
                                        )}
                                        <button
                                            className="copy-button"
                                            onClick={() => navigator.clipboard.writeText(code)}
                                            title="Copy code"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </div>
                                <MonacoCodeBlock
                                    code={code.replace(/\n$/, '')}
                                    language={language.toLowerCase()}
                                    style={{
                                        backgroundColor: '#0B0C15',
                                        padding: '1em',
                                        borderRadius: '0 0 6px 6px',
                                    }}
                                />
                            </div>
                        );
                    }
                    // Fallback for empty or malformed blocks
                    return <pre key={index} className="code-block">{part}</pre>;
                }

                // Parse regular markdown for non-code parts
                return <FormattedText key={index} text={part} onApprove={onApprove} onAcceptFile={onAcceptFile} onRejectFile={onRejectFile} onUpdateContent={onUpdateContent} onViewDiff={onViewDiff} rawContent={content} />;
            })}
        </div>
    );
};



interface FormattedTextProps {
    text: string;
    onApprove?: (tool: string) => void;
    onAcceptFile?: (fullPath: string, contentB64?: string, relativePath?: string) => void;
    onRejectFile?: (fullPath: string, backup: string, isNew: boolean) => void;
    onUpdateContent?: (newContent: string) => void;
    onViewDiff?: (fullPath: string) => void;
    rawContent: string;
}

const FormattedText: React.FC<FormattedTextProps> = ({ text, onApprove, onAcceptFile, onRejectFile, onUpdateContent, onViewDiff, rawContent }) => {
    // Process line by line for headers and lists
    const lines = text.split('\n');
    const renderedLines = lines.map((line, i) => {
        // Headers
        if (line.startsWith('### ')) return <h5 key={i}>{parseInline(line.slice(4))}</h5>;
        if (line.startsWith('## ')) return <h4 key={i}>{parseInline(line.slice(3))}</h4>;
        if (line.startsWith('# ')) return <h3 key={i}>{parseInline(line.slice(2))}</h3>;

        // List items
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            return (
                <div key={i} className="list-item">
                    <span className="list-bullet">•</span>
                    <span>{parseInline(line.trim().slice(2))}</span>
                </div>
            );
        }

        // Agent Action Special Styling
        if (line.includes('**Action**:')) {
            return (
                <div key={i} className="agent-action-line" style={{
                    padding: '8px 12px',
                    margin: '4px 0',
                    borderLeft: '3px solid #5B9BD5',
                    backgroundColor: 'rgba(91, 155, 213, 0.08)',
                    borderRadius: '0 6px 6px 0',
                    fontSize: '13px',
                }}>
                    {parseInline(line)}
                </div>
            )
        }

        // Agent Observation Styling
        if (line.includes('**Observation**:')) {
            return (
                <div key={i} style={{
                    padding: '8px 12px',
                    margin: '4px 0',
                    borderLeft: '3px solid #C792EA',
                    backgroundColor: 'rgba(199, 146, 234, 0.08)',
                    borderRadius: '0 6px 6px 0',
                    fontSize: '13px',
                }}>
                    {parseInline(line)}
                </div>
            )
        }

        // Approved indicator
        if (line.includes('[[APPROVED]]')) {
            return (
                <div key={i} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    margin: '4px 0',
                    backgroundColor: 'rgba(199, 146, 234, 0.12)',
                    border: '1px solid rgba(199, 146, 234, 0.3)',
                    borderRadius: '20px',
                    fontSize: '12px',
                    color: '#C792EA',
                }}>
                    ✓ 승인됨
                </div>
            )
        }

        // File Change Card
        if (line.includes('[[FILE_CHANGE:')) {
            const match = line.match(/\[\[FILE_CHANGE:(.*?)\]\]/);
            if (match) {
                try {
                    const meta: FileChangeMeta = JSON.parse(match[1]);
                    const basename = meta.path.split('/').pop() || meta.path;
                    const rawStatus = meta.status;
                    const state = (rawStatus === 'accepted' || rawStatus === 'rejected') ? rawStatus : 'pending';

                    // Helper: update the status in the message content
                    const updateStatus = (newStatus: 'accepted' | 'rejected') => {
                        if (!onUpdateContent) return;
                        const updatedMeta = { ...meta, status: newStatus };
                        const oldMarker = `[[FILE_CHANGE:${match[1]}]]`;
                        const newMarker = `[[FILE_CHANGE:${JSON.stringify(updatedMeta)}]]`;
                        const newContent = rawContent.replace(oldMarker, newMarker);
                        onUpdateContent(newContent);
                    };

                    return (
                        <div key={i} style={{
                            margin: '8px 0',
                            background: 'linear-gradient(135deg, rgba(30, 33, 40, 0.95), rgba(25, 28, 35, 0.9))',
                            border: state === 'accepted' ? '1px solid rgba(199, 146, 234, 0.3)'
                                : state === 'rejected' ? '1px solid rgba(255, 85, 85, 0.3)'
                                    : '1px solid rgba(91, 155, 213, 0.2)',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            transition: 'border-color 0.3s ease',
                        }}>
                            {/* File row */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '10px 14px',
                                gap: '10px',
                            }}>
                                {/* Status dot */}
                                <div style={{
                                    width: '8px', height: '8px', borderRadius: '50%',
                                    backgroundColor: state === 'accepted' ? '#C792EA'
                                        : state === 'rejected' ? '#FF5555'
                                            : '#5B9BD5',
                                    flexShrink: 0,
                                }} />

                                {/* Line counts */}
                                <span style={{ color: '#C792EA', fontSize: '12px', fontFamily: 'monospace', fontWeight: 600, minWidth: '30px' }}>
                                    +{meta.added}
                                </span>
                                <span style={{ color: '#FF5555', fontSize: '12px', fontFamily: 'monospace', fontWeight: 600, minWidth: '25px' }}>
                                    -{meta.removed}
                                </span>

                                {/* File name */}
                                <span style={{ color: '#E0E0E0', fontSize: '13px', fontWeight: 600 }}>
                                    {basename}
                                </span>
                                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {meta.path}
                                </span>

                                {/* Status / Buttons */}
                                {state === 'accepted' && (
                                    <span style={{ color: '#C792EA', fontSize: '12px', fontWeight: 600 }}>✓ 반영됨</span>
                                )}
                                {state === 'rejected' && (
                                    <span style={{ color: '#FF5555', fontSize: '12px', fontWeight: 600 }}>✗ 되돌림</span>
                                )}
                            </div>

                            {/* Footer */}
                            {state === 'pending' && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 14px',
                                    borderTop: '1px solid rgba(255,255,255,0.06)',
                                    backgroundColor: 'rgba(0,0,0,0.15)',
                                }}>
                                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                                        ← {meta.isNew ? '새 파일' : '파일 수정'} · 1 File Changed
                                    </span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => {
                                                updateStatus('rejected');
                                                if (onRejectFile) onRejectFile(meta.fullPath, meta.backup, meta.isNew);
                                            }}
                                            style={{
                                                background: 'rgba(255, 85, 85, 0.12)', color: '#FF5555',
                                                border: '1px solid rgba(255, 85, 85, 0.25)', borderRadius: '6px',
                                                padding: '4px 14px', fontSize: '11px', fontWeight: 600,
                                                cursor: 'pointer', transition: 'all 0.2s ease',
                                            }}
                                            onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(255, 85, 85, 0.25)'; }}
                                            onMouseLeave={e => { (e.target as HTMLElement).style.background = 'rgba(255, 85, 85, 0.12)'; }}
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => {
                                                updateStatus('accepted');
                                                if (onAcceptFile) onAcceptFile(meta.fullPath, meta.content, meta.path);
                                            }}
                                            style={{
                                                background: 'linear-gradient(135deg, #5B9BD5, #7B68EE)', color: '#fff',
                                                border: 'none', borderRadius: '6px',
                                                padding: '5px 14px', fontSize: '11px', fontWeight: 600,
                                                cursor: 'pointer', transition: 'all 0.2s ease',
                                                boxShadow: '0 2px 8px rgba(91, 155, 213, 0.25)',
                                            }}
                                            onMouseEnter={e => { (e.target as HTMLElement).style.boxShadow = '0 4px 16px rgba(91, 155, 213, 0.4)'; }}
                                            onMouseLeave={e => { (e.target as HTMLElement).style.boxShadow = '0 2px 8px rgba(91, 155, 213, 0.25)'; }}
                                        >
                                            Accept
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (onViewDiff) onViewDiff(meta.fullPath);
                                            }}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.1)', color: '#fff',
                                                border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '6px',
                                                padding: '5px 10px', fontSize: '11px', fontWeight: 600,
                                                cursor: 'pointer', transition: 'all 0.2s ease',
                                                marginLeft: '4px'
                                            }}
                                            title="View Diff"
                                        >
                                            Diff
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                } catch { /* ignore parse errors */ }
            }
        }

        // Approval Button
        if (line.includes('[[APPROVE_ACTION:')) {
            const match = line.match(/\[\[APPROVE_ACTION:(.*?)\]\]/);
            if (match) {
                const toolName = match[1];
                return (
                    <div key={i} style={{
                        margin: '6px 0',
                        padding: '8px 12px',
                        background: 'linear-gradient(135deg, rgba(91, 155, 213, 0.08), rgba(199, 146, 234, 0.05))',
                        border: '1px solid rgba(91, 155, 213, 0.2)',
                        borderRadius: '8px',
                        backdropFilter: 'blur(8px)',
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                        }}>
                            <span style={{
                                fontSize: '11px',
                                color: 'rgba(255,255,255,0.55)',
                            }}>
                                실행 전 승인이 필요합니다
                            </span>
                            <button
                                onClick={() => { if (onApprove) onApprove(toolName); }}
                                style={{
                                    background: 'linear-gradient(135deg, #5B9BD5, #7B68EE)',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '4px 14px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    letterSpacing: '0.3px',
                                    boxShadow: '0 2px 8px rgba(91, 155, 213, 0.25)',
                                    transition: 'all 0.2s ease',
                                    whiteSpace: 'nowrap',
                                }}
                                onMouseEnter={e => {
                                    (e.target as HTMLElement).style.boxShadow = '0 3px 14px rgba(91, 155, 213, 0.4)';
                                    (e.target as HTMLElement).style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={e => {
                                    (e.target as HTMLElement).style.boxShadow = '0 2px 8px rgba(91, 155, 213, 0.25)';
                                    (e.target as HTMLElement).style.transform = 'translateY(0)';
                                }}
                            >
                                승인 및 실행
                            </button>
                        </div>
                    </div>
                );
            }
        }

        // Regular paragraph (if empty line, render line break)
        if (line.trim() === '') return <br key={i} />;

        return <div key={i} className="paragraph">{parseInline(line)}</div>;
    });

    return <>{renderedLines}</>;
};

// Helper for inline styles (bold, code, links, images)
const parseInline = (text: string): React.ReactNode[] => {
    // Regex for **bold**, `code`, ![image](url)
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|!\[.*?\]\(.*?\))/g);

    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={index} className="inline-code">{part.slice(1, -1)}</code>;
        }
        if (part.startsWith('![') && part.includes('](') && part.endsWith(')')) {
            const match = part.match(/!\[(.*?)\]\((.*?)\)/);
            if (match) {
                const alt = match[1];
                const src = match[2];
                return (
                    <img
                        key={index}
                        src={src}
                        alt={alt}
                        className="generated-image"
                        style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '10px' }}
                    />
                );
            }
        }
        return part;
    });
};

export default MarkdownRenderer;
