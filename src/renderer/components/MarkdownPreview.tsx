import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import MonacoCodeBlock from './MonacoCodeBlock';
import './MarkdownPreview.css';

interface MarkdownPreviewProps {
    content: string;
    fileName?: string;
    workspaceDir?: string;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, fileName, workspaceDir }) => {
    return (
        <div className="markdown-preview">
            <div className="markdown-preview-header">
                <span className="markdown-preview-label">Preview</span>
                {fileName && <span className="markdown-preview-filename">{fileName}</span>}
            </div>
            <div className="markdown-preview-body">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                        img(props) {
                            const { node, index, ...rest } = props as any;
                            let src = rest.src;
                            if (src && !src.startsWith('http') && !src.startsWith('data:') && workspaceDir) {
                                // Convert relative path to absolute file protocol path
                                const cleanPath = src.startsWith('/') ? src.slice(1) : src;
                                // Handle if it's already an absolute path on linux/mac
                                if (src.startsWith('/')) {
                                    src = `file://${src}`;
                                } else {
                                    src = `file://${workspaceDir}/${cleanPath}`;
                                }
                            }
                            return <img {...rest} src={src} style={{ maxWidth: '100%' }} />;
                        },
                        code(props) {
                            const { children, className, node, ...rest } = props as any;
                            const match = /language-(\w+)/.exec(className || '');
                            
                            // In newer react-markdown, we infer block vs inline 
                            // by checking if there's a language, or if it spans multiple lines.
                            const strChildren = String(children);
                            const isBlock = match || strChildren.includes('\n');

                            if (isBlock) {
                                return (
                                    <MonacoCodeBlock
                                        code={strChildren.replace(/\n$/, '')}
                                        language={match ? match[1].toLowerCase() : 'plaintext'}
                                    />
                                );
                            }

                            // Let MarkdownPreview.css handle the styling of inline code
                            return (
                                <code {...rest} className={className}>
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
