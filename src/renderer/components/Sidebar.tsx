import '../styles/Sidebar.css';
import { FolderIcon, SearchIcon, GitIcon, BugIcon } from './Icons';

interface SidebarProps {
  activeView: 'explorer' | 'search' | 'git' | 'debug';
  onViewChange: (view: 'explorer' | 'search' | 'git' | 'debug') => void;
  isSidePanelOpen: boolean;
  onToggleSidebar: () => void;
}

/**
 * VS Code 스타일 왼쪽 액티비티 바
 */
function Sidebar({ activeView, onViewChange, isSidePanelOpen, onToggleSidebar }: SidebarProps) {
  const handleViewClick = (view: 'explorer' | 'search' | 'git' | 'debug') => {
    // 사이드 패널이 닫혀있거나, 열려있지만 다른 뷰인 경우 → 해당 뷰로 전환
    if (!isSidePanelOpen || activeView !== view) {
      onViewChange(view);
      if (!isSidePanelOpen) {
        onToggleSidebar();
      }
    } else {
      // 이미 해당 뷰가 active인 경우 → 토글 (닫기)
      onToggleSidebar();
    }
  };

  return (
    <div className="sidebar">
      <button
        className={`sidebar-button ${activeView === 'explorer' && isSidePanelOpen ? 'active' : ''}`}
        onClick={() => handleViewClick('explorer')}
        data-tooltip="탐색기 (Ctrl+B)"
        data-tooltip-pos="right"
      >
        <FolderIcon size={24} color="currentColor" />
      </button>
      <button
        className={`sidebar-button ${activeView === 'search' && isSidePanelOpen ? 'active' : ''}`}
        onClick={() => handleViewClick('search')}
        data-tooltip="검색"
        data-tooltip-pos="right"
      >
        <SearchIcon size={24} />
      </button>
      <button
        className={`sidebar-button ${activeView === 'git' && isSidePanelOpen ? 'active' : ''}`}
        onClick={() => handleViewClick('git')}
        data-tooltip="소스 제어"
        data-tooltip-pos="right"
      >
        <GitIcon size={24} />
      </button>
      <button
        className={`sidebar-button ${activeView === 'debug' && isSidePanelOpen ? 'active' : ''}`}
        onClick={() => handleViewClick('debug')}
        data-tooltip="실행 및 디버그 (Ctrl+Shift+D)"
        data-tooltip-pos="right"
      >
        <BugIcon size={24} />
      </button>
      <div className="sidebar-bottom">

      </div>
    </div>
  );
}

export default Sidebar;
