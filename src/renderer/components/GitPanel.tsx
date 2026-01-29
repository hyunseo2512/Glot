import { useState, useEffect, useMemo } from 'react';
import '../styles/GitPanel.css';
import { GitIcon, RotateCcwIcon, PlusIcon, UploadIcon, DownloadIcon, ChevronDownIcon, GithubIcon, getIconForFile } from './Icons';
import ConfirmModal from './ConfirmModal';
import DiffView from './DiffView';

interface GitPanelProps {
    workspaceDir?: string;
    onFileClick?: (path: string) => void;
}

interface FileStatus {
    path: string;
    index: string;
    working_dir: string;
}

interface LogCommit {
    hash: string;
    parents: string;
    author_name: string;
    message: string;
    date: string;
    refs: string;
}

// 간단한 그래프 노드 타입
interface GraphNode {
    commit: LogCommit;
    x: number;
    y: number;
    color: string;
}

interface GraphLink {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
    bezier: boolean;
}

const GitPanel: React.FC<GitPanelProps> = ({ workspaceDir, onFileClick }) => {
    const [activeTab, setActiveTab] = useState<'changes' | 'graph'>('changes');
    const [commits, setCommits] = useState<LogCommit[]>([]);
    const [status, setStatus] = useState<any>(null);
    const [branches, setBranches] = useState<any>(null);
    const [currentBranch, setCurrentBranch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [commitMessage, setCommitMessage] = useState('');
    const [selectedFileDiff, setSelectedFileDiff] = useState<{ path: string, original: string, modified: string } | null>(null);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [showBranchDropdown, setShowBranchDropdown] = useState(false);
    const [showCreateBranchModal, setShowCreateBranchModal] = useState(false);
    const [newBranchName, setNewBranchName] = useState('');
    const [viewMode, setViewMode] = useState<'all' | 'current'>('all');
    const [isCompact, setIsCompact] = useState(false);
    const [isNotGitRepo, setIsNotGitRepo] = useState(false);

    // Confirm Modal States
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        variant: 'primary' | 'delete';
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', variant: 'primary', onConfirm: () => { } });

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const refreshStatus = async () => {
        if (!workspaceDir) return;
        setIsLoading(true);
        setError(null);
        try {
            // Status
            const statusResult = await window.electron.git.status(workspaceDir);
            if (statusResult.success) {
                setStatus(statusResult.status);
                setCurrentBranch(statusResult.status.current);
                setIsNotGitRepo(false);
            } else {
                if (statusResult.error && (
                    statusResult.error.includes('not a git repository') ||
                    statusResult.error.includes('Not a git repository') // Case insensitive check
                )) {
                    setIsNotGitRepo(true);
                    setError(null); // Clear error to show empty state instead
                } else {
                    setError(statusResult.error || 'Git status failed');
                    setIsNotGitRepo(false);
                }
            }

            // Branches
            const branchResult = await window.electron.git.branch(workspaceDir);
            if (branchResult.success) {
                setBranches(branchResult.branches);
            }

            // History (Log) for Graph
            if (activeTab === 'graph') {
                const logResult = await window.electron.git.log(workspaceDir, { all: viewMode === 'all' });
                if (logResult.success) {
                    console.log('Git Log Result:', logResult.log);
                    setCommits(logResult.log.all);
                } else {
                    console.error('Git Log Failed:', logResult.error);
                }
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refreshStatus();
    }, [workspaceDir, activeTab, viewMode]);

    const handleBranchChange = (branchName: string) => {
        if (!workspaceDir || branchName === currentBranch) return;

        setConfirmModal({
            isOpen: true,
            title: '브랜치 변경',
            message: `브랜치를 '${branchName}'(으)로 변경하시겠습니까?\n변경 사항이 있으면 실패할 수 있습니다.`,
            variant: 'primary',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setIsLoading(true);
                try {
                    const result = await window.electron.git.checkout(workspaceDir, branchName);
                    if (result.success) {
                        refreshStatus();
                    } else {
                        setError(result.error || 'Checkout failed');
                    }
                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setIsLoading(false);
                }
            }
        });
    };

    const handleFileClick = async (filePath: string) => {
        if (!workspaceDir) return;
        try {
            const [diffResult, fileResult] = await Promise.all([
                window.electron.git.diff(workspaceDir, filePath),
                window.electron.fs.readFile(filePath.startsWith('/') ? filePath : `${workspaceDir}/${filePath}`)
            ]);

            const original = diffResult.success ? diffResult.original : '';
            const modified = fileResult.success ? (fileResult.content || '') : '';

            setSelectedFileDiff({ path: filePath, original, modified });
        } catch (err: any) {
            console.error(err);
        }
    };

    const handleStageFile = async (filePath: string) => {
        if (!workspaceDir) return;
        try {
            await window.electron.git.add(workspaceDir, [filePath]);
            refreshStatus();
        } catch (err) {
            console.error(err);
        }
    };

    // Staged/Unstaged 분리
    const stagedFiles = useMemo(() => {
        if (!status?.files) return [];
        return status.files.filter((f: FileStatus) => f.index !== '?' && f.index !== ' ');
    }, [status]);

    const changesFiles = useMemo(() => {
        if (!status?.files) return [];
        return status.files.filter((f: FileStatus) => f.index === '?' || f.working_dir !== ' ');
    }, [status]);

    const handleCommit = async () => {
        if (!workspaceDir || !commitMessage) return;
        setIsLoading(true);
        try {
            // Staged 파일이 없으면 전체 커밋 시도? (VS Code 방식은 Staged만 커밋)
            // 여기서는 Staged 파일만 커밋한다고 가정, 혹은 addAll 옵션 제공 필요
            // 만약 stagedFiles가 비어있으면 알림
            if (stagedFiles.length === 0) {
                setConfirmModal({
                    isOpen: true,
                    title: '모든 변경 사항 스테이지',
                    message: '스테이지된 변경 사항이 없습니다.\n모든 변경 사항을 스테이지하고 커밋하시겠습니까?',
                    variant: 'primary',
                    onConfirm: async () => {
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                        await window.electron.git.add(workspaceDir!, ['.']);
                        // 다시 커밋 시도
                        const result = await window.electron.git.commit(workspaceDir!, commitMessage);
                        if (result.success) {
                            setCommitMessage('');
                            refreshStatus();
                        } else {
                            setError(result.error || 'Commit failed');
                        }
                        setIsLoading(false);
                    }
                });
                return;
            }

            const result = await window.electron.git.commit(workspaceDir, commitMessage);
            if (result.success) {
                setCommitMessage('');
                refreshStatus();
            } else {
                setError(result.error || 'Commit failed');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // ... handlePush, handlePull (이전과 동일, 생략 가능하지만 완전한 코드를 위해 포함)
    const handlePush = async () => {
        if (!workspaceDir) return;

        // Push 할 변경 사항이 있는지 확인하던 로직 제거 -> 항상 푸시 시도 (서버에서 판단)
        // if (status && status.tracking && status.ahead === 0) ...

        setIsLoading(true);
        try {
            const result = await window.electron.git.push(workspaceDir);
            if (result.success) {
                // simple-git push result checking
                const details = result.result;
                if (!details) {
                    showNotification('Already Up-to-Date', 'success');
                } else if (
                    (Array.isArray(details.pushed) && details.pushed.length > 0) ||
                    (details.update && (details.update.head || details.update.hash))
                ) {
                    showNotification(`Push Complete`, 'success');
                } else {
                    showNotification('Already Up-to-Date', 'success');
                }
                refreshStatus();
            }
            else setError(result.error || 'Push failed');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePull = async () => {
        if (!workspaceDir) return;
        setIsLoading(true);
        try {
            const result = await window.electron.git.pull(workspaceDir);
            if (result.success) {
                refreshStatus();
                const details = result.result;
                // PullResult check
                if (details && details.summary && details.summary.changes === 0 && details.summary.insertions === 0 && details.summary.deletions === 0) {
                    showNotification('Already Up-to-Date', 'success');
                } else if (details && details.files && details.files.length === 0) {
                    // files 배열도 확인 (summary가 없을 경우 대비)
                    showNotification('Already Up-to-Date', 'success');
                } else {
                    showNotification('Pull Complete', 'success');
                }
            }
            else setError(result.error || 'Pull failed');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStageAll = async () => {
        if (!workspaceDir) return;
        setIsLoading(true);
        try {
            const result = await window.electron.git.add(workspaceDir, ['.']);
            if (result.success) {
                refreshStatus();
            } else {
                setError(result.error || 'Stage All failed');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInitRepo = () => {
        if (!workspaceDir) {
            showNotification('폴더를 먼저 열어주세요', 'error');
            return;
        }

        console.log('Initializing git in:', workspaceDir);

        setConfirmModal({
            isOpen: true,
            title: 'Git 저장소 초기화',
            message: `"${workspaceDir}"에 Git 저장소를 초기화하시겠습니까?`,
            variant: 'primary',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setIsLoading(true);
                try {
                    console.log('Calling git.init...');
                    const result = await window.electron.git.init(workspaceDir);
                    console.log('git.init result:', result);
                    if (result.success) {
                        showNotification('Git repository initialized', 'success');
                        setIsNotGitRepo(false);
                        refreshStatus();
                    } else {
                        setError(result.error || 'Git initialization failed');
                        showNotification(result.error || 'Git initialization failed', 'error');
                    }
                } catch (err: any) {
                    console.error('git.init error:', err);
                    setError(err.message);
                    showNotification(err.message, 'error');
                } finally {
                    setIsLoading(false);
                }
            }
        });
    };

    // --- Graph Logic ---
    const graphData = useMemo(() => {
        if (!commits || commits.length === 0) return { nodes: [], links: [], height: 0 };

        // 1. 성능 최적화: 렌더링 할 커밋 수 제한
        const visibleCommits = commits.slice(0, 500);

        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];
        const colors = ['#00bdff', '#00e676', '#ff5252', '#d500f9', '#ff9100', '#2979ff', '#00b0ff', '#ff1744'];

        // Layout Constants
        const spacingX = 22;
        const spacingY = isCompact ? 28 : 54;
        const paddingLeft = 15;
        const paddingTop = 30;

        // --- Metro Map Layout Algorithm ---

        // 'routes' tracks which commit hash is expected in which visual column (rail)
        // null means the rail is currently free
        const routes: (string | null)[] = [];

        // Color cache for columns to maintain consistency
        const railColors: string[] = [];

        // 1. First Pass: Assign Coordinates & Colors
        visibleCommits.forEach((commit, index) => {
            // Find which rail contains this commit
            let railIndex = routes.indexOf(commit.hash);

            if (railIndex === -1) {
                // New branch tip or untracked history start
                railIndex = routes.findIndex(r => r === null);
                if (railIndex === -1) railIndex = routes.length;
            }

            // Assign color if new rail
            if (!railColors[railIndex]) {
                railColors[railIndex] = colors[railIndex % colors.length];
            }

            // Record Node
            nodes.push({
                commit,
                x: paddingLeft + railIndex * spacingX,
                y: paddingTop + index * spacingY,
                color: railColors[railIndex]
            });

            // Update Routes (Rails) for next row (Parents)
            const parents = commit.parents ? commit.parents.split(' ') : [];

            // Mark current slot as free (will be re-occupied by primary parent immediately if applicable)
            routes[railIndex] = null;

            if (parents.length > 0) {
                // Primary Parent (Direct Lineage)
                const p0 = parents[0];

                // Check if Primary Parent is already tracked in another rail (Merge scenario)
                const existingP0Index = routes.indexOf(p0);

                if (existingP0Index !== -1) {
                    // Merge: p0 is already on another rail.
                    // This rail (railIndex) ends here (merges into existingP0Index).
                    // Leave routes[railIndex] as null.
                } else {
                    // Continue lineage on this rail
                    routes[railIndex] = p0;
                    // Maintain color consistency?
                    // Ideally, p0 should inherit this rail's color since it's the direct parent.
                }

                // Secondary Parents (Merge Sources / Forks)
                for (let i = 1; i < parents.length; i++) {
                    const p = parents[i];
                    if (routes.indexOf(p) === -1) {
                        // Reserve a new rail for this parent
                        let newRail = routes.findIndex(r => r === null);
                        if (newRail === -1) newRail = routes.length;
                        routes[newRail] = p;

                        // Assign a new color for this new branch/rail if undefined
                        if (!railColors[newRail]) railColors[newRail] = colors[newRail % colors.length];
                    }
                }
            }
        });

        // 2. Second Pass: Generate Links (Bezier Curves)
        // Since we have coords for all visible nodes, we can link them now.
        // For parents that are OFF-SCREEN (sliced out), we draw a trail-off.

        // Create a fast lookup map for nodes
        const nodeMap = new Map<string, GraphNode>();
        nodes.forEach(n => nodeMap.set(n.commit.hash, n));

        nodes.forEach(node => {
            const parents = node.commit.parents ? node.commit.parents.split(' ') : [];

            parents.forEach(parentHash => {
                const parentNode = nodeMap.get(parentHash);

                if (parentNode) {
                    // Standard Link
                    const isStraight = node.x === parentNode.x;
                    links.push({
                        x1: node.x,
                        y1: node.y,
                        x2: parentNode.x,
                        y2: parentNode.y,
                        color: parentNode.color, // Color normally follows the child or source? Usually source (parent) to dest (child) flow, but we draw branches. Let's use parent color for continuity upwards or child?
                        // GitGraph usually colors the child's branch color. 
                        // If merge, the incoming line has the merging branch's color.
                        // Let's use the NODE'S color for lines originating from it (going down to parents). 
                        // Wait, physically we draw line from (x1, y1) to (x2, y2).
                        // If it's a merge commit (2 parents), it produces 2 lines going down.
                        // Line 1 to P0: Main branch color.
                        // Line 2 to P1: Merged branch color.
                        // Actually, P1 is the one BEING merged. So the line to P1 should probably match P1's color.
                        // Let's try using PARENT's color for the link.
                        bezier: !isStraight
                    });
                } else {
                    // Parent is out of view (older history)
                    // Draw a short tail downwards
                    // Try to guess if it was straight or not? Hard to know. Just draw straight down.
                    links.push({
                        x1: node.x,
                        y1: node.y,
                        x2: node.x,
                        y2: node.y + spacingY * 0.8,
                        color: node.color,
                        bezier: false
                    });
                }
            });
        });

        return { nodes, links, height: nodes.length * spacingY + 40 };
    }, [commits, isCompact]);


    if (!workspaceDir) {
        return (
            <div className="git-panel empty">
                <GitIcon size={48} className="git-icon-large" />
                <p>폴더를 열어주세요.</p>
            </div>
        );
    }

    if (isNotGitRepo) {
        return (
            <>
                <div className="git-panel empty" style={{ justifyContent: 'center', gap: '20px' }}>
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <GitIcon size={64} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <h3 style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--text-primary)' }}>Git 저장소가 아닙니다</h3>
                        <p style={{ fontSize: '13px', maxWidth: '250px', margin: '0 auto 24px auto', lineHeight: '1.5' }}>
                            현재 폴더는 Git으로 관리되고 있지 않습니다.<br />
                            새로운 리포지토리를 초기화하여 버전 관리를 시작하세요.
                        </p>
                        <button
                            onClick={handleInitRepo}
                            disabled={isLoading}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: 'var(--accent-blue)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 500
                            }}
                        >
                            {isLoading ? '초기화 중...' : 'Initialize Repository'}
                        </button>
                        <button
                            onClick={refreshStatus}
                            style={{
                                display: 'block',
                                margin: '12px auto 0',
                                background: 'none',
                                border: 'none',
                                color: 'var(--accent-blue)',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            다시 시도
                        </button>
                    </div>
                </div>
                <ConfirmModal
                    isOpen={confirmModal.isOpen}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    variant={confirmModal.variant}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                />
            </>
        );
    }

    const handleCreateBranchClick = () => {
        setShowBranchDropdown(false);
        setShowCreateBranchModal(true);
        setNewBranchName('');
        setTimeout(() => document.getElementById('new-branch-input')?.focus(), 100);
    };

    const confirmCreateBranch = async () => {
        if (!workspaceDir || !newBranchName.trim()) return;
        setIsLoading(true);
        try {
            const result = await window.electron.git.branchCreate(workspaceDir, newBranchName);
            if (result.success) {
                showNotification(`Branch '${newBranchName}' created`, 'success');
                refreshStatus();
                setShowCreateBranchModal(false);
                setNewBranchName('');
            } else {
                setError(result.error || 'Branch creation failed');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="git-panel">
            <div className="git-header">
                <h3>소스 제어</h3>
                <div className="git-actions">
                    <button onClick={refreshStatus} title="새로고침" disabled={isLoading}>
                        <RotateCcwIcon size={14} />
                    </button>
                    <button onClick={handlePull} title="Pull" disabled={isLoading}>
                        <DownloadIcon size={14} />
                    </button>
                    <button onClick={handlePush} title="Push" disabled={isLoading}>
                        <UploadIcon size={14} />
                    </button>
                </div>
            </div>



            <div className="git-branch-selector" style={{ position: 'relative' }}>
                <div
                    className="git-custom-select"
                    onClick={() => !isLoading && setShowBranchDropdown(!showBranchDropdown)}
                >
                    <span className="git-branch-icon">⎇</span>
                    <span className="git-branch-name">{currentBranch || 'No Branch'}</span>
                    <ChevronDownIcon size={12} className="git-select-arrow" />
                </div>

                {showBranchDropdown && (
                    <div className="git-dropdown-menu">
                        <div
                            className="git-dropdown-item create-branch"
                            onClick={handleCreateBranchClick}
                            style={{ borderBottom: '1px solid #333', color: '#4fc1ff' }}
                        >
                            + New Branch...
                        </div>
                        {branches?.all?.map((branch: string) => (
                            <div
                                key={branch}
                                className={`git-dropdown-item ${branch === currentBranch ? 'active' : ''}`}
                                onClick={() => {
                                    handleBranchChange(branch);
                                    setShowBranchDropdown(false);
                                }}
                            >
                                {branch}
                                {branch === currentBranch && <span>✓</span>}
                            </div>
                        )) || <div className="git-dropdown-item">{currentBranch}</div>}
                    </div>
                )}
            </div>

            <div className="git-tabs">
                <button
                    className={`git-tab ${activeTab === 'changes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('changes')}
                >
                    Changes
                </button>
                <button
                    className={`git-tab ${activeTab === 'graph' ? 'active' : ''}`}
                    onClick={() => setActiveTab('graph')}
                >
                    Graph
                </button>
            </div>

            {error && <div className="git-error">{error}</div>}

            <div className="git-content" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {activeTab === 'changes' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div className="git-changes-scroll" style={{ flex: 1, overflowY: 'auto' }}>
                            {/* Staged Changes */}
                            <div className="git-section">
                                <h4 className="git-section-title">Staged Changes ({stagedFiles.length})</h4>
                                {stagedFiles.map((file: FileStatus) => (
                                    <div key={file.path} className="git-file-item" onClick={() => handleFileClick(file.path)}>
                                        <div className="git-file-left">
                                            <span style={{ marginRight: '6px', display: 'flex' }}>{getIconForFile(file.path, 14)}</span>
                                            <span className="git-file-name">{file.path}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <button className="git-action-btn" onClick={(e) => { e.stopPropagation(); /* Unstage Logic Needed */ }}>-</button>
                                            <span className="git-status-icon staged">{file.index}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Changes */}
                            <div className="git-section">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '10px' }}>
                                    <h4 className="git-section-title">Changes ({changesFiles.length})</h4>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleStageAll(); }}
                                        title="Stage All Changes"
                                        className="git-action-btn"
                                    >
                                        <PlusIcon size={14} />
                                    </button>
                                </div>
                                {changesFiles.map((file: FileStatus) => (
                                    <div key={file.path} className="git-file-item" onClick={() => onFileClick && onFileClick(file.path)}>
                                        <div className="git-file-left">
                                            <span style={{ marginRight: '6px', display: 'flex' }}>{getIconForFile(file.path, 14)}</span>
                                            <span className="git-file-name">{file.path}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <button
                                                className="git-action-btn"
                                                title="Stage"
                                                onClick={(e) => { e.stopPropagation(); handleStageFile(file.path); }}
                                            >
                                                <PlusIcon size={12} />
                                            </button>
                                            <span className="git-status-icon modified">M</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="git-commit-area">
                            <textarea
                                className="git-commit-message"
                                placeholder="Message (Ctrl+Enter to commit)"
                                value={commitMessage}
                                onChange={(e) => setCommitMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                        handleCommit();
                                    }
                                }}
                                disabled={isLoading}
                            />
                            <button
                                className="git-commit-button"
                                onClick={handleCommit}
                                disabled={isLoading || !commitMessage.trim()}
                            >
                                {isLoading ? 'Processing...' : 'Commit'}
                            </button>
                        </div>
                    </div>
                ) : (
                    commits.length === 0 ? (
                        <div className="git-empty-state" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
                            <p>No commits found.</p>
                        </div>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            {/* Graph Controls */}
                            <div className="git-graph-controls" style={{
                                padding: '8px 12px',
                                borderBottom: '1px solid var(--border-color)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '12px',
                                backgroundColor: 'var(--bg-tertiary)'
                            }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button
                                        onClick={() => setViewMode(viewMode === 'current' ? 'all' : 'current')}
                                        title="Show only current branch history"
                                        style={{
                                            background: viewMode === 'current' ? 'var(--accent-blue)' : 'transparent',
                                            color: viewMode === 'current' ? '#ffffff' : 'var(--text-secondary)',
                                            border: `1px solid ${viewMode === 'current' ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            fontSize: '11px',
                                            fontWeight: 500,
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        Simplify
                                    </button>
                                    <button
                                        onClick={() => setIsCompact(!isCompact)}
                                        title="Reduce vertical spacing"
                                        style={{
                                            background: isCompact ? 'var(--accent-blue)' : 'transparent',
                                            color: isCompact ? '#ffffff' : 'var(--text-secondary)',
                                            border: `1px solid ${isCompact ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            fontSize: '11px',
                                            fontWeight: 500,
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        Compact
                                    </button>
                                </div>
                            </div>

                            <div className="git-graph-container" style={{ flex: 1, overflow: 'auto', position: 'relative', backgroundColor: 'var(--bg-primary)' }}>
                                <svg width="100%" height={graphData.height} style={{ minWidth: '600px' }}>
                                    {/* Links */}
                                    {graphData.links.map((link, i) => (
                                        <path
                                            key={`link-${i}`}
                                            d={link.bezier
                                                ? `M ${link.x1} ${link.y1} C ${link.x1} ${link.y1 + 10}, ${link.x2} ${link.y2 - 10}, ${link.x2} ${link.y2}`
                                                : `M ${link.x1} ${link.y1} L ${link.x2} ${link.y2}`
                                            }
                                            stroke={link.color}
                                            strokeWidth="2"
                                            fill="none"
                                            opacity="0.8"
                                        />
                                    ))}
                                    {/* Nodes & Text */}
                                    {(() => {
                                        // 텍스트 시작 위치 계산 (가장 오른쪽 노드 + 여유 공간)
                                        // 너무 멀어지는 것을 방지하기 위해, 현재 노드의 x좌표 + 고정값을 사용하되,
                                        // 전체적으로 텍스트가 정렬되도록 최소값을 설정
                                        const maxNodeX = graphData.nodes.length > 0 ? Math.max(...graphData.nodes.map(n => n.x)) : 0;
                                        const textStartX = maxNodeX + 30;

                                        return graphData.nodes.map((node) => {
                                            // Refs Parsing
                                            let refs: string[] = [];
                                            if (node.commit.refs) {
                                                const cleanRefs = node.commit.refs.replace(/^\s*\(/, '').replace(/\)\s*$/, '');
                                                refs = cleanRefs.split(',').map(r => r.trim()).filter(r => r);
                                            }

                                            let contentOffsetX = textStartX;

                                            // 텍스트 수직 정렬 (refs가 있으면 메시지를 아래로 내림 등)
                                            // 하지만 spacingY를 50으로 늘렸으므로 한 줄 혹은 두 줄로 표현 가능

                                            return (
                                                <g key={node.commit.hash}>
                                                    {/* Commit Node (Neon Style) */}
                                                    {/* Glow Layer */}
                                                    <circle
                                                        cx={node.x} cy={node.y} r="8"
                                                        fill={node.color}
                                                        opacity="0.2"
                                                        style={{ filter: `blur(4px)` }}
                                                    />
                                                    {/* Outer Ring */}
                                                    <circle
                                                        className="git-graph-node"
                                                        cx={node.x} cy={node.y} r="5"
                                                        fill="#1e1e1e"
                                                        stroke={node.color}
                                                        strokeWidth="2"
                                                    />
                                                    {/* Inner Dot */}
                                                    <circle
                                                        cx={node.x} cy={node.y} r="2.5"
                                                        fill={node.color}
                                                    />

                                                    {/* Refs Badges */}
                                                    {refs.length > 0 && (
                                                        <g>
                                                            {refs.map((ref, idx) => {
                                                                const isHead = ref.includes('HEAD');
                                                                const isRemote = ref.includes('origin/');

                                                                // Neon Colors
                                                                let strokeColor = '#4ec9b0'; // Default Local: Teal
                                                                let fillColor = 'rgba(78, 201, 176, 0.15)';

                                                                if (isHead) {
                                                                    strokeColor = '#4fc1ff'; // HEAD: Blue
                                                                    fillColor = 'rgba(79, 193, 255, 0.15)';
                                                                } else if (isRemote) {
                                                                    strokeColor = '#c586c0'; // Remote: Purple
                                                                    fillColor = 'rgba(197, 134, 192, 0.15)';
                                                                }

                                                                const refText = ref.replace('HEAD -> ', '').replace('origin/', '');
                                                                // 폰트 크기 11px 기준 너비 추정
                                                                const width = refText.length * 7 + 12;

                                                                const badge = (
                                                                    <g key={`badge-${idx}`}>
                                                                        <rect
                                                                            x={contentOffsetX} y={node.y - 16}
                                                                            width={width} height="18" rx="4"
                                                                            fill={fillColor}
                                                                            stroke={strokeColor}
                                                                            strokeWidth="1"
                                                                            className="git-badge-rect"
                                                                        />
                                                                        <text
                                                                            x={contentOffsetX + 6} y={node.y - 3}
                                                                            fontSize="11"
                                                                            fill={strokeColor}
                                                                            fontWeight="600"
                                                                            className="git-badge-text"
                                                                            style={{ textShadow: `0 0 5px ${strokeColor}40` }}
                                                                        >
                                                                            {refText}
                                                                        </text>
                                                                    </g>
                                                                );
                                                                contentOffsetX += width + 5;
                                                                return badge;
                                                            })}
                                                        </g>
                                                    )}

                                                    {/* Commit Message & Date */}
                                                    {/* If refs exist, message goes below or next? 
                                                   공간이 좁으므로: Refs가 있으면 Refs 옆에, 없으면 바로 시작.
                                                   하지만 메시지가 길면 겹치므로, 메시지를 아래 줄로 내리는 게 안전할 수 있음.
                                                   SpacingY=50 이므로, 2줄 사용 가능.
                                                   Line 1: Refs (if any)
                                                   Line 2: Message - Date
                                                */}

                                                    {refs.length > 0 ? (
                                                        // Refs가 있는 경우: Refs 아래에 메시지 표시 (y + 5)
                                                        <text x={textStartX} y={node.y + 12} fontSize="12" fill="#cccccc" fontFamily="Consolas, monospace">
                                                            {node.commit.message}
                                                            <tspan fill="#666" fontSize="11"> - {node.commit.date}</tspan>
                                                        </text>
                                                    ) : (
                                                        // Refs가 없는 경우: 노드 중앙 정렬 (y + 4)
                                                        <text x={textStartX} y={node.y + 4} fontSize="12" fill="#cccccc" fontFamily="Consolas, monospace">
                                                            {node.commit.message}
                                                            <tspan fill="#666" fontSize="11"> - {node.commit.date}</tspan>
                                                        </text>
                                                    )}
                                                </g>
                                            );
                                        });
                                    })()}
                                </svg>
                            </div>
                        </div>
                    )
                )}
            </div>

            {
                selectedFileDiff && (
                    <div className="git-diff-modal" onClick={() => setSelectedFileDiff(null)}>
                        <div className="git-diff-content" onClick={e => e.stopPropagation()} style={{ width: '90vw', height: '90vh', maxWidth: 'none' }}>
                            <div className="git-diff-header">
                                <h4>{selectedFileDiff.path}</h4>
                                <button onClick={() => setSelectedFileDiff(null)}>✕</button>
                            </div>
                            <div className="git-diff-body" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
                                <DiffView
                                    original={selectedFileDiff.original}
                                    modified={selectedFileDiff.modified}
                                    language={selectedFileDiff.path.split('.').pop() || 'text'}
                                />
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showCreateBranchModal && (
                    <div className="git-modal-overlay">
                        <div className="git-modal">
                            <h3>Create New Branch</h3>
                            <input
                                id="new-branch-input"
                                type="text"
                                value={newBranchName}
                                onChange={(e) => setNewBranchName(e.target.value)}
                                placeholder="Branch name"
                                className="git-input"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') confirmCreateBranch();
                                    if (e.key === 'Escape') setShowCreateBranchModal(false);
                                }}
                            />
                            <div className="git-modal-actions">
                                <button onClick={() => setShowCreateBranchModal(false)} className="cancel-btn">Cancel</button>
                                <button onClick={confirmCreateBranch} className="confirm-btn" disabled={!newBranchName.trim()}>Create</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                notification && (
                    <div className="git-notification-overlay">
                        <div className={`git-notification-box ${notification.type}`}>
                            {notification.type === 'success' && (
                                <div style={{ marginRight: '12px', display: 'flex' }}>
                                    <GithubIcon size={24} />
                                </div>
                            )}
                            {notification.message}
                        </div>
                    </div>
                )
            }

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />
        </div >
    );
}
export default GitPanel;
