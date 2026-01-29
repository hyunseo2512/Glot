import React, { useEffect, useState } from 'react';
import * as monacoEditor from 'monaco-editor';
import { gluonQuantumTheme } from '../themes/gluonQuantum';
import { gluonNeonTheme } from '../themes/gluonNeon';
import { gluonCarbonTheme } from '../themes/gluonCarbon';
import { gluonJavaTheme } from '../themes/gluonJava';
import type { editor } from 'monaco-editor';

// ── Theme Mapping (Language → Gluon Theme) ──
const getThemeForLanguage = (lang: string): editor.IStandaloneThemeData => {
    switch (lang) {
        case 'python': case 'py':
            return gluonQuantumTheme;
        case 'c': case 'cpp': case 'h': case 'hpp':
            return gluonCarbonTheme;
        case 'java':
            return gluonJavaTheme;
        case 'javascript': case 'js': case 'typescript': case 'ts':
            return gluonNeonTheme;
        default: // HTML, CSS, etc.
            return gluonNeonTheme;
    }
};

// ── Build color map from theme rules ──
const buildColorMap = (theme: editor.IStandaloneThemeData) => {
    const map: Record<string, { color?: string; fontWeight?: string; fontStyle?: string }> = {};
    for (const rule of theme.rules) {
        const entry: typeof map[string] = {};
        if (rule.foreground) entry.color = '#' + rule.foreground;
        if (rule.fontStyle?.includes('bold')) entry.fontWeight = 'bold';
        if (rule.fontStyle?.includes('italic')) entry.fontStyle = 'italic';
        map[rule.token] = entry;
    }
    return map;
};

// ── Find best matching color for a token type ──
const resolveTokenColor = (
    tokenType: string,
    colorMap: ReturnType<typeof buildColorMap>
) => {
    // Try exact match first: "keyword.control.python" → exact
    if (colorMap[tokenType]) return colorMap[tokenType];

    // Strip language suffix: "keyword.control.python" → "keyword.control"
    const withoutLang = tokenType.replace(/\.\w+$/, '');
    if (colorMap[withoutLang]) return colorMap[withoutLang];

    // Try base token only: "keyword.control" → "keyword"
    const base = tokenType.split('.')[0];
    if (colorMap[base]) return colorMap[base];

    // Fallback to default
    return colorMap[''] || { color: '#D4D4D4' };
};

// ── Escape HTML special chars ──
const escapeHtml = (text: string) =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── Heuristic Token Refinement (Simulate Semantic Highlighting) ──
const refineTokens = (tokens: monacoEditor.Token[][], code: string, language: string) => {
    if (language !== 'java') return tokens; // Only enabled for Java for now

    const lines = code.split('\n');

    // Regex Patterns (Matched to CodeEditor.tsx)
    const CLASS_RE = /@?\b[A-Z][a-zA-Z0-9_]*\b/g;
    const METHOD_RE = /\b(\w+)\s*\(/g;

    return tokens.map((lineTokens, lineIndex) => {
        const line = lines[lineIndex];
        if (!line) return lineTokens;

        // We can't easily split tokens, so we will just MUTATE the token type 
        // if the ENTIRE token matches our heuristic. 
        // This is a simplification. Monaco 'tokenize' usually breaks by word.

        return lineTokens.map(t => {
            // Get text for this token
            // Note: Monaco tokens in the array only have 'offset'. 
            // We need to find the end of this token.
            // But 'tokens' passed here are per-line. 
            // Let's assume we can't easily refine without re-tokenizing.
            // Actually, we can just apply regex to the whole line and check overlaps.
            return t;
        });
    });
};

// ── Alternative: Post-process the 'token' type during HTML build ──
const enhanceTokenType = (text: string, type: string, language: string, prevTokenText: string): string => {
    if (language === 'java') {
        if (type === 'identifier') {
            // Class/Annotation Detection
            if (/^[A-Z]/.test(text) && text !== text.toUpperCase()) {
                // Check effective line context? Hard in this loop.
                // Simple heuristic: PascalCase = class
                return 'class';
            }
            // Annotation
            if (text.startsWith('@')) {
                return 'annotation';
            }
        }
        // Function detection is hard without lookahead.
    }
    return type;
};

// ── Build HTML from tokens + theme ──
const buildHtmlFromTokens = (code: string, language: string) => {
    const theme = getThemeForLanguage(language);
    const colorMap = buildColorMap(theme);
    const lines = code.split('\n');
    const tokenized = monacoEditor.editor.tokenize(code, language);

    let result = '';
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineTokens = tokenized[i] || [];

        if (lineTokens.length === 0) {
            result += escapeHtml(line) + '\n';
            continue;
        }

        for (let j = 0; j < lineTokens.length; j++) {
            const token = lineTokens[j];
            const nextOffset = j + 1 < lineTokens.length
                ? lineTokens[j + 1].offset
                : line.length;
            const text = line.substring(token.offset, nextOffset);

            if (!text) continue;

            // ── HEURISTIC ENHANCEMENT START ──
            let finalType = token.type;

            // Java Semantic Simulation
            if (language === 'java') {
                // 1. Annotations (@Interface) - Monarch might call it 'identifier' or 'annotation' depending on grammar
                // If text starts with @, treat as annotation
                if (text.startsWith('@')) {
                    finalType = 'annotation';
                }
                // 2. Classes (PascalCase)
                else if (finalType.includes('identifier') && /^[A-Z][a-zA-Z0-9_]*$/.test(text)) {
                    // Exclude CONSTANTS (ALL_CAPS)
                    if (text !== text.toUpperCase()) {
                        finalType = 'class';
                    }
                }
                // 3. Methods (Lookahead check)
                // If next char is '(', it's a function.
                else if (finalType.includes('identifier')) {
                    // Look at the character immediately following this token in the line
                    const charAfter = line[nextOffset];
                    // Allow optional whitespace
                    const restOfLine = line.substring(nextOffset);
                    if (/^\s*\(/.test(restOfLine)) {
                        finalType = 'function';
                    }
                }
            }
            // ── HEURISTIC ENHANCEMENT END ──

            const tokenStyle = resolveTokenColor(finalType, colorMap);

            const styleStr = [
                tokenStyle.color ? `color:${tokenStyle.color}` : '',
                tokenStyle.fontWeight ? `font-weight:${tokenStyle.fontWeight}` : '',
                tokenStyle.fontStyle ? `font-style:${tokenStyle.fontStyle}` : '',
            ].filter(Boolean).join(';');

            result += `<span style="${styleStr}">${escapeHtml(text)}</span>`;
        }
        result += '\n';
    }

    return result;
};

interface MonacoCodeBlockProps {
    code: string;
    language: string;
    style?: React.CSSProperties;
}

// ── Monaco-based Code Block Component ──
const MonacoCodeBlock: React.FC<MonacoCodeBlockProps> = ({ code, language, style }) => {
    // 1. Try to render synchronously first to avoid flash (layout shift)
    const [html, setHtml] = useState<string>(() => {
        try {
            // Attempt synchronous tokenization
            // Note: This works if the language basic tokenizer is already loaded in Monaco
            return buildHtmlFromTokens(code, language);
        } catch (e) {
            // Fallback: render raw code immediately so it doesn't collapse
            return escapeHtml(code);
        }
    });

    useEffect(() => {
        // 2. Ensure language is loaded and re-tokenize if needed
        // This handles cases where the language wasn't ready during initial render
        monacoEditor.editor.colorize(' ', language, { tabSize: 4 })
            .then(() => {
                const result = buildHtmlFromTokens(code, language);
                setHtml(prev => {
                    // Only update if different to avoid unnecessary re-renders
                    if (prev !== result) return result;
                    return prev;
                });
            })
            .catch(() => {
                // Fallback for colorize failure
                const result = escapeHtml(code);
                setHtml(prev => (prev !== result ? result : prev));
            });
    }, [code, language]);

    return (
        <div
            className="monaco-code-block"
            dangerouslySetInnerHTML={{ __html: html }}
            style={{
                fontFamily: "'Fira Code', Consolas, monospace",
                fontSize: '13px',
                lineHeight: '1.6',
                whiteSpace: 'pre',
                overflowX: 'auto',
                minHeight: '1.6em', // Prevent 0-height collapse
                ...style,
            }}
        />
    );
};

export default MonacoCodeBlock;
