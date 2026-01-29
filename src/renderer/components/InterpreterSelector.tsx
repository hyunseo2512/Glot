import React, { useEffect, useState } from 'react';
import '../styles/InterpreterSelector.css';

interface InterpreterSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (path: string) => void;
    currentPath?: string;
    workspaceDir?: string;
}

export const InterpreterSelector: React.FC<InterpreterSelectorProps> = ({
    isOpen,
    onClose,
    onSelect,
    currentPath,
    workspaceDir
}) => {
    const [interpreters, setInterpreters] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadInterpreters();
        }
    }, [isOpen]);

    const [error, setError] = useState<string | null>(null);

    const loadInterpreters = async () => {
        setLoading(true);
        setError(null);
        try {
            const electron = window.electron as any;
            const result = await electron.env.scanPython(workspaceDir || '.');
            setInterpreters(result);
        } catch (e: any) {
            console.error('Failed to scan interpreters', e);
            setError(e.message || 'Failed to scan python environments');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="interpreter-selector-overlay" onClick={onClose}>
            <div className="interpreter-selector-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Select Interpreter</h3>
                    <button className="refresh-btn" onClick={loadInterpreters} disabled={loading}>
                        ↻
                    </button>
                </div>

                <div className="interpreter-list">
                    {loading ? (
                        <div className="loading-item">Scanning for Python environments...</div>
                    ) : error ? (
                        <div className="empty-item" style={{ color: '#f07178' }}>{error}</div>
                    ) : interpreters.length === 0 ? (
                        <div className="empty-item">No Python interpreters found.</div>
                    ) : (
                        interpreters.map((env, idx) => (
                            <div
                                key={idx}
                                className={`interpreter-item ${env.path === currentPath ? 'selected' : ''}`}
                                onClick={() => {
                                    onSelect(env.path);
                                    onClose();
                                }}
                            >
                                <div className="env-info">
                                    <span className="env-version">Python {env.version}</span>
                                    <span className="env-type">{env.isSystem ? 'System' : 'Virtual Env'}</span>
                                </div>
                                <div className="env-path">{env.path}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
