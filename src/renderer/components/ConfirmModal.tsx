import React from 'react';
import '../styles/App.css';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'primary' | 'delete';
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * 재사용 가능한 확인 모달 컴포넌트
 * IDE 테마색에 맞춤
 */
const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = '확인',
    cancelText = '취소',
    variant = 'primary',
    onConfirm,
    onCancel,
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3>{title}</h3>
                <p style={{ whiteSpace: 'pre-line' }}>{message}</p>
                <div className="modal-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button className="modal-btn cancel" onClick={onCancel}>{cancelText}</button>
                    <button className={`modal-btn ${variant}`} onClick={onConfirm}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
