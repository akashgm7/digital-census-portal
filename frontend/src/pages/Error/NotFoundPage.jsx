/**
 * 404 Not Found Page
 */
import React from 'react';
import { Link } from 'react-router-dom';

function NotFoundPage() {
    return (
        <div className="page">
            <div className="error-page">
                <div className="error-code">404</div>
                <p className="error-message">Page not found. The page you are looking for does not exist.</p>
                <Link to="/" className="btn btn-primary">
                    Go Home
                </Link>
            </div>
        </div>
    );
}

export default NotFoundPage;
