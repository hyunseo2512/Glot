import React, { Component, ErrorInfo, ReactNode } from "react";
import './ErrorBoundary.css'; // We'll create this CSS

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    countdown: number;
}

class ErrorBoundary extends Component<Props, State> {
    private timer: NodeJS.Timeout | null = null;

    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            countdown: 10 // 10 seconds default
        };
    }

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error, errorInfo: null, countdown: 10 };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });

        // Start countdown for auto-close
        this.timer = setInterval(() => {
            this.setState(prevState => {
                if (prevState.countdown <= 1) {
                    this.forceClose();
                    return { ...prevState, countdown: 0 };
                }
                return { ...prevState, countdown: prevState.countdown - 1 };
            });
        }, 1000);
    }

    componentWillUnmount() {
        if (this.timer) clearInterval(this.timer);
    }

    forceClose = () => {
        if (window.electron && window.electron.window) {
            window.electron.window.close();
        } else {
            window.close();
        }
    };

    handleReport = () => {
        const { error, errorInfo } = this.state;
        const errorLog = `Error: ${error?.toString()}\n\nComponent Stack:\n${errorInfo?.componentStack}`;

        // Copy to clipboard
        navigator.clipboard.writeText(errorLog).then(() => {
            alert("Error log copied to clipboard! Please email it to developer.");
            // If we had a backend email service, we would call it here.
            // For now, we open a mailto link
            const subject = encodeURIComponent("Gluon Crash Report");
            const body = encodeURIComponent(errorLog);
            window.open(`mailto:dev@gluon.com?subject=${subject}&body=${body}`);
        });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary-overlay">
                    <div className="error-modal">
                        <h2>Application Crashed</h2>
                        <p>Something went wrong. The application will close in <strong>{this.state.countdown}</strong> seconds to prevent data corruption.</p>

                        <div className="error-details">
                            <pre>{this.state.error?.toString()}</pre>
                        </div>

                        <div className="error-actions">
                            <button className="report-btn" onClick={this.handleReport}>
                                Copy & Report Issue
                            </button>
                            <button className="close-btn" onClick={this.forceClose}>
                                Close Now
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
