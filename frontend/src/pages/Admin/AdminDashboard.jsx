/**
 * Admin Dashboard with full system visibility.
 */
import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

function AdminDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const response = await analyticsAPI.getAdminDashboard();
            setData(response.data);
        } catch (err) {
            setError('Failed to load dashboard data.');
            console.error(err);
        }
        setLoading(false);
    };

    if (loading) {
        return <div className="loading-container"><div className="spinner"></div></div>;
    }

    if (error) {
        return <div className="alert alert-error">{error}</div>;
    }

    return (
        <div>
            <h2>Admin Dashboard</h2>

            {/* Overview Cards */}
            <div className="grid grid-4" style={{ marginBottom: '24px' }}>
                <div className="stat-card">
                    <div className="stat-value">{data?.overview?.total_surveys || 0}</div>
                    <div className="stat-label">Total Surveys</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-warning)' }}>
                        {data?.overview?.submitted || 0}
                    </div>
                    <div className="stat-label">Submitted</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-success)' }}>
                        {data?.overview?.verified || 0}
                    </div>
                    <div className="stat-label">Verified</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-error)' }}>
                        {data?.overview?.flagged || 0}
                    </div>
                    <div className="stat-label">Flagged</div>
                </div>
            </div>

            {/* User Statistics */}
            <div className="grid grid-2" style={{ marginBottom: '24px' }}>
                <div className="card">
                    <h3 className="card-title">User Statistics</h3>
                    <div className="grid grid-2">
                        <div>
                            <p><strong>Total Users:</strong> {data?.users?.total || 0}</p>
                            <p><strong>Active:</strong> {data?.users?.active || 0}</p>
                        </div>
                        <div>
                            <p><strong>Admins:</strong> {data?.users?.admins || 0}</p>
                            <p><strong>Supervisors:</strong> {data?.users?.supervisors || 0}</p>
                            <p><strong>Surveyors:</strong> {data?.users?.surveyors || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h3 className="card-title">Alerts</h3>
                    <div className="alert alert-warning" style={{ marginBottom: '8px' }}>
                        {data?.overview?.location_warnings || 0} surveys with location warnings
                    </div>
                    <div className="alert alert-info">
                        {data?.overview?.drafts || 0} surveys in draft
                    </div>
                </div>
            </div>

            {/* Velocity Graph */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <h3 className="card-title">Daily Submissions (Last 7 Days)</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data?.velocity || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line
                            type="monotone"
                            dataKey="count"
                            stroke="var(--color-primary)"
                            strokeWidth={2}
                            dot={{ fill: 'var(--color-primary)' }}
                        />
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
                                <th>Zone</th>
                                <th>Code</th>
                                <th>Surveyors</th>
                                <th>Total Surveys</th>
                                <th>Verified</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data?.zones || []).map(zone => (
                                <tr key={zone.id}>
                                    <td>{zone.name}</td>
                                    <td>{zone.code}</td>
                                    <td>{zone.surveyor_count}</td>
                                    <td>{zone.survey_count}</td>
                                    <td>{zone.verified_count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Leaderboard */}
            <div className="card">
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
            </div>
        </div>
    );
}

export default AdminDashboard;
