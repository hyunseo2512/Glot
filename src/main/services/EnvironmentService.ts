import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DetectedRuntime {
    language: 'python' | 'node' | 'java';
    version: string;
    path: string;
    isSystem: boolean; // True if from PATH, False if from local venv/node_modules
}

export class EnvironmentService {
    constructor() { }

    /**
     * Scan for Python interpreters
     * 1. Check project root for venv/virtualenv
     * 2. Check system PATH (python3, python)
     */
    async scanPython(projectRoot?: string): Promise<DetectedRuntime[]> {
        const runtimes: DetectedRuntime[] = [];
        const uniquePaths = new Set<string>();

        // 1. Check Local (venv)
        if (projectRoot) {
            const venvNames = ['venv', '.venv', 'env', '.env'];
            const binDir = os.platform() === 'win32' ? 'Scripts' : 'bin';
            const exeName = os.platform() === 'win32' ? 'python.exe' : 'python';

            for (const name of venvNames) {
                const fullPath = path.join(projectRoot, name, binDir, exeName);
                if (fs.existsSync(fullPath)) {
                    const version = await this.getVersion(fullPath);
                    if (version && !uniquePaths.has(fullPath)) {
                        runtimes.push({
                            language: 'python',
                            version,
                            path: fullPath,
                            isSystem: false,
                        });
                        uniquePaths.add(fullPath);
                    }
                }
            }
        }

        // 2. Check System
        const systemCommands = os.platform() === 'win32' ? ['python', 'py'] : ['python3', 'python'];
        for (const cmd of systemCommands) {
            try {
                const { stdout } = await execAsync(os.platform() === 'win32' ? `where ${cmd}` : `which ${cmd}`);
                const paths = stdout.split('\n').filter(p => p.trim());

                for (const p of paths) {
                    const cleanPath = p.trim();
                    if (cleanPath && !uniquePaths.has(cleanPath)) {
                        const version = await this.getVersion(cleanPath);
                        if (version) {
                            runtimes.push({
                                language: 'python',
                                version,
                                path: cleanPath,
                                isSystem: true,
                            });
                            uniquePaths.add(cleanPath);
                        }
                    }
                }
            } catch (e) {
                // Command not found, ignore
            }
        }

        return runtimes;
    }

    private async getVersion(cmd: string): Promise<string | null> {
        try {
            const { stdout } = await execAsync(`"${cmd}" --version`);
            // Output: "Python 3.12.3" -> "3.12.3"
            return stdout.trim().replace('Python ', '');
        } catch {
            return null;
        }
    }
}

export const environmentService = new EnvironmentService();
