/**
 * Error Boundary component to catch React errors and prevent white screens.
 */
import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '20px',
                    maxWidth: '600px',
                    margin: '50px auto',
                    backgroundColor: '#fee2e2',
                    borderRadius: '8px',
                    border: '1px solid #fca5a5'
                }}>
                    <h2 style={{ color: '#dc2626', marginBottom: '16px' }}>Something went wrong</h2>
                    <p style={{ marginBottom: '16px' }}>
                        An unexpected error occurred. Please try refreshing the page.
                    </p>
                    {this.state.error && (
                        <details style={{ marginBottom: '16px' }}>
                            <summary style={{ cursor: 'pointer', color: '#dc2626' }}>
                                Error details
                            </summary>
                            <pre style={{
                                padding: '12px',
                                backgroundColor: '#fff',
                                borderRadius: '4px',
                                overflow: 'auto',
                                fontSize: '12px',
                                marginTop: '8px'
                            }}>
                                {this.state.error.toString()}
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </details>
                    )}
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Refresh Page
                    </button>
                    <button
                        onClick={() => {
                            this.setState({ hasError: false, error: null, errorInfo: null });
                            window.history.back();
                        }}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            marginLeft: '12px'
                        }}
                    >
                        Go Back
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
