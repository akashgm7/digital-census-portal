/**
 * Supervisor Dashboard - Zone-restricted view.
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsAPI } from '../../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function SupervisorDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [timeframe, setTimeframe] = useState('today');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchDashboardData();

        const interval = setInterval(() => {
            fetchDashboardData(true);
        }, 30000);

        return () => clearInterval(interval);
    }, [timeframe]); // Refetch when timeframe changes

    const fetchDashboardData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const response = await analyticsAPI.getSupervisorDashboard({ timeframe });
            setData(response.data);
        } catch (err) {
            console.error("Failed to load supervisor dashboard", err);
            const msg = err.response
                ? `Status: ${err.response.status}, Data: ${JSON.stringify(err.response.data)}`
                : err.message;
            if (!silent) setError('Failed to load dashboard data: ' + msg);
        }
        if (!silent) setLoading(false);
    };

    // Filter surveyors locally
    const filteredSurveyors = (data?.surveyors || []).filter(s =>
        s.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div className="loading-container"><div className="spinner"></div></div>;
    if (error) return <div className="alert alert-error">{error}</div>;

    return (
        <div className="dashboard-container">
            {/* Header with Timeframe Tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2>Supervisor Dashboard</h2>
                    <p className="text-muted" style={{ margin: 0 }}>
                        Zone: <strong>{data?.zone?.name}</strong> ({data?.zone?.code})
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', padding: '4px', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
                    {['today', 'week', 'month'].map(tf => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            style={{
                                padding: '6px 16px',
                                border: 'none',
                                borderRadius: '6px',
                                textTransform: 'capitalize',
                                cursor: 'pointer',
                                fontWeight: '500',
                                fontSize: '14px',
                                transition: 'all 0.2s',
                                backgroundColor: timeframe === tf ? 'var(--color-primary)' : 'transparent',
                                color: timeframe === tf ? 'white' : 'var(--color-text-muted)',
                                boxShadow: timeframe === tf ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                            }}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
            </div>

            {/* Zone Action Items (Notifications) */}
            <div style={{ marginBottom: '24px' }}>
                <div className="card">
                    <h3 className="card-title">Zone Action Items</h3>
                    <div className="grid grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                        {/* Location Warnings */}
                        {(data?.overview?.location_warnings > 0) && (
                            <Link to="/supervisor/verify?filter=warning" style={{ textDecoration: 'none' }}>
                                <div className="alert alert-warning" style={{ height: '100%', display: 'flex', alignItems: 'center', marginBottom: 0, cursor: 'pointer' }}>
                                    <span style={{ fontSize: '24px', marginRight: '16px' }}>⚠️</span>
                                    <div>
                                        <strong>{data?.overview?.location_warnings}</strong> surveys with location warnings
                                    </div>
                                </div>
                            </Link>
                        )}

                        {/* New Houses */}
                        {(data?.overview?.new_houses > 0) && (
                            <Link to="/supervisor/verify?filter=new" style={{ textDecoration: 'none' }}>
                                <div className="alert alert-error" style={{ height: '100%', display: 'flex', alignItems: 'center', marginBottom: 0, cursor: 'pointer' }}>
                                    <span style={{ fontSize: '24px', marginRight: '16px' }}>🏠</span>
                                    <div>
                                        <strong>{data?.overview?.new_houses}</strong> new/unknown houses found
                                    </div>
                                </div>
                            </Link>
                        )}

                        {/* Pending Verification (High Priority) */}
                        {(data?.overview?.pending_verification > 0) && (
                            <Link to="/supervisor/verify" style={{ textDecoration: 'none' }}>
                                <div className="alert alert-info" style={{ height: '100%', display: 'flex', alignItems: 'center', marginBottom: 0, cursor: 'pointer', backgroundColor: '#e3f2fd', color: '#0c5460', borderColor: '#bee5eb' }}>
                                    <span style={{ fontSize: '24px', marginRight: '16px' }}>📝</span>
                                    <div>
                                        <strong>{data?.overview?.pending_verification}</strong> surveys pending verification
                                    </div>
                                </div>
                            </Link>
                        )}

                        {(data?.overview?.location_warnings === 0 && data?.overview?.new_houses === 0 && data?.overview?.pending_verification === 0) && (
                            <div className="alert alert-success" style={{ width: '100%', marginBottom: 0 }}>
                                ✅ All caught up! No pending alerts for your zone.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-5" style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <Link to="/supervisor/surveys" className="stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="stat-value">{data?.overview?.total || 0}</div>
                    <div className="stat-label">Total Surveys</div>
                </Link>
                <Link to="/supervisor/verify" className="stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="stat-value" style={{ color: 'var(--color-warning)' }}>
                        {data?.overview?.pending_verification || 0}
                    </div>
                    <div className="stat-label">Pending Verification</div>
                </Link>
                <Link to="/supervisor/surveys?status=VERIFIED" className="stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="stat-value" style={{ color: 'var(--color-success)' }}>
                        {data?.overview?.verified || 0}
                    </div>
                    <div className="stat-label">Verified</div>
                </Link>
                <Link to="/supervisor/verify?filter=warning" className="stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="stat-value" style={{ color: 'var(--color-error)' }}>
                        {data?.overview?.location_warnings || 0}
                    </div>
                    <div className="stat-label">Location Warnings</div>
                </Link>
                <Link to="/supervisor/verify?filter=new" className="stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="stat-value" style={{ color: '#e74c3c' }}>
                        {data?.overview?.new_houses || 0}
                    </div>
                    <div className="stat-label">New Houses</div>
                </Link>
            </div>

            {/* Velocity Graph */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <h3 className="card-title">
                    Daily Submissions ({timeframe === 'today' ? "Today" : timeframe === 'week' ? "Last 7 Days" : "Last 30 Days"})
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={data?.velocity || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { weekday: 'short' })} />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="submitted" stroke="var(--color-primary)" strokeWidth={2} name="Submitted" />
                        <Line type="monotone" dataKey="verified" stroke="var(--color-success)" strokeWidth={2} name="Verified" />
                        <Line type="monotone" dataKey="flagged" stroke="var(--color-error)" strokeWidth={2} name="Flagged" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-2" style={{ marginBottom: '24px' }}>
                {/* Surveyors in Zone */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 className="card-title" style={{ margin: 0 }}>Surveyors in Zone</h3>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="Search surveyor..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    padding: '6px 12px',
                                    paddingLeft: '32px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--color-border)',
                                    fontSize: '14px',
                                    width: '180px'
                                }}
                            />
                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                        </div>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Daily Target</th>
                                    <th>Done</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSurveyors.slice(0, 5).map(s => (
                                    <tr
                                        key={s.id}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => navigate(`/supervisor/surveys?surveyor=${s.id}`)}
                                        className="hover-row"
                                    >
                                        <td>
                                            <span style={{ fontWeight: '500', color: 'var(--color-primary)' }}>
                                                {s.full_name}
                                            </span>
                                        </td>
                                        <td>{s.daily_target}</td>
                                        <td>{s.survey_count}</td>
                                    </tr>
                                ))}
                                {filteredSurveyors.length === 0 && (
                                    <tr>
                                        <td colSpan="3" style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
                                            No surveyors found matching "{searchQuery}"
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {filteredSurveyors.length > 5 && (
                        <div style={{ textAlign: 'center', marginTop: '12px' }}>
                            <small className="text-muted">Showing top 5 of {filteredSurveyors.length}</small>
                        </div>
                    )}
                </div>

                {/* Leaderboard */}
                <div className="card">
                    <h3 className="card-title">
                        Zone Leaderboard ({timeframe === 'today' ? "Today" : timeframe === 'week' ? "This Week" : "This Month"})
                    </h3>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Surveyor</th>
                                    <th>Progress</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(data?.leaderboard || []).slice(0, 5).map((entry, index) => (
                                    <tr
                                        key={index}
                                        style={{ cursor: entry.surveyor_id ? 'pointer' : 'default' }}
                                        onClick={() => entry.surveyor_id && navigate(`/supervisor/surveys?surveyor=${entry.surveyor_id}`)}
                                        className="hover-row"
                                    >
                                        <td>{index + 1}</td>
                                        <td>{entry.surveyor_name}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div className="progress-container" style={{ width: '60px', marginBottom: 0 }}>
                                                    <div
                                                        className={`progress-bar ${entry.percentage >= 100 ? 'complete' : ''}`}
                                                        style={{ width: `${Math.min(entry.percentage, 100)}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-sm">{entry.completed}/{entry.target}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SupervisorDashboard;
