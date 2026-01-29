import { app } from 'electron';
import path from 'path';
import { spawn, exec } from 'child_process';
import fs from 'fs';

export interface PythonExecutionResult {
    success: boolean;
    output: string;
    error?: string;
}

export class PythonService {
    private pythonPath: string;
    private isDev: boolean;

    constructor() {
        this.isDev = !app.isPackaged;
        this.pythonPath = this.resolvePythonPath();
        console.log('🐍 Python Service Initialized');
        console.log('🐍 Python Path:', this.pythonPath);
    }

    /**
     * Resolve the path to the bundled python executable.
     * In Dev: resources/python/bin/python (symlinked)
     * In Prod: resources/python/bin/python (bundled)
     */
    private resolvePythonPath(): string {
        let pythonPath: string;

        if (this.isDev) {
            // Development mode: look in project root/resources
            pythonPath = path.join(process.cwd(), 'resources', 'python', 'bin', 'python');
        } else {
            // Production mode: path changes to resources/python/bin/python
            // app.getAppPath() points to app.asar, so we need to go up to resources
            pythonPath = path.join(process.resourcesPath, 'python', 'bin', 'python');
        }

        // fallback check if file exists, if not use system python (for safety in dev)
        if (!fs.existsSync(pythonPath) && this.isDev) {
            console.warn('⚠️ Bundled Python not found in dev, falling back to system python3');
            return 'python3';
        }

        return pythonPath;
    }

    /**
     * Get Python version to verify runtime.
     */
    public async getVersion(): Promise<string> {
        return new Promise((resolve, reject) => {
            exec(`"${this.pythonPath}" --version`, (error, stdout, stderr) => {
                if (error) {
                    console.error('Python version check failed:', error);
                    resolve(`Error: ${error.message} (Path: ${this.pythonPath})`);
                    return;
                }
                resolve(stdout.trim() || stderr.trim());
            });
        });
    }

    /**
     * Run a simple python script string.
     */
    public async runScript(script: string): Promise<PythonExecutionResult> {
        return new Promise((resolve) => {
            const process = spawn(this.pythonPath, ['-c', script]);
            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve({ success: true, output: stdout });
                } else {
                    resolve({ success: false, output: stdout, error: stderr });
                }
            });

            process.on('error', (err) => {
                resolve({ success: false, output: '', error: err.message });
            });
        });
    }
}

export const pythonService = new PythonService();
