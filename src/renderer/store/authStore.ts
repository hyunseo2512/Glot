import { create } from 'zustand';

interface User {
    id: string;
    username: string;
    email?: string;
    full_name?: string;
    picture?: string;
    role: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    backendUrl: string | null;
    authError: string | null;
    isLoginModalOpen: boolean;

    login: () => Promise<void>;
    logout: () => void;
    checkAuth: () => Promise<void>;
    manualLogin: (token: string) => Promise<boolean>;

    // Local Auth & UI
    openLoginModal: () => void;
    closeLoginModal: () => void;
    loginLocal: (username: string, password: string) => Promise<boolean>;
    register: (username: string, password: string, fullName: string) => Promise<boolean>;
    clearAuthError: () => void;
}

// [CRITICAL] 사설 인증서(Self-signed) 허용을 위한 Axios 설정
// 브라우저 환경에서는 https.Agent를 직접 쓸 수 없으므로,
// Electron Main Process를 통해 요청하거나, 
// 여기서는 `rejectUnauthorized`가 렌더러에서 직접 안 먹힐 수 있음 주의.
// 하지만 axios 설정으로 시도.
// *렌더러 프로세스에서 직접 https 모듈 사용 불가 시, window.electron.fetch 등으로 우회 필요할 수도 있음.
// 일단 단순 axios config로는 브라우저 보안 정책을 못 뚫을 수 있으므로
// 가장 확실한 방법은 Main Process에 요청을 위임하는 것.

// 대안: 인증서 에러를 무시하도록 앱 실행 시점에 플래그를 주거나,
// 지금은 일단 Axios 인스턴스에 설정을 넣어봄.

// Default AI Core URL (Tailscale/Remote)
const DEFAULT_BACKEND_URL = 'http://100.110.157.32:9000';

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    token: null,
    isLoading: true,
    backendUrl: null,
    authError: null,
    isLoginModalOpen: false,

    openLoginModal: () => set({ isLoginModalOpen: true, authError: null }),
    closeLoginModal: () => set({ isLoginModalOpen: false, authError: null }),
    clearAuthError: () => set({ authError: null }),

    // 로그인 시작 (외부 브라우저 열기)
    login: async () => {
        // Backend URL 가져오기
        const result = await window.electron.store.get('ai_core_url');
        let BACKEND_URL = DEFAULT_BACKEND_URL;

        if (result.success && result.value) {
            let val = String(result.value).trim();
            // Remove trailing slash
            val = val.replace(/\/$/, '');

            // [FIX] Force overwrite check removed for remote access support
            // if (val.includes('localhost') || val.includes('127.0.0.1')) { ... }

            // Add protocol if missing (default to http for private networks usually, unless specified)
            if (!val.startsWith('http')) {
                val = `http://${val}`;
            }
            BACKEND_URL = val;
        }

        console.log('🔗 Login Target URL:', BACKEND_URL);

        // Eden Backend로 직접 요청 (source=desktop&callback_scheme=glot 파라미터 추가)
        const loginUrl = `${BACKEND_URL}/auth/login/google?source=desktop&callback_scheme=glot`;

        // 메인 프로세스(IPC)를 통해 브라우저 열기
        await window.electron.shell.openExternal(loginUrl);
    },

    logout: async () => {
        try {
            console.log('🚪 Logging out...');
            // Try to set null first to ensure overwrite
            await window.electron.store.set('token', null);
            // Then delete
            await window.electron.store.delete('token');

            // Clear state + 로그인 화면으로
            set({ user: null, token: null, authError: null, isLoginModalOpen: true });
            console.log('✅ Logout successful, state cleared.');

            // Force reload to ensure clean state (Optional, but often safer for auth)
            // window.location.reload(); 
        } catch (error) {
            console.error('Logout failed:', error);
            // Even if store fails, clear local state
            set({ user: null, token: null, authError: null });
        }
    },

    checkAuth: async () => {
        try {
            set({ isLoading: true, authError: null });
            // 저장된 토큰 가져오기
            const result = await window.electron.store.get('token');
            const token = result.success ? result.value : null;

            // Eden Backend URL 가져오기
            const urlResult = await window.electron.store.get('ai_core_url');
            let BACKEND_URL = DEFAULT_BACKEND_URL;

            if (urlResult.success && urlResult.value) {
                try {
                    // 사용자가 전체 경로(예: .../callback/google)를 입력했더라도 Origin만 추출
                    const urlObj = new URL(String(urlResult.value));
                    BACKEND_URL = urlObj.origin;
                } catch (e) {
                    // URL 파싱 실패 시 단순 슬래시 제거 후 사용 (http:// 붙여줌)
                    let val = String(urlResult.value).replace(/\/$/, '');
                    if (!val.startsWith('http')) val = `http://${val}`;
                    BACKEND_URL = val;
                }
            }

            // 상태에 URL 저장 (디버깅용)
            set({ backendUrl: BACKEND_URL });

            if (token) {
                // 토큰으로 유저 정보 가져오기 (via Main Process IPC)
                // [CRITICAL] 렌더러에서 직접 Axios 호출 시 SSL/CORS 문제 발생하므로 Main Process에 위임
                try {
                    const result = await window.electron.auth.verify(token, BACKEND_URL);

                    if (result.success && result.user) {
                        set({ user: result.user, token, authError: null });
                    } else {
                        throw { message: result.error, response: { status: result.status } };
                    }
                } catch (error: any) {
                    console.error('Failed to fetch user:', error);
                    const errMsg = error.message || 'Unknown Error';
                    set({ authError: errMsg });

                    // 401 Unauthorized일 때만 토큰 삭제 (네트워크 에러 등은 유지)
                    if (error.response && error.response.status === 401) {
                        await window.electron.store.delete('token');
                        set({ user: null, token: null });
                    } else {
                        // 다른 에러면 유저는 null이지만 토큰은 유지 (재시도 가능하게)
                        set({ user: null });
                    }
                }
            } else {
                set({ user: null, token: null });
            }
        } catch (error: any) {
            console.error('Auth check failed:', error);
            set({ user: null, token: null, authError: error.message });
        } finally {
            set({ isLoading: false });
        }
    },

    // 수동 로그인 (토큰 직접 입력)
    manualLogin: async (inputToken: string) => {
        set({ isLoading: true, authError: null });
        try {
            const backendUrl = get().backendUrl || DEFAULT_BACKEND_URL;

            // 토큰 검증 via Main Process
            const result = await window.electron.auth.verify(inputToken, backendUrl);

            if (result.success && result.user) {
                // 검증 성공 시 토큰 저장 및 상태 업데이트
                await window.electron.store.set('token', inputToken);
                set({ user: result.user, token: inputToken, authError: null });
                return true;
            } else {
                throw new Error(result.error || 'Invalid token');
            }
        } catch (error: any) {
            console.error('Manual login failed:', error);
            set({ authError: error.message || '로그인 실패: 유효하지 않은 토큰입니다.' });
            return false;
        } finally {
            set({ isLoading: false });
        }
    },

    loginLocal: async (username, password) => {
        set({ isLoading: true, authError: null });
        try {
            // Get backend URL
            const result = await window.electron.store.get('ai_core_url');
            let BACKEND_URL = DEFAULT_BACKEND_URL;
            if (result.success && result.value) {
                BACKEND_URL = String(result.value).replace(/\/$/, '');
                if (!BACKEND_URL.startsWith('http')) BACKEND_URL = `http://${BACKEND_URL}`;
            }

            // IPC를 통해 메인 프로세스에서 요청 (렌더러 보안 정책 우회)
            const loginResult = await window.electron.auth.login(BACKEND_URL, username, password);

            if (loginResult.success && loginResult.data) {
                const token = loginResult.data.access_token;
                await window.electron.store.set('token', token);
                set({ token, authError: null });
                await get().checkAuth();
                return true;
            } else {
                throw new Error(loginResult.error || 'Login failed');
            }
        } catch (error: any) {
            console.error('Local login failed:', error);
            set({ authError: error.message || 'Login failed', isLoading: false });
            return false;
        }
    },

    register: async (username, password, fullName) => {
        set({ isLoading: true, authError: null });
        try {
            // Get backend URL
            const result = await window.electron.store.get('ai_core_url');
            let BACKEND_URL = DEFAULT_BACKEND_URL;
            if (result.success && result.value) {
                BACKEND_URL = String(result.value).replace(/\/$/, '');
                if (!BACKEND_URL.startsWith('http')) BACKEND_URL = `http://${BACKEND_URL}`;
            }

            // IPC를 통해 메인 프로세스에서 요청
            const regResult = await window.electron.auth.register(BACKEND_URL, username, password, fullName);

            if (regResult.success && regResult.data) {
                // 회원가입 성공 → 로그인 화면으로 (자동 로그인 안 함)
                set({ isLoading: false, authError: null });
                return true;
            } else {
                throw new Error(regResult.error || 'Registration failed');
            }
        } catch (error: any) {
            console.error('Registration failed:', error);
            set({ authError: error.message || 'Registration failed', isLoading: false });
            return false;
        }
    },
}));

// 메인 프로세스로부터 로그인 성공 메시지 수신 (Deep Link)
if (window.electron && window.electron.auth) {
    window.electron.auth.onSuccess(async (token) => {
        console.log('🔒 Auth success event received form Main process');

        // Eden Backend URL 가져오기 (비동기 처리)
        const urlResult = await window.electron.store.get('ai_core_url');
        let BACKEND_URL = DEFAULT_BACKEND_URL;

        if (urlResult.success && urlResult.value) {
            try {
                const urlObj = new URL(String(urlResult.value));
                BACKEND_URL = urlObj.origin;
            } catch (e) {
                let val = String(urlResult.value).replace(/\/$/, '');
                if (!val.startsWith('http')) val = `http://${val}`;
                BACKEND_URL = val;
            }
        }

        // 토큰 설정 및 유저 정보 조회 (Robust Method via IPC)
        try {
            // BACKEND_URL은 이미 위에서 계산됨
            const result = await window.electron.auth.verify(token, BACKEND_URL);

            if (result.success && result.user) {
                console.log('✅ Deep Link Auth Verified!', result.user.email);
                useAuthStore.setState({ user: result.user, token, isLoading: false, backendUrl: BACKEND_URL });
            } else {
                console.error('Deep Link Auth Failed:', result.error);
            }
        } catch (error) {
            console.error('Failed to verify token from deep link:', error);
        }
    });
}
