/**
 * Protected Route component for role-based access control.
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function ProtectedRoute({ children, roles }) {
    const { user, isAuthenticated, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (roles && !roles.includes(user?.role)) {
        // User doesn't have required role - 403 Access Denied
        return (
            <div className="error-page">
                <div className="error-code">403</div>
                <p className="error-message">Access Denied. You do not have permission to view this page.</p>
                <button
                    className="btn btn-primary"
                    onClick={() => window.history.back()}
                >
                    Go Back
                </button>
            </div>
        );
    }

    return children;
}

export default ProtectedRoute;
