
import React from 'react';
import '../styles/App.css'; // modal style recycling

interface OpenFile {
    path: string;
    isDirty: boolean;
    // ... other props optional or minimal here
}

interface UnsavedChangesModalProps {
    files: OpenFile[];
    onAction: (action: 'save' | 'dontsave' | 'cancel') => void;
}

const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({ files, onAction }) => {
    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ width: '400px', maxWidth: '90%' }}>
                <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>저장하지 않은 변경사항</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '10px' }}>
                    다음 파일들에 변경사항이 있습니다. 저장하시겠습니까?
                </p>

                <div style={{
                    maxHeight: '150px',
                    overflowY: 'auto',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    padding: '8px',
                    marginBottom: '20px'
                }}>
                    {files.map((file, index) => (
                        <div key={index} style={{
                            padding: '4px 0',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {file.path.split('/').pop()} <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>({file.path})</span>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                        onClick={() => onAction('save')}
                        className="modal-btn primary"
                    >
                        Save
                    </button>
                    <button
                        onClick={() => onAction('dontsave')}
                        className="modal-btn delete"
                    >
                        Don't Save
                    </button>
                    <button
                        onClick={() => onAction('cancel')}
                        className="modal-btn cancel"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UnsavedChangesModal;
