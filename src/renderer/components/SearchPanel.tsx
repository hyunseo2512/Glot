import { useState, useEffect } from 'react';
import { SearchIcon, FileIcon, FolderIcon } from './Icons';
import '../styles/SearchPanel.css';

interface SearchPanelProps {
    workspaceDir?: string;
    onFileOpen: (path: string) => void;
}

interface SearchResult {
    file: string;
    isDirectory: boolean;
    name: string;
}

function SearchPanel({ workspaceDir, onFileOpen }: SearchPanelProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Debounced search
    useEffect(() => {
        if (!query.trim() || !workspaceDir) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            setError(null);
            try {
                const result = await window.electron.search.text(workspaceDir, query);
                if (result.success) {
                    setResults(result.results || []);
                } else {
                    setError(result.error || 'Search failed');
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsSearching(false);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [query, workspaceDir]);

    const handleResultClick = (result: SearchResult) => {
        if (!result.isDirectory) {
            onFileOpen(result.file);
        }
    };

    if (!workspaceDir) {
        return (
            <div className="search-panel empty">
                <SearchIcon size={48} />
                <p>폴더를 열어주세요.</p>
            </div>
        );
    }

    const projectName = workspaceDir ? workspaceDir.split('/').pop() : 'Search';

    return (
        <div className="search-panel">
            <div className="search-header">
                <h3>{projectName}</h3>
            </div>

            <div className="search-input-container">
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search files and folders..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                />
                {isSearching && <div className="search-spinner">...</div>}
            </div>

            {error && <div className="search-error">{error}</div>}

            <div className="search-results">
                {query && !isSearching && results.length === 0 && (
                    <div className="search-no-results">
                        <p>No results found for "{query}"</p>
                    </div>
                )}

                {results.map((result, index) => (
                    <div
                        key={`${result.file}-${index}`}
                        className={`search-result-item ${result.isDirectory ? 'directory' : 'file'}`}
                        onClick={() => handleResultClick(result)}
                    >
                        <span className="search-icon">
                            {result.isDirectory ? <FolderIcon size={16} /> : <FileIcon size={16} />}
                        </span>
                        <div className="search-result-info">
                            <span className="search-result-name">
                                {highlightMatch(result.name, query)}
                            </span>
                            <span className="search-result-path">
                                {result.file.replace(workspaceDir + '/', '')}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Helper function to highlight matching text (case-insensitive)
function highlightMatch(text: string, query: string): JSX.Element {
    if (!query) return <>{text}</>;

    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);

    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase() ? (
                    <mark key={i} className="search-highlight">{part}</mark>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </>
    );
}

export default SearchPanel;
