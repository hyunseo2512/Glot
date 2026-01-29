export { };

export interface DetectedRuntime {
    language: 'python' | 'node' | 'java';
    version: string;
    path: string;
    isSystem: boolean;
}

declare global {
    interface Window {
        electron: {
            python: {
                getVersion: () => Promise<string>;
                run: (script: string) => Promise<{ success: boolean; output: string; error?: string }>;
            };
            env: {
                scanPython: (projectRoot: string) => Promise<DetectedRuntime[]>;
            };

            auth: {
                onSuccess: (callback: (token: string) => void) => (() => void);
                verify: (token: string, backendUrl: string) => Promise<{ success: boolean; user?: any; error?: string; status?: number }>;
                login: (backendUrl: string, username: string, password: string) => Promise<{ success: boolean; data?: any; error?: string; status?: number }>;
                register: (backendUrl: string, email: string, password: string, fullName: string) => Promise<{ success: boolean; data?: any; error?: string; status?: number }>;
                getUsers: (backendUrl: string, token: string) => Promise<{ success: boolean; data?: any; error?: string; status?: number }>;
                updateUserRole: (backendUrl: string, token: string, email: string, role: string) => Promise<{ success: boolean; data?: any; error?: string; status?: number }>;
                deleteUser: (backendUrl: string, token: string, email: string) => Promise<{ success: boolean; data?: any; error?: string; status?: number }>;
            };

            // Existing API definitions (partial)
            ipcRenderer: {
                sendMessage(channel: string, args: unknown[]): void;
                on(channel: string, func: (...args: unknown[]) => void): (() => void) | undefined;
                once(channel: string, func: (...args: unknown[]) => void): void;
                invoke(channel: string, ...args: unknown[]): Promise<any>;
            };
            store: {
                get: (key: string) => Promise<any>;
                set: (key: string, value: any) => Promise<void>;
            };
            dialog: {
                openDirectory: () => Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>;
                openFile: () => Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>;
                saveFile: () => Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>;
                showMessageBox: (options: any) => Promise<{ success: boolean; response: number }>;
            };
            fs: {
                readFile: (path: string) => Promise<{ success: boolean; content?: string; error?: string }>;
                writeFile: (path: string, content: string) => Promise<{ success: boolean; error?: string }>;
                readDir: (path: string) => Promise<{ success: boolean; files?: { name: string; path: string; isDirectory: boolean }[]; error?: string }>;
                createFile: (path: string, content?: string) => Promise<{ success: boolean; error?: string }>;
                createDir: (path: string) => Promise<{ success: boolean; error?: string }>;
                rename: (oldPath: string, newPath: string) => Promise<{ success: boolean; error?: string }>;
                delete: (path: string) => Promise<{ success: boolean; error?: string }>;
                copy: (source: string, destination: string) => Promise<{ success: boolean; error?: string }>;
                exists: (path: string) => Promise<{ success: boolean; exists: boolean }>;
            };
            ssh: {
                connect: (config: any) => Promise<{ success: boolean; error?: string }>;
                disconnect: () => Promise<{ success: boolean; error?: string }>;
                startShell: (terminalId: string) => Promise<{ success: boolean; error?: string }>;
                execShell: (terminalId: string, command: string) => Promise<{ success: boolean; error?: string }>;
                closeShell: (terminalId: string) => Promise<{ success: boolean; error?: string }>;
                write: (terminalId: string, data: string) => void;
                resize: (terminalId: string, cols: number, rows: number) => void;
            };
            git: any;
            shell: {
                openExternal: (url: string) => Promise<void>;
            };
            search: {
                text: (workingDir: string, query: string) => Promise<{ success: boolean; results?: Array<{ file: string; isDirectory: boolean; name: string }>; error?: string }>;
                files: (workingDir: string, query: string) => Promise<{ success: boolean; files?: string[]; error?: string }>;
            };
            settings: {
                getPath: () => Promise<string>;
                read: () => Promise<{ success: boolean; data?: object; error?: string }>;
                write: (settings: object) => Promise<{ success: boolean; error?: string }>;
            };
            terminal: {
                start: (terminalId: string, shellType?: string, cols?: number, rows?: number, cwd?: string, initialCommand?: string) => Promise<{ success: boolean; terminalId?: string; error?: string }>;
                getSystemShell: () => Promise<{ success: boolean; shell?: string; error?: string }>;
                resize: (terminalId: string, cols: number, rows: number) => Promise<{ success: boolean; error?: string }>;
                write: (terminalId: string, data: string) => void;
                kill: (terminalId: string) => Promise<{ success: boolean; error?: string }>;
                onData: (callback: (terminalId: string, data: string) => void) => () => void;
                onExit: (callback: (terminalId: string, code: number) => void) => () => void;
            };
        };
    }
}
