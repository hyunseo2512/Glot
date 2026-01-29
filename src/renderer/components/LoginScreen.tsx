import { useState, useEffect } from 'react';
import { Lock, User, AlertCircle, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import '../styles/LoginScreen.css';

export function LoginScreen() {
    const { closeLoginModal, loginLocal, register, authError, isLoading } = useAuthStore();
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [fullName, setFullName] = useState('');

    // Reset components when mounted
    useEffect(() => {
        setUsername('');
        setPassword('');
        setFullName('');
        setIsRegister(false);
        useAuthStore.getState().clearAuthError();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isRegister) {
            const success = await register(username, password, fullName);
            if (success) {
                // 회원가입 성공 → 로그인 화면으로 전환
                setIsRegister(false);
                setPassword('');
                setFullName('');
            }
        } else {
            const success = await loginLocal(username, password);
            if (success) {
                closeLoginModal();
            }
        }
    };

    return (
        <div className="login-screen">
            <div className="login-content">
                <div className="login-header">
                    <h1>Gluon</h1>
                    <p>PRO • V0.1.0</p>
                </div>

                <div className="login-card">
                    {authError && (
                        <div className="error-message">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{authError}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="login-form">
                        {isRegister && (
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <div className="input-wrapper">
                                    <User className="input-icon" size={18} />
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="form-input"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">ID</label>
                            <div className="input-wrapper">
                                <User className="input-icon" size={18} />
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="form-input"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <div className="input-wrapper">
                                <Lock className="input-icon" size={18} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="form-input password-input"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="password-toggle-btn"
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <Eye size={18} />
                                    ) : (
                                        <EyeOff size={18} />
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="submit-btn"
                        >
                            {isLoading ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <Loader2 className="animate-spin" size={18} />
                                    <span>Processing...</span>
                                </div>
                            ) : (
                                <span>{isRegister ? 'Create Account' : 'Sign In'}</span>
                            )}
                        </button>
                    </form>

                    <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <button
                            type="button"
                            onClick={() => {
                                setIsRegister(!isRegister);
                                useAuthStore.getState().clearAuthError();
                            }}
                            className="toggle-mode-btn"
                        >
                            <span>{isRegister ? 'Already have an account?' : "Don't have an account?"}</span>
                            <span className="highlight">{isRegister ? 'Sign In' : 'Sign Up'}</span>
                        </button>

                        <button
                            onClick={closeLoginModal}
                            className="back-btn"
                        >
                            <ArrowLeft size={14} />
                            <span>Back to Editor</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
