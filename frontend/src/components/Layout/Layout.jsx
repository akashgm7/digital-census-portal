/**
 * Layout component with header, navigation, and main content area.
 */
import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const getNavLinks = () => {
        switch (user?.role) {
            case 'ADMIN':
                return [
                    { to: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
                    { to: '/admin/analytics', label: 'Analytics', icon: '📈' },
                    { to: '/admin/surveys', label: 'Surveys', icon: '📋' },
                    { to: '/admin/users', label: 'User Management', icon: '👥' },
                    { to: '/admin/addresses', label: 'Addresses' },
                    { to: '/admin/bulk-upload', label: 'Bulk Upload' },
                ];
            case 'SUPERVISOR':
                return [
                    { to: '/supervisor/dashboard', label: 'Dashboard', icon: '📊' },
                    { to: '/supervisor/surveys', label: 'Surveys', icon: '📋' },
                    { to: '/supervisor/verify', label: 'Verify Surveys', icon: '✅' },
                ];
            case 'SURVEYOR':
                return [
                    { to: '/surveyor/dashboard', label: 'Dashboard' },
                    { to: '/surveyor/survey/new', label: 'New Survey' },
                    { to: '/surveyor/history', label: 'History' },
                ];
            default:
                return [];
        }
    };

    return (
        <div className="page">
            {/* Header */}
            <header className="header glass">
                <div className="header-left">
                    <h1 className="header-title">Digital Census</h1>
                </div>

                <div className="header-info">
                    {user?.zoneName && (
                        <span className="header-zone">{user.zoneName}</span>
                    )}

                    <NavLink
                        to="/profile"
                        className="header-profile-link"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'var(--gradient-primary)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: 'bold'
                        }}>
                            {user?.fullName?.charAt(0)}
                        </div>
                        <span>{user?.fullName}</span>
                    </NavLink>

                    <button className="btn btn-secondary" onClick={handleLogout} style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.75rem',
                        border: '1px solid var(--color-border)'
                    }}>
                        Logout
                    </button>
                </div>
            </header>

            {/* Navigation */}
            <nav className="nav">
                <ul className="nav-list">
                    {getNavLinks().map(link => (
                        <li key={link.to}>
                            <NavLink
                                to={link.to}
                                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                {link.icon && <span>{link.icon}</span>}
                                <span>{link.label}</span>
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Main Content */}
            <main className="main-content">
                <div className="container">
                    <Outlet />
                </div>
            </main>
        </div >
    );
}

export default Layout;
