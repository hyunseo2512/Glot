
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
                <h3 style={{ marginTop: 0, color: 'var(--text-primary)' }}>Unsaved Changes</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '10px' }}>
                    There are unsaved changes in the following files. Do you want to save them?
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
                    {/* Reordering buttons as per the "Code Edit" snippet: Cancel, Don't Save, Save */}
                    <button className="modal-btn cancel" onClick={() => onAction('cancel')}>Cancel</button>
                    <button className="modal-btn delete" onClick={() => onAction('dontsave')}>Don't Save</button>
                    <button className="modal-btn primary" onClick={() => onAction('save')} autoFocus>Save</button>
                </div>
            </div>
        </div>
    );
};

export default UnsavedChangesModal;
