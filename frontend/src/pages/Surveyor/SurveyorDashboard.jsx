import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsAPI, surveyAPI, notificationAPI } from '../../services/api';
import ConfirmationModal from '../../components/ConfirmationModal';
import MessageModal from '../../components/MessageModal';

function SurveyorDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Notification State
    const [notifications, setNotifications] = useState([]);
    const [notifLoading, setNotifLoading] = useState(true);

    // Modal states
    const [deleteId, setDeleteId] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [messageModal, setMessageModal] = useState({ show: false, title: '', message: '', type: 'info' });

    useEffect(() => {
        fetchDashboardData();
        fetchNotifications();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const response = await analyticsAPI.getSurveyorDashboard();
            setData(response.data);
        } catch (err) {
            setError('Failed to load dashboard data.');
        }
        setLoading(false);
    };

    const fetchNotifications = async () => {
        try {
            const response = await notificationAPI.list();
            setNotifications(response.data || []);
        } catch (err) {
            console.error('Failed to load notifications:', err);
        }
        setNotifLoading(false);
    };

    const handleMarkAsRead = async (id) => {
        try {
            await notificationAPI.markRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (err) {
            console.error('Failed to mark read:', err);
        }
    };

    const handleDeleteClick = (id) => {
        setDeleteId(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;

        try {
            await surveyAPI.delete(deleteId);
            // Refresh data or remove from state
            setData(prev => ({
                ...prev,
                recent_surveys: prev.recent_surveys.filter(s => s.id !== deleteId),
                stats: {
                    ...prev.stats,
                    total: prev.stats.total - 1, // Approximate update
                    // We might need to fetch fresh data to be accurate with counts, but this is immediate feedback
                }
            }));
            fetchDashboardData();
            setMessageModal({ show: true, title: 'Success', message: 'Survey deleted successfully.', type: 'success' });
        } catch (err) {
            console.error(err);
            setMessageModal({ show: true, title: 'Error', message: 'Failed to delete survey.', type: 'error' });
        } finally {
            setShowDeleteModal(false);
            setDeleteId(null);
        }
    };

    if (loading) return <div className="loading-container"><div className="spinner"></div></div>;
    if (error) return <div className="alert alert-error">{error}</div>;

    const progressPercentage = data?.today?.percentage || 0;

    return (
        <div>
            <h2>Welcome, {data?.user?.name || user?.fullName}</h2>
            <p className="text-muted" style={{ marginBottom: '24px' }}>
                Zone: {data?.user?.zone || user?.zoneName}
            </p>

            {/* Action Center - Notifications */}
            <div style={{ marginBottom: '24px' }}>
                <div className="card" style={{ borderLeft: '4px solid var(--color-info)', backgroundColor: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 className="card-title" style={{ margin: 0, color: 'var(--color-info)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            🔔 Action Center
                            {notifications.filter(n => !n.isRead).length > 0 && (
                                <span className="badge badge-flagged" style={{ backgroundColor: 'var(--color-error)' }}>
                                    {notifications.filter(n => !n.isRead).length} New
                                </span>
                            )}
                        </h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {notifications.filter(n => !n.isRead).length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '24px', color: '#718096' }}>
                                <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅</div>
                                <p style={{ margin: 0 }}>All caught up! No pending actions.</p>
                            </div>
                        ) : (
                            notifications.filter(n => !n.isRead).map(notif => (
                                <div
                                    key={notif.id}
                                    style={{
                                        padding: '16px',
                                        backgroundColor: 'white',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '12px',
                                        cursor: notif.surveyId ? 'pointer' : 'default',
                                        transition: 'all 0.2s ease'
                                    }}
                                    className="hover-card"
                                    onClick={() => notif.surveyId && navigate(`/surveyor/survey/${notif.surveyId}`)}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <strong style={{ color: '#2d3748' }}>{notif.title}</strong>
                                            <span style={{ fontSize: '11px', color: '#a0aec0' }}>
                                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '14px', color: '#4a5568' }}>{notif.message}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                                        {notif.surveyId && (
                                            <Link
                                                to={`/surveyor/survey/${notif.surveyId}`}
                                                className="btn btn-primary"
                                                style={{ padding: '6px 16px', minHeight: 'auto', fontSize: '12px' }}
                                                onClick={() => handleMarkAsRead(notif.id)}
                                            >
                                                Fix Now
                                            </Link>
                                        )}
                                        <button
                                            className="btn btn-secondary"
                                            style={{ padding: '6px 16px', minHeight: 'auto', fontSize: '12px' }}
                                            onClick={() => handleMarkAsRead(notif.id)}
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Daily Progress & Alerts */}
            <div style={{ marginBottom: '24px' }}>
                <div className="card">
                    <h3 className="card-title">Today's Progress</h3>

                    <div style={{ marginBottom: '16px' }}>
                        <div className="progress-container" style={{ height: '32px' }}>
                            <div
                                className={`progress-bar ${progressPercentage >= 100 ? 'complete' : ''}`}
                                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                            ></div>
                            <span className="progress-text">
                                {data?.today?.completed || 0} / {data?.today?.target || 0} surveys
                            </span>
                        </div>
                    </div>

                    {data?.today?.target_met && (
                        <div className="alert alert-success" style={{ marginBottom: '16px' }}>
                            🎉 Congratulations! You've met your daily target!
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
                        <Link
                            to="/surveyor/survey/new?fresh=true"
                            className="btn btn-primary"
                            style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                        >
                            + New Survey
                        </Link>
                        <Link
                            to="/surveyor/history"
                            className="btn btn-secondary"
                            style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                        >
                            View History
                        </Link>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-5" style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <Link to="/surveyor/history?filter=all" className="stat-card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                    <div className="stat-value">{data?.stats?.total || 0}</div>
                    <div className="stat-label">Total Surveys</div>
                </Link>
                <Link to="/surveyor/history?filter=flagged" className="stat-card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                    <div className="stat-value" style={{ color: 'var(--color-error)' }}>
                        {data?.stats?.flagged || 0}
                    </div>
                    <div className="stat-label">Flagged</div>
                </Link>
                <Link to="/surveyor/history?filter=verified" className="stat-card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                    <div className="stat-value" style={{ color: 'var(--color-success)' }}>
                        {data?.stats?.verified || 0}
                    </div>
                    <div className="stat-label">Verified</div>
                </Link>
                <Link to="/surveyor/history?filter=draft" className="stat-card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                    <div className="stat-value" style={{ color: 'var(--color-info)' }}>
                        {data?.stats?.drafts || 0}
                    </div>
                    <div className="stat-label">Drafts</div>
                </Link>
                <Link to="/surveyor/history?filter=new" className="stat-card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                    <div className="stat-value" style={{ color: '#e74c3c' }}>
                        {data?.stats?.new_houses || 0}
                    </div>
                    <div className="stat-label">New Houses</div>
                </Link>
            </div>

            {/* Recent Surveys */}
            <div className="card">
                <h3 className="card-title">Recent Surveys</h3>
                {(data?.recent_surveys || []).length === 0 ? (
                    <p className="text-muted">No surveys yet. Start your first survey!</p>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Head of Household</th>
                                    <th>Address</th>
                                    <th>Status</th>
                                    <th>Submitted</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(data?.recent_surveys || []).map(survey => (
                                    <tr key={survey.id}>
                                        <td>
                                            <strong>{survey.head_name}</strong>
                                            <br />
                                            <span className="text-muted">{survey.head_phone || '-'}</span>
                                        </td>
                                        <td>
                                            {survey.address_line}
                                            <br />
                                            <span className="text-muted">{survey.pincode}</span>
                                        </td>
                                        <td>
                                            <span className={`badge badge-${survey.status.toLowerCase()}`}>
                                                {survey.status}
                                            </span>
                                            {survey.location_warning && (
                                                <span className="badge badge-flagged" style={{
                                                    marginLeft: '4px',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '2px'
                                                }} title="GPS location mismatch">
                                                    ⚠️ <span style={{ fontSize: '0.8em' }}>GPS</span>
                                                </span>
                                            )}
                                            {survey.is_new_house && (
                                                <span className="badge badge-info" style={{ marginLeft: '4px', backgroundColor: '#17a2b8', color: 'white' }}>
                                                    🏠 New
                                                </span>
                                            )}
                                        </td>
                                        <td>{survey.submitted_at ? new Date(survey.submitted_at).toLocaleDateString() : '-'}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                {survey.editable ? (
                                                    <Link
                                                        to={`/surveyor/survey/${survey.id}`}
                                                        className="btn btn-secondary"
                                                        style={{ padding: '4px 12px', minHeight: 'auto', minWidth: 'auto', fontSize: '12px' }}
                                                    >
                                                        Edit
                                                    </Link>
                                                ) : (
                                                    <span className="badge badge-verified" style={{ background: '#e0e0e0', color: '#666' }}>Locked</span>
                                                )}

                                                {/* Allow delete if editable (or logic from history) */}
                                                {survey.editable && (
                                                    <button
                                                        onClick={() => handleDeleteClick(survey.id)}
                                                        className="btn"
                                                        style={{
                                                            padding: '4px 12px',
                                                            minHeight: 'auto',
                                                            minWidth: 'auto',
                                                            backgroundColor: '#dc3545',
                                                            color: 'white',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            fontSize: '12px'
                                                        }}
                                                        title="Delete Survey"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Custom Modals */}
            <ConfirmationModal
                isOpen={showDeleteModal}
                title="Delete Survey"
                message="Are you sure you want to delete this survey? This action cannot be undone."
                onConfirm={confirmDelete}
                onCancel={() => setShowDeleteModal(false)}
                confirmText="Delete"
                cancelText="Cancel"
                type="error"
            />

            <MessageModal
                isOpen={messageModal.show}
                title={messageModal.title}
                message={messageModal.message}
                type={messageModal.type}
                onClose={() => setMessageModal({ ...messageModal, show: false })}
            />
        </div>
    );
}

export default SurveyorDashboard;
