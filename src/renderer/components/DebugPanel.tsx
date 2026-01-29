import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PlayIcon } from './Icons';

interface DebugPanelProps {
    workspaceDir?: string;
    currentFilePath?: string;
    onRun?: () => void;
    onStop?: () => void;
}

type DebugStatus = 'idle' | 'running' | 'stopped';

const DebugPanel: React.FC<DebugPanelProps> = ({ workspaceDir, currentFilePath }) => {
    const [status, setStatus] = useState<DebugStatus>('idle');
    const [output, setOutput] = useState<string[]>([]);
    const [command, setCommand] = useState('');
    const [exitCode, setExitCode] = useState<number | null>(null);
    const [sessionId] = useState(() => `debug-${Date.now()}`);
    const outputRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [output]);

    // Listen for debug output and exit events
    useEffect(() => {
        if (!window.electron?.debug) return;

        const cleanupOutput = window.electron.debug.onOutput((sid: string, data: string) => {
            if (sid === sessionId) {
                setOutput(prev => [...prev, data]);
            }
        });

        const cleanupExit = window.electron.debug.onExit((sid: string, code: number) => {
            if (sid === sessionId) {
                setStatus('stopped');
                setExitCode(code);
            }
        });

        return () => {
            cleanupOutput();
            cleanupExit();
        };
    }, [sessionId]);

    // Listen for custom events from F5 shortcuts
    useEffect(() => {
        const handleDebugRun = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail?.filePath && detail?.cwd) {
                handleRunWithArgs(detail.filePath, detail.cwd);
            }
        };
        const handleDebugStop = () => {
            handleStop();
        };
        window.addEventListener('gluon:debug-run', handleDebugRun);
        window.addEventListener('gluon:debug-stop', handleDebugStop);
        return () => {
            window.removeEventListener('gluon:debug-run', handleDebugRun);
            window.removeEventListener('gluon:debug-stop', handleDebugStop);
        };
    }, []);

    const getFileName = (filePath: string) => {
        return filePath.split('/').pop() || filePath;
    };

    const getFileExtension = (filePath: string) => {
        return filePath.split('.').pop()?.toLowerCase() || '';
    };

    const getRuntimeLabel = (filePath: string) => {
        const ext = getFileExtension(filePath);
        switch (ext) {
            case 'py': return 'Python';
            case 'js': return 'Node.js';
            case 'ts': return 'TypeScript';
            case 'sh': return 'Shell';
            case 'go': return 'Go';
            default: return 'Node.js';
        }
    };

    const handleRunWithArgs = useCallback(async (filePath: string, cwd: string) => {
        if (!window.electron?.debug) return;

        setOutput([]);
        setExitCode(null);
        setStatus('running');

        const result = await window.electron.debug.run(sessionId, filePath, cwd);
        if (result.success) {
            setCommand(result.command || '');
        } else {
            setOutput([`Failed to start: ${result.error}\n`]);
            setStatus('stopped');
            setExitCode(-1);
        }
    }, [sessionId]);

    const handleRun = useCallback(async () => {
        if (!currentFilePath || !workspaceDir) return;
        await handleRunWithArgs(currentFilePath, workspaceDir);
    }, [currentFilePath, workspaceDir, handleRunWithArgs]);

    const handleStop = useCallback(async () => {
        if (!window.electron?.debug) return;
        await window.electron.debug.stop(sessionId);
    }, [sessionId]);

    const handleClear = () => {
        setOutput([]);
        setExitCode(null);
        if (status === 'stopped') setStatus('idle');
    };

    // Status indicator
    const getStatusColor = () => {
        switch (status) {
            case 'running': return '#4CAF50';
            case 'stopped': return exitCode === 0 ? '#4CAF50' : '#f44336';
            default: return 'var(--text-secondary)';
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'running': return '실행 중...';
            case 'stopped': return exitCode === 0 ? '완료' : `종료 (코드: ${exitCode})`;
            default: return '대기';
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
                padding: '8px 12px',
                borderBottom: '1px solid var(--border-color)',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
                letterSpacing: '0.5px'
            }}>
                Run and Debug
            </div>

            {!workspaceDir ? (
                <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    color: 'var(--text-secondary)',
                    fontSize: '12px'
                }}>
                    <p>폴더를 열어 디버깅을 시작하세요.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    {/* Controls */}
                    <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)' }}>
                        {/* Current file info */}
                        {currentFilePath && (
                            <div style={{
                                fontSize: '11px',
                                color: 'var(--text-secondary)',
                                marginBottom: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <span style={{
                                    color: getStatusColor(),
                                    fontSize: '8px'
                                }}>●</span>
                                <span>{getFileName(currentFilePath)}</span>
                                <span style={{ opacity: 0.5 }}>({getRuntimeLabel(currentFilePath)})</span>
                            </div>
                        )}

                        {/* Run / Stop buttons */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {status !== 'running' ? (
                                <button
                                    onClick={handleRun}
                                    disabled={!currentFilePath}
                                    style={{
                                        flex: 1,
                                        padding: '6px 10px',
                                        background: currentFilePath ? '#4CAF50' : 'rgba(76,175,80,0.3)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        cursor: currentFilePath ? 'pointer' : 'default',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        opacity: currentFilePath ? 1 : 0.5
                                    }}
                                >
                                    <PlayIcon size={14} />
                                    Run (F5)
                                </button>
                            ) : (
                                <button
                                    onClick={handleStop}
                                    style={{
                                        flex: 1,
                                        padding: '6px 10px',
                                        background: '#f44336',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                    }}
                                >
                                    ■ Stop (Shift+F5)
                                </button>
                            )}

                            <button
                                onClick={handleClear}
                                title="콘솔 지우기"
                                style={{
                                    padding: '6px 10px',
                                    background: 'transparent',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-secondary)',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                }}
                            >
                                Clear
                            </button>
                        </div>

                        {/* Status bar */}
                        <div style={{
                            marginTop: '6px',
                            fontSize: '11px',
                            color: getStatusColor(),
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            {status === 'running' && (
                                <span style={{
                                    display: 'inline-block',
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: '#4CAF50',
                                    animation: 'pulse 1.5s infinite'
                                }} />
                            )}
                            <span>{getStatusText()}</span>
                            {command && status !== 'idle' && (
                                <span style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
                                    — {command}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Debug Console Output */}
                    <div
                        ref={outputRef}
                        style={{
                            flex: 1,
                            overflow: 'auto',
                            padding: '8px 12px',
                            fontFamily: 'JetBrains Mono, Consolas, monospace',
                            fontSize: '12px',
                            lineHeight: '1.5',
                            background: 'rgba(0,0,0,0.2)',
                            color: '#d4d4d4',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                        }}
                    >
                        {output.length === 0 ? (
                            <div style={{ color: 'var(--text-secondary)', opacity: 0.5, paddingTop: '20px', textAlign: 'center' }}>
                                {status === 'idle' ? 'F5를 눌러 현재 파일을 실행하세요' : '출력 대기 중...'}
                            </div>
                        ) : (
                            output.map((line, i) => (
                                <span key={i}>{line}</span>
                            ))
                        )}

                        {/* Exit code indicator */}
                        {status === 'stopped' && exitCode !== null && (
                            <div style={{
                                marginTop: '8px',
                                padding: '4px 8px',
                                borderTop: '1px solid var(--border-color)',
                                color: exitCode === 0 ? '#4CAF50' : '#f44336',
                                fontSize: '11px',
                            }}>
                                프로세스가 종료되었습니다 (종료 코드: {exitCode})
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
};

export default DebugPanel;
