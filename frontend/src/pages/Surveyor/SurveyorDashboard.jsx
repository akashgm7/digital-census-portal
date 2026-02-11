/**
 * Surveyor Dashboard with daily progress and recent surveys.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsAPI } from '../../services/api';

function SurveyorDashboard() {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchDashboardData();
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

    if (loading) return <div className="loading-container"><div className="spinner"></div></div>;
    if (error) return <div className="alert alert-error">{error}</div>;

    const progressPercentage = data?.today?.percentage || 0;

    return (
        <div>
            <h2>Welcome, {data?.user?.name || user?.fullName}</h2>
            <p className="text-muted" style={{ marginBottom: '24px' }}>
                Zone: {data?.user?.zone || user?.zoneName}
            </p>

            {/* Daily Progress & Alerts */}
            <div className="grid grid-2" style={{ marginBottom: '24px' }}>
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
                            to="/surveyor/survey/new"
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

                <div className="card">
                    <h3 className="card-title">Alerts</h3>
                    <div className="alert alert-warning" style={{ marginBottom: '16px' }}>
                        <strong>{data?.stats?.location_warnings || 0}</strong> surveys with location warnings
                    </div>
                    <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                        <strong>{data?.stats?.new_houses || 0}</strong> new/unknown houses found
                    </div>
                    <div className="alert alert-info" style={{ marginBottom: '16px' }}>
                        <strong>{data?.stats?.drafts || 0}</strong> surveys in draft
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-5" style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div className="stat-card">
                    <div className="stat-value">{data?.stats?.total || 0}</div>
                    <div className="stat-label">Total Surveys</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-error)' }}>
                        {data?.stats?.flagged || 0}
                    </div>
                    <div className="stat-label">Flagged</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-success)' }}>
                        {data?.stats?.verified || 0}
                    </div>
                    <div className="stat-label">Verified</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-info)' }}>
                        {data?.stats?.drafts || 0}
                    </div>
                    <div className="stat-label">Drafts</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: '#e74c3c' }}>
                        {data?.stats?.new_houses || 0}
                    </div>
                    <div className="stat-label">New Houses</div>
                </div>
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
                                    <th>Status</th>
                                    <th>Submitted</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(data?.recent_surveys || []).map(survey => (
                                    <tr key={survey.id}>
                                        <td>{survey.head_name}</td>
                                        <td>
                                            <span className={`badge ${survey.status === 'VERIFIED' ? 'badge-verified' : 'badge-submitted'}`}>
                                                {survey.status}
                                            </span>
                                        </td>
                                        <td>{survey.submitted_at ? new Date(survey.submitted_at).toLocaleDateString() : '-'}</td>
                                        <td>
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
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default SurveyorDashboard;
