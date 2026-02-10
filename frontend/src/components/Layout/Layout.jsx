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
                    { to: '/admin/dashboard', label: 'Dashboard' },
                    { to: '/admin/users', label: 'User Management' },
                    { to: '/admin/bulk-upload', label: 'Bulk Upload' },
                ];
            case 'SUPERVISOR':
                return [
                    { to: '/supervisor/dashboard', label: 'Dashboard' },
                    { to: '/supervisor/verify', label: 'Verify Surveys' },
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
            <header className="header">
                <h1 className="header-title">Digital Census Portal</h1>
                <div className="header-info">
                    <span className="header-role">{user?.role}</span>
                    {user?.zoneName && (
                        <span className="header-zone">{user.zoneName}</span>
                    )}
                    <NavLink to="/profile" className="header-profile-link" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>
                        {user?.fullName}
                    </NavLink>
                    <button className="btn btn-secondary" onClick={handleLogout} style={{
                        padding: '8px 16px',
                        minHeight: 'auto',
                        minWidth: 'auto',
                        color: 'white',
                        borderColor: 'white'
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
                            >
                                {link.label}
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
        </div>
    );
}

export default Layout;
