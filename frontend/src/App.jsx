/**
 * Main App component with role-based routing.
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import useOnlineStatus from './hooks/useOnlineStatus';

// Layout Components
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Layout/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Auth Pages
import LoginPage from './pages/Login/LoginPage';
import ProfilePage from './pages/Profile/ProfilePage';

// Admin Pages
import AdminDashboard from './pages/Admin/AdminDashboard';
import UserManagement from './pages/Admin/UserManagement';
import BulkUpload from './pages/Admin/BulkUpload';

// Supervisor Pages
import SupervisorDashboard from './pages/Supervisor/SupervisorDashboard';
import VerifySurveys from './pages/Supervisor/VerifySurveys';

// Surveyor Pages
import SurveyorDashboard from './pages/Surveyor/SurveyorDashboard';
import SurveyForm from './pages/Surveyor/SurveyForm';
import SurveyHistory from './pages/Surveyor/SurveyHistory';

// Error Pages
import NotFoundPage from './pages/Error/NotFoundPage';
import ServerErrorPage from './pages/Error/ServerErrorPage';

// Idle Warning Modal
import IdleWarningModal from './components/IdleWarningModal';

function App() {
    const { loading, showIdleWarning, dismissIdleWarning, user } = useAuth();
    const isOnline = useOnlineStatus();

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        );
    }

    // Determine home redirect based on role
    const getHomeRedirect = () => {
        if (!user) return '/login';
        switch (user.role) {
            case 'ADMIN': return '/admin/dashboard';
            case 'SUPERVISOR': return '/supervisor/dashboard';
            case 'SURVEYOR': return '/surveyor/dashboard';
            default: return '/login';
        }
    };

    return (
        <ErrorBoundary>
            {/* Offline Banner */}
            {!isOnline && (
                <div className="offline-banner">
                    ⚠️ Working Offline - Changes will sync when connection is restored
                </div>
            )}

            {/* Idle Warning Modal */}
            {showIdleWarning && (
                <IdleWarningModal onDismiss={dismissIdleWarning} />
            )}

            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />

                {/* Home redirect */}
                <Route path="/" element={<Navigate to={getHomeRedirect()} replace />} />

                {/* Profile Route - Accessible to all authenticated users */}
                <Route path="/profile" element={
                    <ProtectedRoute>
                        <ProfilePage />
                    </ProtectedRoute>
                } />

                {/* Admin Routes */}
                <Route path="/admin" element={
                    <ProtectedRoute roles={['ADMIN']}>
                        <Layout />
                    </ProtectedRoute>
                }>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="bulk-upload" element={<BulkUpload />} />
                </Route>

                {/* Supervisor Routes */}
                <Route path="/supervisor" element={
                    <ProtectedRoute roles={['SUPERVISOR']}>
                        <Layout />
                    </ProtectedRoute>
                }>
                    <Route path="dashboard" element={<SupervisorDashboard />} />
                    <Route path="verify" element={<VerifySurveys />} />
                </Route>

                {/* Surveyor Routes */}
                <Route path="/surveyor" element={
                    <ProtectedRoute roles={['SURVEYOR']}>
                        <Layout />
                    </ProtectedRoute>
                }>
                    <Route path="dashboard" element={<SurveyorDashboard />} />
                    <Route path="survey/new" element={<SurveyForm />} />
                    <Route path="survey/:id" element={<SurveyForm />} />
                    <Route path="history" element={<SurveyHistory />} />
                </Route>

                {/* Error Pages */}
                <Route path="/error" element={<ServerErrorPage />} />
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </ErrorBoundary>
    );
}

export default App;
