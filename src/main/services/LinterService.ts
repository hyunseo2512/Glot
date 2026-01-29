import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

const execAsync = promisify(exec);

export interface LintResult {
    line: number;
    column: number;
    type: 'error' | 'warning' | 'info';
    message: string;
    symbol: string;
    messageId: string;
}

export class LinterService {
    private ruffPath: string;

    constructor() {
        // Detect Ruff Path
        const isDev = !app.isPackaged;
        if (isDev) {
            // In dev, run from project root -> resources/python/bin/ruff
            this.ruffPath = path.join(process.cwd(), 'resources/python/bin/ruff');
        } else {
            // In prod
            this.ruffPath = path.join(app.getAppPath(), 'resources/python/bin/ruff');
        }
    }

    /**
     * Check Python file using Ruff (Embedded)
     */
    async checkPython(filePath: string): Promise<LintResult[]> {
        // Debug logging to specific file - Initialize FIRST
        const logFile = '/tmp/gluon_linter.log';
        const log = (msg: string) => {
            try { fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`); } catch (e) { }
        };

        log(`[Check] Request for: ${filePath}`);

        if (!fs.existsSync(filePath)) {
            log(`[Check] File not found: ${filePath}`);
            return [];
        }

        if (!fs.existsSync(this.ruffPath)) {
            log(`Ruff binary not found at: ${this.ruffPath}`);
            return [];
        }

        try {
            // Ruff check --output-format=json
            const command = `"${this.ruffPath}" check --output-format=json "${filePath}"`;
            log(`Executing: ${command}`);

            const { stdout } = await execAsync(command);
            log(`Success stdout len: ${stdout.length}`);
            return this.parseRuffOutput(stdout);

        } catch (error: any) {
            // Ruff exits with 1 if violations found
            if (error.stdout) {
                log(`Exit 1 (Violations) stdout len: ${error.stdout.length}`);
                return this.parseRuffOutput(error.stdout);
            }
            log(`Error: ${error.message}`);
            // If stderr exists
            if (error.stderr) log(`Stderr: ${error.stderr}`);

            console.error('Ruff check failed:', error);
            return [];
        }
    }

    private parseRuffOutput(stdout: string): LintResult[] {
        try {
            if (!stdout || stdout.trim().length === 0) return [];
            const results = JSON.parse(stdout);

            if (!Array.isArray(results)) return [];

            return results.map((msg: any) => {
                // Ruff 에러 코드별 심각도 분류
                // F: Pyflakes (실제 버그 가능성) → error
                // E: PEP 8 스타일 → warning
                // W: 경고 → warning
                // C: Convention → info
                // 나머지 (I, N, D, UP 등): 스타일/리팩토링 → warning
                const code = msg.code || '';
                const type = code.startsWith('F') ? 'error' :
                    (code.startsWith('E') || code.startsWith('W')) ? 'warning' : 'info';

                return {
                    line: msg.location.row,
                    column: msg.location.column,
                    type,
                    message: msg.message,
                    symbol: msg.code,
                    messageId: msg.code
                };
            });
        } catch (e) {
            console.warn('Failed to parse ruff output:', e);
            return [];
        }
    }

    /**
     * Check C/C++ file using GCC/G++
     */
    async checkC(filePath: string): Promise<LintResult[]> {
        const logFile = '/tmp/gluon_linter.log';
        const log = (msg: string) => {
            try { fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`); } catch (e) { }
        };

        log(`[C Check] Request for: ${filePath}`);

        if (!fs.existsSync(filePath)) {
            log(`[C Check] File not found: ${filePath}`);
            return [];
        }

        // C++ 파일이면 g++, C 파일이면 gcc 사용
        const ext = path.extname(filePath).toLowerCase();
        const isCpp = ['.cpp', '.cc', '.cxx', '.hpp', '.hh', '.hxx'].includes(ext);
        const compiler = isCpp ? 'g++' : 'gcc';

        try {
            // -fsyntax-only: 문법 검사만 수행 (컴파일 안 함)
            // -Wall -Wextra: 모든 경고 활성화
            // -fdiagnostics-format=json: JSON 형식 출력 (GCC 10+) - 지원 안되면 텍스트 파싱
            const command = `${compiler} -fsyntax-only -Wall -Wextra "${filePath}" 2>&1`;
            log(`Executing: ${command}`);

            await execAsync(command);
            // 성공하면 에러 없음
            log(`Success (no errors)`);
            return [];

        } catch (error: any) {
            // GCC는 에러 시 exit 1 반환
            const output = error.stdout || error.stderr || '';
            log(`Exit 1 (Errors/Warnings) output len: ${output.length}`);
            return this.parseGccOutput(output, filePath);
        }
    }

    private parseGccOutput(output: string, filePath: string): LintResult[] {
        const results: LintResult[] = [];
        const lines = output.split('\n');
        const fileName = path.basename(filePath);

        // GCC 출력 형식: file.c:10:5: error: expected ';' before '}'
        // 또는: file.c:10:5: warning: unused variable 'x' [-Wunused-variable]
        const regex = /^(.+):(\d+):(\d+):\s*(error|warning|note):\s*(.+)$/;

        for (const line of lines) {
            const match = line.match(regex);
            if (match) {
                const [, file, lineNum, colNum, type, message] = match;

                // 해당 파일의 에러만 포함
                if (file.includes(fileName) || file === filePath) {
                    results.push({
                        line: parseInt(lineNum, 10),
                        column: parseInt(colNum, 10),
                        type: type === 'error' ? 'error' : (type === 'warning' ? 'warning' : 'info'),
                        message: message.trim(),
                        symbol: type.toUpperCase(),
                        messageId: `GCC_${type.toUpperCase()}`
                    });
                }
            }
        }

        return results;
    }
}

export const linterService = new LinterService();
