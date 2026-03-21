import { useState, useEffect } from 'react';

interface UpdateInfo {
  version: string;
  url: string;
}

export default function UpdateBanner() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    const cleanup = (window.electron as any).update?.onAvailable((info: UpdateInfo) => {
      setUpdateInfo(info);
    });
    return () => cleanup?.();
  }, []);

  if (!updateInfo) return null;

  const handleOpenRelease = () => {
    (window.electron as any).shell.openExternal(updateInfo.url);
  };

  const handleDismiss = () => {
    setUpdateInfo(null);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      padding: '5px 12px',
      backgroundColor: '#1a3a52',
      borderBottom: '1px solid #2a5a7a',
      fontSize: '12px',
      color: '#7ec8e3',
      flexShrink: 0,
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 3 21 3 21 8" />
          <line x1="4" y1="20" x2="21" y2="3" />
          <polyline points="21 16 21 21 16 21" />
          <line x1="15" y1="15" x2="21" y2="21" />
        </svg>
        Glot <strong style={{ color: '#a8d8ea' }}>v{updateInfo.version}</strong> 업데이트가 있습니다
      </span>
      <button
        onClick={handleOpenRelease}
        style={{
          background: 'none',
          border: '1px solid #2a6a8a',
          borderRadius: '3px',
          color: '#7ec8e3',
          cursor: 'pointer',
          fontSize: '11px',
          padding: '1px 8px',
          lineHeight: '16px',
        }}
      >
        릴리즈 노트 보기
      </button>
      <button
        onClick={handleDismiss}
        title="닫기"
        style={{
          background: 'none',
          border: 'none',
          color: '#7ec8e3',
          cursor: 'pointer',
          fontSize: '14px',
          padding: '0 2px',
          lineHeight: 1,
          opacity: 0.7,
        }}
      >
        ✕
      </button>
    </div>
  );
}
