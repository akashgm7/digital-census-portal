/**
 * Admin Dashboard with full system visibility.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { analyticsAPI } from '../../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function AdminDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [velocityDays, setVelocityDays] = useState(7);
    const [graphStatus, setGraphStatus] = useState('all');
    const [lastUpdated, setLastUpdated] = useState(new Date());

    useEffect(() => {
        fetchDashboardData();

        // Lively data: Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            fetchDashboardData(true); // silent refresh
        }, 30000);

        return () => clearInterval(interval);
    }, [velocityDays]);

    const fetchDashboardData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const response = await analyticsAPI.getAdminDashboard({ days: velocityDays });
            setData(response.data);
            setLastUpdated(new Date());
        } catch (err) {
            console.error(err);
            if (!silent) {
                const msg = err.response
                    ? `Status: ${err.response.status}, Data: ${JSON.stringify(err.response.data)}`
                    : err.message;
                setError('Failed to load dashboard data: ' + msg);
            }
        }
        if (!silent) setLoading(false);
    };

    const handleRefresh = () => {
        fetchDashboardData();
    };



    if (loading) {
        return <div className="loading-container"><div className="spinner"></div></div>;
    }

    if (error) {
        return <div className="alert alert-error">{error}</div>;
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2>Admin Dashboard</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="text-muted" style={{ fontSize: '0.9rem' }}>
                        Last updated: {lastUpdated.toLocaleTimeString()}
                    </span>
                    <button className="btn btn-secondary btn-sm" onClick={handleRefresh}>
                        Refresh
                    </button>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-5" style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <Link to="/admin/surveys" className="stat-card" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer', transition: 'transform 0.2s' }}>
                    <div className="stat-value">{data?.overview?.total_surveys || 0}</div>
                    <div className="stat-label">Total Surveys</div>
                </Link>
                <Link to="/admin/surveys?status=SUBMITTED" className="stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="stat-value" style={{ color: 'var(--color-warning)' }}>
                        {data?.overview?.submitted || 0}
                    </div>
                    <div className="stat-label">Submitted</div>
                </Link>
                <Link to="/admin/surveys?status=VERIFIED" className="stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="stat-value" style={{ color: 'var(--color-success)' }}>
                        {data?.overview?.verified || 0}
                    </div>
                    <div className="stat-label">Verified</div>
                </Link>
                <Link to="/admin/surveys?status=FLAGGED" className="stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="stat-value" style={{ color: 'var(--color-error)' }}>
                        {data?.overview?.flagged || 0}
                    </div>
                    <div className="stat-label">Flagged</div>
                </Link>
                <Link to="/admin/addresses?status=new" className="stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="stat-value" style={{ color: '#e74c3c' }}>
                        {data?.overview?.new_houses || 0}
                    </div>
                    <div className="stat-label">New Houses</div>
                </Link>
            </div>

            {/* User Statistics */}
            <div className="grid grid-2" style={{ marginBottom: '24px' }}>
                <div className="card">
                    <h3 className="card-title">User Statistics</h3>
                    <div className="grid grid-2">
                        <div>
                            <p></p>
                            <p><strong>Total Users:</strong> {data?.users?.total || 0}</p>
                            <p><strong>Active:</strong> {data?.users?.active || 0}</p>
                        </div>
                        <div>
                            <p></p>
                            <p><strong>Admins:</strong> {data?.users?.admins || 0}</p>
                            <p><strong>Supervisors:</strong> {data?.users?.supervisors || 0}</p>
                            <p><strong>Surveyors:</strong> {data?.users?.surveyors || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="card">

                    <div className="alert alert-error" style={{ marginBottom: '8px' }}>
                        <strong>{data?.overview?.new_houses || 0}</strong> new/unknown houses found
                    </div>
                    <div className="alert alert-warning" style={{ marginBottom: '8px' }}>
                        <strong>{data?.overview?.location_warnings || 0}</strong> surveys with location warnings
                    </div>
                    <div className="alert alert-info">
                        <strong>{data?.overview?.drafts || 0}</strong> surveys in draft
                    </div>
                </div>
            </div>

            {/* Velocity Graph */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 className="card-title" style={{ margin: 0 }}>Status Velocity</h3>
                    <div className="btn-group" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                            <button
                                className={`btn btn-sm ${graphStatus === 'all' ? 'btn-primary' : ''}`}
                                style={{ borderRadius: 0, backgroundColor: graphStatus === 'all' ? 'var(--color-primary)' : 'white', color: graphStatus === 'all' ? 'white' : 'var(--color-text)' }}
                                onClick={() => setGraphStatus('all')}
                            >
                                All
                            </button>
                            <button
                                className={`btn btn-sm ${graphStatus === 'submitted' ? 'btn-primary' : ''}`}
                                style={{ borderRadius: 0, backgroundColor: graphStatus === 'submitted' ? '#f39c12' : 'white', color: graphStatus === 'submitted' ? 'white' : 'var(--color-text)' }}
                                onClick={() => setGraphStatus('submitted')}
                            >
                                Submitted
                            </button>
                            <button
                                className={`btn btn-sm ${graphStatus === 'verified' ? 'btn-primary' : ''}`}
                                style={{ borderRadius: 0, backgroundColor: graphStatus === 'verified' ? 'var(--color-success)' : 'white', color: graphStatus === 'verified' ? 'white' : 'var(--color-text)' }}
                                onClick={() => setGraphStatus('verified')}
                            >
                                Verified
                            </button>
                            <button
                                className={`btn btn-sm ${graphStatus === 'flagged' ? 'btn-primary' : ''}`}
                                style={{ borderRadius: 0, backgroundColor: graphStatus === 'flagged' ? 'var(--color-error)' : 'white', color: graphStatus === 'flagged' ? 'white' : 'var(--color-text)' }}
                                onClick={() => setGraphStatus('flagged')}
                            >
                                Flagged
                            </button>
                        </div>
                        <div style={{ width: '1px', backgroundColor: '#e2e8f0', margin: '0 8px' }}></div>
                        <div className="btn-group">
                            <button
                                className={`btn btn-sm ${velocityDays === 7 ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setVelocityDays(7)}
                            >
                                Last 7 Days
                            </button>
                            <button
                                className={`btn btn-sm ${velocityDays === 30 ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setVelocityDays(30)}
                            >
                                Last 30 Days
                            </button>
                        </div>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data?.velocity || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12 }}
                            tickFormatter={(str) => {
                                const date = new Date(str);
                                return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                            }}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                        />
                        {(graphStatus === 'all' || graphStatus === 'submitted') && (
                            <Line
                                type="monotone"
                                dataKey="submitted"
                                name="Submitted"
                                stroke="#f39c12"
                                strokeWidth={2}
                                dot={{ fill: '#f39c12', r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        )}
                        {(graphStatus === 'all' || graphStatus === 'verified') && (
                            <Line
                                type="monotone"
                                dataKey="verified"
                                name="Verified"
                                stroke="var(--color-success)"
                                strokeWidth={2}
                                dot={{ fill: 'var(--color-success)', r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        )}
                        {(graphStatus === 'all' || graphStatus === 'flagged') && (
                            <Line
                                type="monotone"
                                dataKey="flagged"
                                name="Flagged"
                                stroke="var(--color-error)"
                                strokeWidth={2}
                                dot={{ fill: 'var(--color-error)', r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        )}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Zone Comparison */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <h3 className="card-title">Zone Comparison</h3>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left' }}>Zone</th>
                                <th style={{ textAlign: 'left' }}>Code</th>
                                <th style={{ textAlign: 'center' }}>Surveyors</th>
                                <th style={{ textAlign: 'center' }}>Total Surveys</th>
                                <th style={{ textAlign: 'center' }}>Verified</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data?.zones || []).map(zone => (
                                <tr key={zone.id}>
                                    <td style={{ textAlign: 'left' }}>{zone.name}</td>
                                    <td style={{ textAlign: 'left' }}>{zone.code}</td>
                                    <td style={{ textAlign: 'center' }}>{zone.surveyor_count}</td>
                                    <td style={{ textAlign: 'center' }}>{zone.survey_count}</td>
                                    <td style={{ textAlign: 'center' }}>{zone.verified_count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Leaderboard */}
            {/* <div className="card">
                <h3 className="card-title">Today's Leaderboard</h3>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Surveyor</th>
                                <th>Zone</th>
                                <th>Completed</th>
                                <th>Target</th>
                                <th>Progress</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data?.leaderboard || []).map((entry, index) => (
                                <tr key={entry.surveyor_id}>
                                    <td>{index + 1}</td>
                                    <td>{entry.surveyor_name}</td>
                                    <td>{entry.zone_name}</td>
                                    <td>{entry.completed}</td>
                                    <td>{entry.target}</td>
                                    <td>
                                        <div className="progress-container" style={{ width: '100px' }}>
                                            <div
                                                className={`progress-bar ${entry.percentage >= 100 ? 'complete' : ''}`}
                                                style={{ width: `${Math.min(entry.percentage, 100)}%` }}
                                            ></div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div> */}
        </div>
    );
}

export default AdminDashboard;
