import React, { useState } from 'react';
import '../styles/App.css';
import '../styles/App.css';
import { ChevronDownIcon, ChevronUpIcon } from './Icons';

interface SSHConnectionModalProps {
    onConnect: (config: any) => void;
    onCancel: () => void;
}

export default function SSHConnectionModal({ onConnect, onCancel }: SSHConnectionModalProps) {
    const [host, setHost] = useState('');
    const [port, setPort] = useState('22');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [useKey, setUseKey] = useState(false);

    const [privateKeyPath, setPrivateKeyPath] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConnect({
            host,
            port: parseInt(port),
            username,
            password: useKey ? undefined : password,
            privateKeyPath: useKey ? privateKeyPath : undefined // Backend needs to handle reading file if path provided
        });
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ width: '400px' }}>
                <h3>SSH Remote Connection</h3>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                    <div className="form-group">
                        <label>Host</label>
                        <input type="text" value={host} onChange={e => setHost(e.target.value)} required placeholder="192.168.1.1" className="input-field" />
                    </div>

                    <div className="form-group">
                        <label>Port</label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input
                                type="text"
                                value={port}
                                onChange={e => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    setPort(val);
                                }}
                                required
                                className="input-field" // Reuse input styles
                                style={{ paddingRight: '28px' }} // Space for buttons
                            />
                            {/* Custom Up/Down Buttons */}
                            <div style={{
                                position: 'absolute',
                                right: '1px',
                                top: '1px',
                                bottom: '1px',
                                width: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                borderLeft: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-secondary)', // Slightly different bg
                                borderTopRightRadius: '3px',
                                borderBottomRightRadius: '3px',
                                overflow: 'hidden'
                            }}>
                                <div
                                    onClick={() => setPort((prev) => (parseInt(prev || '0') + 1).toString())}
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid var(--border-color)',
                                        color: 'var(--text-secondary)'
                                    }}
                                    className="hover-bg" // Add hover effect class if available or rely on inline style
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <ChevronUpIcon size={12} />
                                </div>
                                <div
                                    onClick={() => setPort((prev) => Math.max(0, parseInt(prev || '0') - 1).toString())}
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: 'var(--text-secondary)'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <ChevronDownIcon size={12} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Username</label>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} required placeholder="root" className="input-field" />
                    </div>

                    <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', justifyContent: 'flex-start', width: '100%', textAlign: 'left', margin: '0' }}>
                        <div
                            onClick={() => setUseKey(!useKey)}
                            style={{
                                width: '36px',
                                height: '20px',
                                borderRadius: '10px',
                                background: useKey ? '#89b4fa' : '#45475a',
                                cursor: 'pointer',
                                position: 'relative',
                                transition: 'background 0.2s',
                                flexShrink: 0,
                            }}
                        >
                            <div style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                background: '#cdd6f4',
                                position: 'absolute',
                                top: '2px',
                                left: useKey ? '18px' : '2px',
                                transition: 'left 0.2s',
                            }} />
                        </div>
                        <label style={{ cursor: 'pointer', margin: 0 }} onClick={() => setUseKey(!useKey)}>Use Private Key</label>
                    </div>

                    {useKey ? (
                        <div className="form-group">
                            <label>Private Key Path</label>
                            <input type="text" value={privateKeyPath} onChange={e => setPrivateKeyPath(e.target.value)} placeholder="/home/user/.ssh/id_rsa" className="input-field" />
                        </div>
                    ) : (
                        <div className="form-group">
                            <label>Password</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-field" />
                        </div>
                    )}

                    <div className="modal-actions" style={{ marginTop: '10px' }}>
                        <button type="button" onClick={onCancel} className="modal-btn cancel">Cancel</button>
                        <button type="submit" className="modal-btn primary">Connect</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
