/**
 * Layout component with header, navigation, and main content area.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsAPI } from '../../services/api';

function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState(null);
    const [showAlerts, setShowAlerts] = useState(false);
    const [lastReadCount, setLastReadCount] = useState(0);
    const alertRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (alertRef.current && !alertRef.current.contains(event.target)) {
                setShowAlerts(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [alertRef]);

    useEffect(() => {
        if (user?.role === 'SURVEYOR' || user?.role === 'SUPERVISOR' || user?.role === 'ADMIN') {
            fetchAlerts();
            // Load last read count from local storage
            const stored = localStorage.getItem(`lastReadAlertCount_${user.role}`);
            if (stored) setLastReadCount(parseInt(stored, 10));
        }
    }, [user]);

    const fetchAlerts = async () => {
        try {
            if (user?.role === 'SURVEYOR') {
                const res = await analyticsAPI.getSurveyorDashboard();
                setAlerts(res.data.stats);
            } else if (user?.role === 'SUPERVISOR') {
                const res = await analyticsAPI.getSupervisorDashboard();
                setAlerts(res.data.overview);
            } else if (user?.role === 'ADMIN') {
                const res = await analyticsAPI.getAdminDashboard();
                setAlerts(res.data.overview);
            }
        } catch (e) {
            console.error("Failed to fetch alerts", e);
        }
    };

    const getTotalAlerts = () => {
        if (!alerts) return 0;
        let total = (alerts.location_warnings || 0) + (alerts.new_houses || 0);
        if (user?.role === 'SURVEYOR') {
            total += (alerts.drafts || 0);
        } else if (user?.role === 'SUPERVISOR') {
            total += (alerts.pending_verification || 0);
        } else if (user?.role === 'ADMIN') {
            total += (alerts.flagged || 0);
        }
        return total;
    };

    const getUnreadCount = () => {
        const total = getTotalAlerts();
        return Math.max(0, total - lastReadCount);
    };

    const handleMarkAsRead = () => {
        const total = getTotalAlerts();
        setLastReadCount(total);
        localStorage.setItem(`lastReadAlertCount_${user.role}`, total.toString());
        setShowAlerts(false);
    };

    const handleClear = () => {
        // "Clear" implies temporarily dismissing the list view or assuming all are handled
        // For this implementation, we will treat it as "Mark as Read" and close, 
        // OR we could hide the items if that's what user wants.
        // Given 'Mark as read' and 'Clear' are requested:
        // Mark as Read -> Remove Badge, keep list.
        // Clear -> Remove Badge AND Hide list items?
        // Let's make "Clear" hide the list items until refresh or new data.
        setAlerts(null); // Clear local state
        handleMarkAsRead(); // Also mark as read
    };

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

                    {/* Alerts for Admin, Surveyor, and Supervisor */}
                    {(user?.role === 'SURVEYOR' || user?.role === 'SUPERVISOR' || user?.role === 'ADMIN') && (
                        <div className="notification-container" ref={alertRef} style={{ position: 'relative' }}>
                            <button
                                className="btn-icon"
                                onClick={() => setShowAlerts(!showAlerts)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    padding: '8px',
                                    fontSize: '1.2rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                aria-label="Alerts"
                            >
                                🔔
                                {getUnreadCount() > 0 && (
                                    <span className="notification-badge" style={{
                                        position: 'absolute',
                                        top: '0',
                                        right: '0',
                                        background: 'var(--color-error)',
                                        color: 'white',
                                        borderRadius: '50%',
                                        width: '18px',
                                        height: '18px',
                                        fontSize: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '2px solid white',
                                        fontWeight: 'bold'
                                    }}>
                                        {getUnreadCount()}
                                    </span>
                                )}
                            </button>

                            {showAlerts && (
                                <div className="notification-dropdown" style={{
                                    position: 'absolute',
                                    top: '120%',
                                    right: '-50px',
                                    width: '320px',
                                    background: 'white',
                                    borderRadius: 'var(--border-radius)',
                                    boxShadow: 'var(--shadow-lg)',
                                    border: '1px solid var(--color-border)',
                                    padding: '16px',
                                    zIndex: 1000
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
                                        <h4 style={{ margin: 0, fontSize: '1rem' }}>Alerts</h4>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={handleMarkAsRead}
                                                style={{ border: 'none', background: 'none', color: 'var(--color-primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                                            >
                                                Mark Read
                                            </button>
                                            <button
                                                onClick={handleClear}
                                                style={{ border: 'none', background: 'none', color: 'var(--color-text-secondary)', fontSize: '0.75rem', cursor: 'pointer' }}
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </div>

                                    {getTotalAlerts() === 0 ? (
                                        <p className="text-muted" style={{ fontSize: '0.9rem', textAlign: 'center' }}>No new alerts</p>
                                    ) : (
                                        <>
                                            {alerts?.location_warnings > 0 && (
                                                <div className="alert-item" style={{ marginBottom: '8px', padding: '10px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                                                    <div style={{ fontWeight: 'bold', color: '#92400e', fontSize: '0.85rem' }}>GPS Location Warnings</div>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#b45309' }}>{alerts.location_warnings}</div>
                                                </div>
                                            )}
                                            {alerts?.new_houses > 0 && (
                                                <div className="alert-item" style={{ marginBottom: '8px', padding: '10px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fca5a5' }}>
                                                    <div style={{ fontWeight: 'bold', color: '#991b1b', fontSize: '0.85rem' }}>New Houses Found</div>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#b91c1c' }}>{alerts.new_houses}</div>
                                                </div>
                                            )}
                                            {alerts?.drafts > 0 && user?.role === 'SURVEYOR' && (
                                                <div className="alert-item" style={{ marginBottom: '0', padding: '10px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #93c5fd' }}>
                                                    <div style={{ fontWeight: 'bold', color: '#1e40af', fontSize: '0.85rem' }}>Drafts Pending</div>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2563eb' }}>{alerts.drafts}</div>
                                                </div>
                                            )}
                                            {alerts?.pending_verification > 0 && user?.role === 'SUPERVISOR' && (
                                                <div className="alert-item" style={{ marginBottom: '0', padding: '10px', background: '#e3f2fd', borderRadius: '8px', border: '1px solid #90caf9' }}>
                                                    <div style={{ fontWeight: 'bold', color: '#0d47a1', fontSize: '0.85rem' }}>Pending Verification</div>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1565c0' }}>{alerts.pending_verification}</div>
                                                </div>
                                            )}
                                            {alerts?.flagged > 0 && user?.role === 'ADMIN' && (
                                                <div className="alert-item" style={{ marginBottom: '0', padding: '10px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #ef4444' }}>
                                                    <div style={{ fontWeight: 'bold', color: '#b91c1c', fontSize: '0.85rem' }}>Flagged Surveys</div>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#dc2626' }}>{alerts.flagged}</div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
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
