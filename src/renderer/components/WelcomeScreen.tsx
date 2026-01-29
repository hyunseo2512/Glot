import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import '../styles/WelcomeScreen.css';
import { FolderPlusIcon, GitIcon, ActivityIcon, UserIcon, XIcon } from './Icons';

interface WelcomeScreenProps {
    onOpenProject: () => void;
    onCloneRepo: () => void;
    onConnectSSH: () => void;
    onLogin: () => void;
    isRemote?: boolean;
    remoteUser?: string;
    recents?: string[];
    onOpenRecent?: (path: string) => void;
    onRemoveRecent?: (path: string) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
    onOpenProject,
    onCloneRepo,
    onConnectSSH,
    onLogin,
    isRemote = false,
    remoteUser = '',
    recents = [],
    onOpenRecent,
    onRemoveRecent
}) => {
    const { user } = useAuthStore();
    const containerRef = useRef<HTMLDivElement>(null);
    const [focusIndex, setFocusIndex] = useState(0);

    // 레퍼런트 포커스 계산: isRemote일 때는 recent 제외
    const totalItems = 3 + (isRemote ? 0 : Math.min(recents.length, 3));

    // 항목에 포커스 맞추기
    const focusItem = useCallback((index: number) => {
        if (!containerRef.current) return;
        const items = containerRef.current.querySelectorAll<HTMLElement>('[data-welcome-item]');
        if (items[index]) {
            items[index].focus();
            setFocusIndex(index);
        }
    }, []);

    // 키보드 핸들러
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
            case 'ArrowRight':
                e.preventDefault();
                focusItem(focusIndex < totalItems - 1 ? focusIndex + 1 : 0);
                break;
            case 'ArrowUp':
            case 'ArrowLeft':
                e.preventDefault();
                focusItem(focusIndex > 0 ? focusIndex - 1 : totalItems - 1);
                break;
            case 'Home':
                e.preventDefault();
                focusItem(0);
                break;
            case 'End':
                e.preventDefault();
                focusItem(totalItems - 1);
                break;
        }
    }, [focusIndex, totalItems, focusItem]);

    // Esc 키 → 첫 항목 포커스
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                // 이미 포커스된 상태면 해제, 아니면 첫 항목 포커스
                const active = document.activeElement as HTMLElement;
                if (active?.hasAttribute('data-welcome-item')) {
                    active.blur();
                } else {
                    focusItem(0);
                }
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [focusItem]);

    return (
        <div className="welcome-screen" ref={containerRef} onKeyDown={handleKeyDown}>
            <div className="welcome-content">
                <div className={`welcome-logo ${user?.role === 'root' ? 'root' : ''}`}>
                    <h1>Gluon</h1>
                    <span className="welcome-version">Pro • v0.1.0</span>
                </div>

                <div className="welcome-actions">

                    <button
                        className="welcome-action-card"
                        onClick={onOpenProject}
                        data-welcome-item="0"
                        onFocus={() => setFocusIndex(0)}
                    >
                        <div className="action-icon">
                            <FolderPlusIcon size={24} />
                        </div>
                        <div className="action-text">
                            <h3>Open Project</h3>
                            <p>Open an existing folder or project</p>
                        </div>
                    </button>

                    <button
                        className="welcome-action-card"
                        onClick={onCloneRepo}
                        data-welcome-item="1"
                        onFocus={() => setFocusIndex(1)}
                    >
                        <div className="action-icon">
                            <GitIcon size={24} />
                        </div>
                        <div className="action-text">
                            <h3>Clone Repository</h3>
                            <p>Clone a project from Git</p>
                        </div>
                    </button>

                    <button
                        className={`welcome-action-card${isRemote ? ' connected' : ''}`}
                        onClick={onConnectSSH}
                        data-welcome-item="2"
                        onFocus={() => setFocusIndex(2)}
                        style={isRemote ? { borderColor: '#a6e3a1', boxShadow: '0 0 12px rgba(166, 227, 161, 0.2)' } : {}}
                    >
                        <div className="action-icon" style={isRemote ? { color: '#a6e3a1' } : {}}>
                            <ActivityIcon size={24} />
                        </div>
                        <div className="action-text">
                            <h3>{isRemote ? `Connected: ${remoteUser}` : 'Connect via SSH'}</h3>
                            <p>{isRemote ? 'Click to disconnect' : 'Connect to a remote server'}</p>
                        </div>
                    </button>
                </div>

                {!isRemote && (
                    <div className="recent-projects">
                        <h3>Recent Projects</h3>
                        <div className="recent-list">
                            {recents.length === 0 ? (
                                <p className="no-recent">No recent projects</p>
                            ) : (
                                recents.slice(0, 3).map((path, index) => (
                                    <div
                                        key={index}
                                        className="recent-item"
                                        onClick={() => onOpenRecent && onOpenRecent(path)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                onOpenRecent && onOpenRecent(path);
                                            }
                                        }}
                                        title={path}
                                        tabIndex={0}
                                        data-welcome-item={3 + index}
                                        onFocus={() => setFocusIndex(3 + index)}
                                        role="button"
                                    >
                                        <span className="recent-name">{path.split('/').pop()}</span>
                                        <button
                                            className="recent-remove"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemoveRecent && onRemoveRecent(path);
                                            }}
                                            tabIndex={-1}
                                            title="Remove from history"
                                        >
                                            <XIcon size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WelcomeScreen;
