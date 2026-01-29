import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MonacoCodeBlock from './MonacoCodeBlock';
import './MarkdownPreview.css';

interface MarkdownPreviewProps {
    content: string;
    fileName?: string;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, fileName }) => {
    return (
        <div className="markdown-preview">
            <div className="markdown-preview-header">
                <span className="markdown-preview-label">Preview</span>
                {fileName && <span className="markdown-preview-filename">{fileName}</span>}
            </div>
            <div className="markdown-preview-body">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        code(props) {
                            const { children, className, node, ...rest } = props;
                            // Check if it's an inline code snippet or a block
                            // react-markdown passes 'inline' boolean in props
                            const isInline = (props as any).inline;
                            const match = /language-(\w+)/.exec(className || '');

                            if (!isInline) {
                                return (
                                    <MonacoCodeBlock
                                        code={String(children).replace(/\n$/, '')}
                                        language={match ? match[1].toLowerCase() : 'plaintext'}
                                    />
                                );
                            }

                            return (
                                <code {...rest} className={className} style={{
                                    backgroundColor: 'rgba(120, 120, 120, 0.2)',
                                    padding: '0.2em 0.4em',
                                    borderRadius: '4px',
                                    fontSize: '85%',
                                    color: 'var(--text-primary)' // Ensure visibility
                                }}>
                                    {children}
                                </code>
                            );
                        }
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>
        </div>
    );
};

export default MarkdownPreview;
