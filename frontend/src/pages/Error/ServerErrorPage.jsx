/**
 * 500 Server Error Page
 */
import React from 'react';
import { Link } from 'react-router-dom';

function ServerErrorPage() {
    return (
        <div className="page">
            <div className="error-page">
                <div className="error-code">500</div>
                <p className="error-message">Something went wrong. Our team has been notified.</p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => window.location.reload()}
                    >
                        Retry
                    </button>
                    <Link to="/" className="btn btn-primary">
                        Go Home
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default ServerErrorPage;
